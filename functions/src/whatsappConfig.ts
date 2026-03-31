// functions/src/whatsappConfig.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const setupMerchantWhatsappConfig = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Must be logged in
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const merchantId = auth.uid; // In FlowBill, merchantId === owner UID

  // 2. Must provide businessNumber and appName from the UI
  const { businessNumber, appName } = data || {};

  if (!businessNumber || !appName) {
    throw new HttpsError(
      "invalid-argument",
      "businessNumber and appName are required"
    );
  }

  // 3. Write to merchants/{merchantId}/whatsappConfig/default
  const ref = db
    .collection(`merchants/${merchantId}/whatsappConfig`)
    .doc("default");

  await ref.set(
    {
      provider: "gupshup",
      status: "active",
      businessNumber: String(businessNumber).replace(/\D/g, ""), // strip spaces/dashes
      appName: String(appName).trim(),
      optInRequired: true,
      lastHealthCheckAt: null,
      lastError: "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }  // merge:true so re-calling doesn't wipe fields
  );

  return { success: true };
});