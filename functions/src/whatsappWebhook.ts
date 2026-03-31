import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { MessageStatus } from "./whatsapp";

export const whatsappWebhook = onRequest(
  { region: "asia-south1", cors: false },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

    // Verify webhook secret (set INTERAKT_WEBHOOK_SECRET in Firebase env config)
    const secret = process.env.INTERAKT_WEBHOOK_SECRET ?? "";
    if (secret && req.headers["x-interakt-signature"] !== secret) {
      logger.warn("[Webhook] Invalid signature");
      res.status(401).send("Unauthorized"); return;
    }

    // Respond immediately — Interakt needs 200 fast or it retries
    res.status(200).json({ received: true });

    const body = req.body;
    if (body?.type !== "message_status" || !body?.data?.id) return;

    try { await processStatusUpdate(body.data); }
    catch (err) { logger.error("[Webhook] Processing error", err); }
  }
);

async function processStatusUpdate(update: any) {
  const db = admin.firestore();
  const statusMap: Record<string, MessageStatus> = {
    sent: "sent", delivered: "delivered",
    read: "read", failed: "failed", rejected: "rejected",
  };
  const internalStatus: MessageStatus = statusMap[update.status] ?? "failed";
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Find message by providerMessageId across all merchants
  const snap = await db.collectionGroup("whatsappMessages")
    .where("providerMessageId", "==", update.id).limit(1).get();

  if (snap.empty) {
    logger.warn(`[Webhook] No doc for providerMessageId=${update.id}`);
    return;
  }

  const msgDoc = snap.docs[0];
  const current = msgDoc.data();
  const patch: Record<string, any> = { deliveryStatus: internalStatus, updatedAt: now };

  if (internalStatus === "delivered") patch.deliveredAt = now;
  if (internalStatus === "read") {
    patch.readAt = now;
    if (!current.deliveredAt) patch.deliveredAt = now; // backfill if delivered event was missed
  }
  if (internalStatus === "failed" || internalStatus === "rejected") {
    patch.failedAt = now;
    patch.errorCode = update.error?.code?.toString() ?? internalStatus;
    patch.errorMessage = update.error?.message ?? null;
  }

  await msgDoc.ref.update(patch);

  // Push status entry to invoice timeline
  if (current.invoiceId && current.merchantId) {
    await db.collection(`merchants/${current.merchantId}/invoices`).doc(current.invoiceId).update({
      timeline: admin.firestore.FieldValue.arrayUnion({
        type: "whatsapp_status", templateKey: current.templateKey,
        status: internalStatus, messageDocId: msgDoc.id,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }),
      updatedAt: now,
    });
  }

  // Update reminderJob delivery status
  if (current.reminderId && current.merchantId) {
    const deliveryStatusMap: Partial<Record<MessageStatus, string>> = {
      delivered: "delivered", read: "read",
      failed: "delivery_failed", rejected: "delivery_rejected",
    };
    const reminderStatus = deliveryStatusMap[internalStatus];
    if (reminderStatus) {
      const rSnap = await db.collectionGroup("reminderJobs")
        .where("merchantId", "==", current.merchantId)
        .where(admin.firestore.FieldPath.documentId(), "==", current.reminderId)
        .limit(1).get();
      if (!rSnap.empty) {
        await rSnap.docs[0].ref.update({
          deliveryStatus: reminderStatus,
          updatedAt: now,
        });
      }
    }
  }

  logger.info(`[Webhook] ${msgDoc.id} → ${internalStatus}`);
}