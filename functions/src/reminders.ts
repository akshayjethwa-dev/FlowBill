// functions/src/reminders.ts
// ─── Reminder Scheduling Engine ───────────────────────────────────────────────
//
// Two scheduled Cloud Functions:
//   1. enqueueDailyReminders  — runs daily at 08:00 AM IST
//      Scans all eligible unpaid invoices and creates reminderJobs documents.
//
//   2. processReminderQueue   — runs every 15 minutes
//      Picks up pending reminderJobs, sends WhatsApp, handles retry/dedup.
//
// Collection: /merchants/{merchantId}/reminderJobs/{jobId}
// Job ID format: `inv_{invoiceId}_stage_{stage}`  ← deduplication key
//
// Retry strategy (transient failures):
//   attempt 1 → wait 1h → attempt 2 → wait 2h → attempt 3 → wait 4h → failed
//
// ─────────────────────────────────────────────────────────────────────────────

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import {
  checkCustomerOptIn,
  sendWhatsappReminder,
  WhatsappSendError,
} from './whatsapp';

// Initialize admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ─── Types ───────────────────────────────────────────────────────────────────

type ReminderStage = 'T-3' | 'T-0' | 'T+2' | 'T+7';

type ReminderJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'skipped'
  | 'failed';

interface ReminderJobData {
  merchantId: string;
  invoiceId: string;
  customerId: string;
  stage: ReminderStage;
  templateKey: string;
  status: ReminderJobStatus;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  nextRetryAt: admin.firestore.Timestamp | admin.firestore.FieldValue | null;
  lastAttemptAt?: admin.firestore.Timestamp | admin.firestore.FieldValue | null;
  whatsappMessageId?: string | null;
  scheduledAt?: admin.firestore.Timestamp | admin.firestore.FieldValue;
  createdAt?: admin.firestore.Timestamp | admin.firestore.FieldValue;
  updatedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue;
}

// ─── Stage → WhatsApp template key mapping ───────────────────────────────────
// Must match the templateKey values approved in your Gupshup account.

const STAGE_TEMPLATE_MAP: Record<ReminderStage, string> = {
  'T-3': 'payment_reminder_due_soon',   // 3 days before due — friendly heads-up
  'T-0': 'payment_reminder_due_today',  // due today — urgent nudge
  'T+2': 'payment_overdue',             // 2 days overdue — first notice
  'T+7': 'payment_overdue',             // 7 days overdue — final notice
};

// ─── Timing rules: day offset → stage ────────────────────────────────────────
// diffDays = today − dueDate (whole days, UTC-normalised)
//   negative → invoice upcoming  (T-3 = diffDays -3)
//   zero     → due today         (T-0 = diffDays  0)
//   positive → overdue           (T+2 = diffDays +2, T+7 = diffDays +7)

