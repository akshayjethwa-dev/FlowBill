import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { sendWhatsappReminder } from "./whatsapp";

/**
 * Periodically processes queued reminder jobs.
 * Runs every 5 minutes.
 */
export const processReminderJobs = onSchedule("every 5 minutes", async (event) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  // Find all queued reminders scheduled for right now or earlier across ALL merchants
  const queuedReminders = await db.collectionGroup("reminderJobs")
    .where("status", "==", "queued")
    .where("scheduledAt", "<=", now)
    .get();

  if (queuedReminders.empty) {
    console.log("No queued reminders to process at this time.");
    return;
  }

  console.log(`Processing ${queuedReminders.size} queued reminders...`);
  
  const batch = db.batch();

  for (const doc of queuedReminders.docs) {
    const reminder = doc.data();
    const merchantId = reminder.merchantId;

    try {
      // Send the message using our common abstraction
      await sendWhatsappReminder({
        merchantId: merchantId,
        reminderId: doc.id,
        customerId: reminder.customerId,
        customerName: reminder.customerName,
        to: reminder.customerPhone || "unknown_number", // Fallback if phone isn't populated yet
        templateId: reminder.type,
        variables: {
          message: reminder.message,
          invoiceId: reminder.invoiceId || null,
        },
      });

      // Mark the job as sent
      batch.update(doc.ref, {
        status: "sent",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error(`Failed to process reminder ${doc.id}:`, error);
      
      // Mark the job as failed if the BSP call or logic throws an error
      batch.update(doc.ref, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }

  // Commit all status updates at once
  await batch.commit();
  console.log("Reminder processing complete.");
});