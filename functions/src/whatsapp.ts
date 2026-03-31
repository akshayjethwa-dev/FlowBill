import * as admin from "firebase-admin";

export interface SendWhatsappParams {
  merchantId: string;
  reminderId: string;
  customerId: string;
  customerName: string;
  to: string;
  templateId: string;
  variables: Record<string, any>;
}

/**
 * Common interface for sending WhatsApp messages.
 * Mocks the send process and logs the payload to the whatsappMessages collection.
 */
export const sendWhatsappReminder = async ({
  merchantId,
  reminderId,
  customerId,
  customerName,
  to,
  templateId,
  variables
}: SendWhatsappParams) => {
  const db = admin.firestore();

  // 1. MOCK BSP API CALL
  // In the future, replace this with your BSP SDK/HTTP call.
  console.log(`[MOCK WHATSAPP] Sending template '${templateId}' to ${to}`);
  console.log(`[MOCK WHATSAPP] Variables:`, variables);

  // 2. LOG TO DATABASE
  // Creates a whatsappMessages doc with status 'sent'
  const messageRef = db.collection(`merchants/${merchantId}/whatsappMessages`).doc();
  
  const payload = {
    merchantId,
    reminderId,
    customerId,
    customerName,
    type: templateId, // e.g., 'payment', 'follow_up'
    channel: "whatsapp",
    status: "sent",
    to,
    variables,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await messageRef.set(payload);

  return { success: true, messageId: messageRef.id };
};