const OFFSET_TO_STAGE: Record<number, ReminderStage> = {
  [-3]: 'T-3',
  [0]:  'T-0',
  [2]:  'T+2',
  [7]:  'T+7',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCHEDULER — ENQUEUE DAILY REMINDERS
//
// Runs every morning at 08:00 AM IST.
// Scans ALL active unpaid invoices platform-wide and creates reminderJobs.
// Document ID is deterministic → .create() deduplicates naturally.
// ─────────────────────────────────────────────────────────────────────────────

export const enqueueDailyReminders = onSchedule({
  schedule:       '0 8 * * *',  // Every day at 8:00 AM IST
  timeZone:       'Asia/Kolkata',
  region:         'asia-south1',
  timeoutSeconds: 300,
  memory:         '512MiB',
}, async (_event) => {
  console.log('[Scheduler] Starting Enqueue Daily Reminders...');

  // Fetch all eligible unpaid invoices across all merchants
  const invoicesSnap = await db
    .collectionGroup('invoices')
    .where('status', 'in', ['sent', 'partial', 'overdue'])
    .where('isArchived', '==', false)
    .get();

  // Normalise today to midnight UTC so date arithmetic is clean
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let queued  = 0;
  let skipped = 0;
  let errors  = 0;

  for (const doc of invoicesSnap.docs) {
    const invoice = doc.data();

    // Skip invoices without a dueDate — can't calculate stage
    if (!invoice.dueDate) { skipped++; continue; }

    const dueDate = invoice.dueDate.toDate() as Date;
    dueDate.setUTCHours(0, 0, 0, 0);

    // diffDays: negative = upcoming, 0 = today, positive = overdue
    const diffDays = Math.round(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const stage = OFFSET_TO_STAGE[diffDays];
    if (!stage) { skipped++; continue; }

    const merchantId  = invoice.merchantId as string;
    const templateKey = STAGE_TEMPLATE_MAP[stage];

    // ── DEDUPLICATION ────────────────────────────────────────────────────────
    // Deterministic ID: same invoice + stage = same document ID on every run.
    // .create() throws gRPC code 6 (ALREADY_EXISTS) if the doc already exists,
    // giving atomic deduplication for free — no extra read needed.
    const jobId  = `inv_${doc.id}_stage_${stage}`;
    const jobRef = db.doc(`merchants/${merchantId}/reminderJobs/${jobId}`);

    const jobData: Omit<ReminderJobData, 'lastAttemptAt' | 'whatsappMessageId'> & {
      scheduledAt: admin.firestore.FieldValue;
      createdAt:   admin.firestore.FieldValue;
      updatedAt:   admin.firestore.FieldValue;
      nextRetryAt: admin.firestore.FieldValue;
    } = {
      merchantId,
      invoiceId:   doc.id,
      customerId:  invoice.customerId  as string,
      stage,
      templateKey,
      status:      'pending',
      retryCount:  0,
      maxRetries:  3,
      lastError:   null,
      // nextRetryAt = now → processor can pick it up immediately
      nextRetryAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await jobRef.create(jobData);
      queued++;
    } catch (err: any) {
      if (err.code === 6) {
        // ALREADY_EXISTS — same invoice+stage already queued today. Safe to ignore.
        skipped++;
      } else {
        errors++;
        console.error(`[Scheduler] Failed to create job ${jobId}:`, err?.message ?? err);
      }
    }
  }

  console.log(
    `[Scheduler] Done. Queued=${queued} Skipped/Deduped=${skipped} Errors=${errors}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROCESSOR — PROCESS REMINDER QUEUE
//
// Runs every 15 minutes.
// Fetches up to 50 pending jobs whose nextRetryAt <= now.
// For each job:
//   a) Lock it (status = 'processing') to prevent parallel execution.
//   b) Check merchant account is active.
//   c) Check invoice is still unpaid (customer may have paid since enqueue).
//   d) Check customer WhatsApp opt-in.
//   e) Send WhatsApp message via Gupshup.
//   f) Mark completed / skipped / retry / failed based on outcome.
// ─────────────────────────────────────────────────────────────────────────────

export const processReminderQueue = onSchedule({
  schedule:       'every 15 minutes',
  timeZone:       'Asia/Kolkata',
  region:         'asia-south1',
  timeoutSeconds: 300,
  memory:         '256MiB',
}, async (_event) => {
  console.log('[Processor] Starting reminder queue processing...');

  const now = admin.firestore.Timestamp.now();

  // Fetch pending jobs that are ready to be processed
  const jobsSnap = await db
    .collectionGroup('reminderJobs')
    .where('status', '==', 'pending')
    .where('nextRetryAt', '<=', now)
    .orderBy('nextRetryAt', 'asc')
    .limit(50)
    .get();

  console.log(`[Processor] Found ${jobsSnap.size} pending job(s).`);

  for (const jobDoc of jobsSnap.docs) {
    const job    = jobDoc.data() as ReminderJobData;
    const jobRef = jobDoc.ref;

    // ── LOCK the job ─────────────────────────────────────────────────────────
    // Prevents two parallel processor instances from double-sending.
    await jobRef.update({
      status:        'processing' as ReminderJobStatus,
      lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      // ── CHECK 1: Merchant account active ───────────────────────────────────
      const merchantSnap = await db.doc(`merchants/${job.merchantId}`).get();
      if (!merchantSnap.exists) {
        await _skipJob(jobRef, 'Merchant account not found');
        continue;
      }
      if (merchantSnap.data()!.subscriptionStatus === 'canceled') {
        await _skipJob(jobRef, 'Merchant subscription canceled');
        continue;
      }

      // ── CHECK 2: Invoice still unpaid ──────────────────────────────────────
      // Re-check every run — customer may have paid in the last 15 minutes.
      const invoiceSnap = await db
        .doc(`merchants/${job.merchantId}/invoices/${job.invoiceId}`)
        .get();

      if (!invoiceSnap.exists) {
        await _skipJob(jobRef, 'Invoice not found');
        continue;
      }

      const invoice = invoiceSnap.data()!;

      if (
        invoice.status === 'paid' ||
        invoice.isArchived === true ||
        (invoice.paidAmount  != null &&
         invoice.totalAmount != null &&
         invoice.paidAmount  >= invoice.totalAmount)
      ) {
        await _skipJob(jobRef, 'Invoice already paid or archived');
        continue;
      }

      // ── CHECK 3: Customer WhatsApp opt-in ──────────────────────────────────
      const optIn = await checkCustomerOptIn(job.merchantId, job.customerId);
      if (!optIn.allowed) {
        const reason = `WhatsApp not eligible: ${optIn.reason}`;
        console.log(`[Processor] Skipping job ${jobDoc.id} — ${reason}`);

        await _skipJob(jobRef, reason);

        // Audit log so merchants can see WHY a reminder was skipped
        await db.collection(`merchants/${job.merchantId}/activityLogs`).add({
          merchantId:  job.merchantId,
          type:        'reminder_skipped',
          description: `Automated ${job.stage} reminder skipped for `
            + `${invoice.customerName ?? job.customerId} — ${optIn.reason}.`,
          metadata: {
            invoiceId:     job.invoiceId,
            invoiceNumber: invoice.invoiceNumber ?? null,
            customerId:    job.customerId,
            stage:         job.stage,
            reason:        optIn.reason,
          },
          userId:    'SYSTEM',
          userName:  'System Scheduler',
          isArchived: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        continue;
      }

      // ── SEND: WhatsApp message via Gupshup ─────────────────────────────────
      const sendResult = await sendWhatsappReminder({
        merchantId:    job.merchantId,
        reminderId:    jobDoc.id,
        customerId:    job.customerId,
        customerName:  invoice.customerName  ?? 'Customer',
        customerPhone: optIn.whatsappNumber  ?? null,
        invoiceId:     job.invoiceId,
        invoiceNumber: invoice.invoiceNumber ?? null,
        templateKey:   job.templateKey,
        variables: {
          customerName:  invoice.customerName  ?? 'Customer',
          invoiceNumber: invoice.invoiceNumber ?? job.invoiceId,
          amount:        String(invoice.totalAmount ?? 0),
          dueDate:       invoice.dueDate?.toDate?.()
                           ?.toLocaleDateString('en-IN') ?? '',
          stage:         job.stage,
        },
      });

      console.log(
        `[Processor] Sent ${job.stage} to ${invoice.customerName ?? job.customerId}`
        + ` | msgId=${sendResult.messageId}`
      );

      // ── SUCCESS: Mark job completed ─────────────────────────────────────────
      await jobRef.update({
        status:            'completed' as ReminderJobStatus,
        retryCount:        job.retryCount + 1,
        lastError:         null,
        whatsappMessageId: sendResult.messageId,
        updatedAt:         admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Audit log ───────────────────────────────────────────────────────────
      await db.collection(`merchants/${job.merchantId}/activityLogs`).add({
        merchantId:  job.merchantId,
        type:        'reminder_sent',
        description: `Automated ${job.stage} WhatsApp reminder sent to `
          + `${invoice.customerName ?? job.customerId} `
          + `for Invoice #${invoice.invoiceNumber ?? job.invoiceId}.`,
        metadata: {
          invoiceId:         job.invoiceId,
          invoiceNumber:     invoice.invoiceNumber     ?? null,
          stage:             job.stage,
          templateKey:       job.templateKey,
          whatsappMessageId: sendResult.messageId,
          providerMessageId: sendResult.providerMessageId ?? null,
        },
        userId:    'SYSTEM',
        userName:  'System Scheduler',
        isArchived: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    } catch (error: any) {
      const retryCount = job.retryCount + 1;

      // WhatsappSendError.isTransient classifies the error:
      //   false → permanent (opted-out, template not approved) → stop retrying
      //   true  → transient (network, rate-limit, 5xx)         → backoff + retry
      const isPermanent =
        error instanceof WhatsappSendError && !error.isTransient;

      if (isPermanent || retryCount > job.maxRetries) {
        // ── PERMANENT FAILURE: stop retrying ───────────────────────────────
        await jobRef.update({
          status:    'failed' as ReminderJobStatus,
          retryCount,
          lastError: error?.message ?? 'Unknown error',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.error(
          `[Processor] Job ${jobDoc.id} permanently failed: ${error?.message}`
        );
      } else {
        // ── TRANSIENT FAILURE: exponential backoff ─────────────────────────
        // attempt 1 → 1h, attempt 2 → 2h, attempt 3 → 4h
        const backoffHours = Math.pow(2, retryCount - 1);
        const nextRetry    = new Date();
        nextRetry.setHours(nextRetry.getHours() + backoffHours);

        await jobRef.update({
          status:      'pending' as ReminderJobStatus,
          retryCount,
          lastError:   error?.message ?? 'Unknown error',
          nextRetryAt: admin.firestore.Timestamp.fromDate(nextRetry),
          updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
        });
        console.warn(
          `[Processor] Job ${jobDoc.id} will retry in ${backoffHours}h`
          + ` (attempt ${retryCount}/${job.maxRetries}): ${error?.message}`
        );
      }
    }
  }

  console.log('[Processor] Queue processing finished.');
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Marks a job as skipped with no retry.
 * Used when the invoice is paid, merchant is inactive, or customer opted-out.
 */
async function _skipJob(
  jobRef: admin.firestore.DocumentReference,
  reason: string
): Promise<void> {
  await jobRef.update({
    status:    'skipped' as ReminderJobStatus,
    lastError: reason,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}