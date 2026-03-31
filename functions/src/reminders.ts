import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCHEDULER: ENQUEUE DAILY REMINDERS
// Runs every morning at 08:00 AM IST to identify eligible invoices.
// ─────────────────────────────────────────────────────────────────────────────
export const enqueueDailyReminders = onSchedule({
  schedule: "0 8 * * *", // 8 AM everyday
  timeZone: "Asia/Kolkata",
  region: "asia-south1",
  timeoutSeconds: 300,
  memory: "512MiB"
}, async (event) => {
  console.log("Starting Enqueue Daily Reminders Job...");

  // Query all active, unpaid invoices across the entire SaaS platform
  const invoicesSnap = await db.collectionGroup('invoices')
    .where('status', 'in', ['sent', 'partial', 'overdue'])
    .where('isArchived', '==', false)
    .get();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC for clean math

  let queuedCount = 0;
  let skippedCount = 0;

  for (const doc of invoicesSnap.docs) {
    const invoice = doc.data();
    if (!invoice.dueDate) continue;

    const dueDate = invoice.dueDate.toDate();
    dueDate.setUTCHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffDays = Math.round((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Timing Rules
    let stage = '';
    if (diffDays === -3) stage = 'T-3';      // Due in 3 days
    else if (diffDays === 0) stage = 'T-0';  // Due today
    else if (diffDays === 2) stage = 'T+2';  // 2 days overdue
    else if (diffDays === 7) stage = 'T+7';  // 7 days overdue
    
    if (!stage) {
      skippedCount++;
      continue;
    }

    const merchantId = invoice.merchantId;
    
    // DEDUPLICATION: Deterministic Document ID ensures we never queue the same stage twice
    const queueDocId = `inv_${doc.id}_stage_${stage}`;
    const queueRef = db.doc(`merchants/${merchantId}/reminderQueue/${queueDocId}`);

    try {
      // Use .create() so it explicitly fails if the document already exists
      await queueRef.create({
        merchantId,
        invoiceId: doc.id,
        customerId: invoice.customerId,
        stage,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3, // Retry Policy
        nextRetryAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      queuedCount++;
    } catch (err: any) {
      // Error code 6 (ALREADY_EXISTS) is expected if the scheduler overlaps/reruns
      if (err.code === 6) {
        skippedCount++;
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
  schedule: "every 15 minutes",
  timeZone: "Asia/Kolkata",
  region: "asia-south1",
  timeoutSeconds: 300,
  memory: "256MiB"
}, async (event) => {
  console.log("Starting Queue Processor...");

  const now = admin.firestore.Timestamp.now();
  
  // Fetch up to 50 pending reminders whose time has come
  const queueSnap = await db.collectionGroup('reminderQueue')
    .where('status', '==', 'pending')
    .where('nextRetryAt', '<=', now)
    .limit(50)
    .get();

  for (const queueDoc of queueSnap.docs) {
    const task = queueDoc.data();
    const taskRef = queueDoc.ref;

    // Lock the task so parallel runners don't process it
    await taskRef.update({ status: 'processing', lastAttemptAt: now });

    try {
      // ELIGIBILITY CHECK 1: Merchant Account Active?
      const merchantSnap = await db.doc(`merchants/${task.merchantId}`).get();
      if (!merchantSnap.exists || merchantSnap.data()?.subscriptionStatus === 'canceled') {
        throw new Error('Merchant account inactive or canceled');
      }

      // ELIGIBILITY CHECK 2: Invoice Still Unpaid? (Customer may have paid 5 mins ago!)
      const invoiceSnap = await db.doc(`merchants/${task.merchantId}/invoices/${task.invoiceId}`).get();
      if (!invoiceSnap.exists) throw new Error('Invoice not found');
      
      const invoice = invoiceSnap.data()!;
      if (invoice.paidAmount >= invoice.totalAmount || invoice.status === 'paid' || invoice.isArchived) {
        await taskRef.update({ status: 'skipped', lastError: 'Invoice already paid or archived' });
        continue; 
      }

      // ─────────────────────────────────────────────────────────────
      // ACTION: Send WhatsApp Message
      // Replace this mock with your actual Meta/WhatsApp API call
      // await sendWhatsAppTemplate({ to: customerPhone, template: task.stage, data: invoice });
      // ─────────────────────────────────────────────────────────────
      console.log(`Sending WhatsApp to ${invoice.customerName} for ${task.stage}...`);

      // AUDIT LOG: Record the automated action natively
      await db.collection(`merchants/${task.merchantId}/activityLogs`).add({
        merchantId: task.merchantId,
        type: "reminder_sent",
        description: `Automated ${task.stage} reminder sent to ${invoice.customerName} for Invoice #${invoice.invoiceNumber}`,
        metadata: { invoiceId: invoice.id, stage: task.stage },
        userId: "SYSTEM",
        userName: "System Scheduler",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isArchived: false
      });

      // Mark success
      await taskRef.update({ status: 'completed', attempts: task.attempts + 1 });

    } catch (error: any) {
      const attempts = task.attempts + 1;
      
      if (attempts >= task.maxAttempts) {
        // Max retries reached
        await taskRef.update({ status: 'failed', lastError: error.message, attempts });
      } else {
        // EXPONENTIAL BACKOFF: Retry in 1hr, then 2hrs, then 4hrs
        const backoffHours = Math.pow(2, attempts - 1); 
        const nextRetry = new Date();
        nextRetry.setHours(nextRetry.getHours() + backoffHours);
        
        await taskRef.update({ 
          status: 'pending', 
          lastError: error.message, 
          attempts,
          nextRetryAt: admin.firestore.Timestamp.fromDate(nextRetry)
        });
      }
    }
  }
});