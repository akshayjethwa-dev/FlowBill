// functions/src/reminders.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { checkCustomerOptIn, sendWhatsappReminder, WhatsappSendError } from './whatsapp';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ── Stage → templateKey mapping ───────────────────────────────────────────────
const STAGE_TEMPLATE_MAP: Record<string, string> = {
  'T-3': 'payment_reminder_due_soon',
  'T-0': 'payment_reminder_due_soon',
  'T+2': 'payment_overdue',
  'T+7': 'payment_overdue',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCHEDULER: ENQUEUE DAILY REMINDERS
// Runs every morning at 08:00 AM IST to identify eligible invoices.
// ─────────────────────────────────────────────────────────────────────────────
export const enqueueDailyReminders = onSchedule({
  schedule: '0 8 * * *', // 8 AM everyday
  timeZone: 'Asia/Kolkata',
  region: 'asia-south1',
  timeoutSeconds: 300,
  memory: '512MiB',
}, async (_event) => {
  console.log('Starting Enqueue Daily Reminders Job...');

  // Query all active, unpaid invoices across the entire SaaS platform
  const invoicesSnap = await db.collectionGroup('invoices')
    .where('status', 'in', ['sent', 'partial', 'overdue'])
    .where('isArchived', '==', false)
    .get();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC for clean math

  let queuedCount  = 0;
  let skippedCount = 0;

  for (const doc of invoicesSnap.docs) {
    const invoice = doc.data();
    if (!invoice.dueDate) continue;

    const dueDate = invoice.dueDate.toDate();
    dueDate.setUTCHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffDays = Math.round(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Timing Rules
    let stage = '';
    if      (diffDays === -3) stage = 'T-3'; // Due in 3 days
    else if (diffDays ===  0) stage = 'T-0'; // Due today
    else if (diffDays ===  2) stage = 'T+2'; // 2 days overdue
    else if (diffDays ===  7) stage = 'T+7'; // 7 days overdue

    if (!stage) { skippedCount++; continue; }

    const merchantId = invoice.merchantId;

    // DEDUPLICATION: Deterministic Document ID — never queue same stage twice
    const queueDocId = `inv_${doc.id}_stage_${stage}`;
    const queueRef   = db.doc(`merchants/${merchantId}/reminderQueue/${queueDocId}`);

    try {
      // .create() fails with code 6 (ALREADY_EXISTS) on duplicates — safe dedup
      await queueRef.create({
        merchantId,
        invoiceId:   doc.id,
        customerId:  invoice.customerId,
        stage,
        status:      'pending',
        attempts:    0,
        maxAttempts: 3,
        nextRetryAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      });
      queuedCount++;
    } catch (err: any) {
      if (err.code === 6) {
        skippedCount++; // Expected on reruns
      } else {
        console.error(`Failed to queue reminder for invoice ${doc.id}:`, err);
      }
    }
  }

  console.log(`Enqueue Job Finished. Queued: ${queuedCount}, Skipped: ${skippedCount}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROCESSOR: PROCESS REMINDER QUEUE
// Runs every 15 minutes to safely deliver messages and handle retries.
// ─────────────────────────────────────────────────────────────────────────────
export const processReminderQueue = onSchedule({
  schedule: 'every 15 minutes',
  timeZone: 'Asia/Kolkata',
  region: 'asia-south1',
  timeoutSeconds: 300,
  memory: '256MiB',
}, async (_event) => {
  console.log('Starting Queue Processor...');

  const now = admin.firestore.Timestamp.now();

  // Fetch up to 50 pending reminders whose time has come
  const queueSnap = await db.collectionGroup('reminderQueue')
    .where('status', '==', 'pending')
    .where('nextRetryAt', '<=', now)
    .limit(50)
    .get();

  for (const queueDoc of queueSnap.docs) {
    const task    = queueDoc.data();
    const taskRef = queueDoc.ref;

    // Lock the task so parallel runners don't process it
    await taskRef.update({ status: 'processing', lastAttemptAt: now });

    try {
      // ── ELIGIBILITY CHECK 1: Merchant Account Active? ──────────────────────
      const merchantSnap = await db.doc(`merchants/${task.merchantId}`).get();
      if (!merchantSnap.exists || merchantSnap.data()?.subscriptionStatus === 'canceled') {
        throw new Error('Merchant account inactive or canceled');
      }

      // ── ELIGIBILITY CHECK 2: Invoice Still Unpaid? ─────────────────────────
      // Customer may have paid in the last 15 minutes!
      const invoiceSnap = await db
        .doc(`merchants/${task.merchantId}/invoices/${task.invoiceId}`)
        .get();
      if (!invoiceSnap.exists) throw new Error('Invoice not found');

      const invoice = invoiceSnap.data()!;
      if (
        invoice.paidAmount >= invoice.totalAmount ||
        invoice.status === 'paid' ||
        invoice.isArchived
      ) {
        await taskRef.update({ status: 'skipped', lastError: 'Invoice already paid or archived' });
        continue;
      }

      // ── ELIGIBILITY CHECK 3: ✅ Customer WhatsApp Opt-In? ──────────────────
      // Load the customer doc, verify whatsappOptIn === true and a valid
      // whatsappNumber exists. If not, skip gracefully — no failed message
      // doc is written, just an audit log entry so merchants know why.
      const optIn = await checkCustomerOptIn(task.merchantId, task.customerId);
      if (!optIn.allowed) {
        console.log(
          `[Reminders] Skipping ${task.invoiceId} @ ${task.stage} — ${optIn.reason}`
        );
        await taskRef.update({
          status:    'skipped',
          lastError: `WhatsApp not eligible: ${optIn.reason}`,
        });
        await db.collection(`merchants/${task.merchantId}/activityLogs`).add({
          merchantId:  task.merchantId,
          type:        'reminder_skipped',
          description: `WhatsApp ${task.stage} reminder skipped for ${invoice.customerName ?? task.customerId} — ${optIn.reason}.`,
          metadata: {
            invoiceId:  task.invoiceId,
            customerId: task.customerId,
            stage:      task.stage,
            reason:     optIn.reason,
          },
          userId:    'SYSTEM',
          userName:  'System Scheduler',
          isArchived: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        continue;
      }

      // ── ACTION: Send WhatsApp via Gupshup ──────────────────────────────────
      const templateKey = STAGE_TEMPLATE_MAP[task.stage] ?? 'payment_reminder_due_soon';

      const sendResult = await sendWhatsappReminder({
        merchantId:    task.merchantId,
        reminderId:    queueDoc.id,
        customerId:    task.customerId,
        customerName:  invoice.customerName  ?? 'Customer',
        customerPhone: optIn.whatsappNumber  ?? null,
        invoiceId:     task.invoiceId,
        invoiceNumber: invoice.invoiceNumber ?? null,
        templateKey,
        variables: {
          customerName:  invoice.customerName  ?? 'Customer',
          invoiceNumber: invoice.invoiceNumber ?? task.invoiceId,
          amount:        String(invoice.totalAmount ?? 0),
          dueDate:       invoice.dueDate?.toDate?.()
                           ?.toLocaleDateString('en-IN') ?? '',
          stage:         task.stage,
        },
      });

      console.log(
        `[Reminders] Sent ${task.stage} to ${invoice.customerName} | msgId=${sendResult.messageId}`
      );

      // ── AUDIT LOG ───────────────────────────────────────────────────────────
      await db.collection(`merchants/${task.merchantId}/activityLogs`).add({
        merchantId:  task.merchantId,
        type:        'reminder_sent',
        description: `Automated ${task.stage} reminder sent to ${invoice.customerName} for Invoice #${invoice.invoiceNumber}.`,
        metadata: {
          invoiceId:         task.invoiceId,
          invoiceNumber:     invoice.invoiceNumber     ?? null,
          stage:             task.stage,
          whatsappMessageId: sendResult.messageId,
          providerMessageId: sendResult.providerMessageId ?? null,
        },
        userId:    'SYSTEM',
        userName:  'System Scheduler',
        isArchived: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Mark task complete ──────────────────────────────────────────────────
      await taskRef.update({
        status:            'completed',
        attempts:          task.attempts + 1,
        lastError:         null,
        whatsappMessageId: sendResult.messageId,
      });

    } catch (error: any) {
      const attempts = task.attempts + 1;

      // Permanent WhatsApp errors (opted_out, template_not_approved, etc.)
      // must not be retried — mark failed immediately to avoid wasted cycles.
      const isPermanent =
        error instanceof WhatsappSendError && !error.isTransient;

      if (isPermanent || attempts >= task.maxAttempts) {
        await taskRef.update({
          status:    'failed',
          lastError: error.message,
          attempts,
        });
      } else {
        // EXPONENTIAL BACKOFF: 1hr → 2hr → 4hr
        const backoffHours = Math.pow(2, attempts - 1);
        const nextRetry    = new Date();
        nextRetry.setHours(nextRetry.getHours() + backoffHours);

        await taskRef.update({
          status:      'pending',
          lastError:   error.message,
          attempts,
          nextRetryAt: admin.firestore.Timestamp.fromDate(nextRetry),
        });
      }

      console.error(
        `[Reminders] Error processing task ${queueDoc.id}:`,
        error?.message ?? error
      );
    }
  }

  console.log('Queue Processor Finished.');
});