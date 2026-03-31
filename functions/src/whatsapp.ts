import * as admin from "firebase-admin";
import axios from "axios";
import { logger } from "firebase-functions/v2";

// ── TYPES ──────────────────────────────────────────────────────────────────

export type MessageStatus =
  | "queued" | "sent" | "delivered" | "read"
  | "failed" | "rejected" | "invalid_number"
  | "template_rejected" | "rate_limited";

export type TemplateKey =
  | "invoice_shared" | "payment_reminder_due_soon"
  | "payment_overdue" | "payment_received"
  | "estimate_followup" | "manual_reminder";

export const TEMPLATE_MAP: Record<TemplateKey, string> = {
  invoice_shared:            "flowbill_invoice_shared",
  payment_reminder_due_soon: "flowbill_payment_due_soon",
  payment_overdue:           "flowbill_payment_overdue",
  payment_received:          "flowbill_payment_received",
  estimate_followup:         "flowbill_estimate_followup",
  manual_reminder:           "flowbill_manual_reminder",
};

/** These errors must NOT be retried */
export const PERMANENT_ERROR_CODES = new Set([
  "invalid_number", "template_rejected",
  "opted_out", "blacklisted", "user_not_on_whatsapp",
]);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [0, 30_000, 120_000]; // attempt 1: immediate, 2: 30s, 3: 2min

export interface MerchantWhatsAppConfig {
  merchantId: string;
  businessPhone: string;
  interaktApiKey: string;       // ⚠️ server-side only — never returned to frontend
  approvedTemplates: TemplateKey[];
  optInStatus: boolean;
  healthStatus: "healthy" | "degraded" | "suspended";
  dailyQuota: number;
  dailyUsed: number;
  quotaResetAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface WhatsAppMessageDoc {
  merchantId: string;
  customerId: string;
  invoiceId: string | null;
  reminderId: string | null;
  templateKey: TemplateKey;
  providerMessageId: string | null;   // Interakt wamid
  sendStatus: MessageStatus;
  deliveryStatus: MessageStatus | null;
  retryCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  to: string;
  templateVariables: Record<string, string>;
  sentAt: FirebaseFirestore.Timestamp | null;
  deliveredAt: FirebaseFirestore.Timestamp | null;
  readAt: FirebaseFirestore.Timestamp | null;
  failedAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface SendWhatsappParams {
  merchantId: string;
  customerId: string;
  invoiceId?: string;
  reminderId?: string;
  to: string;             // E.164 format: +919876543210
  templateKey: TemplateKey;
  templateVariables: Record<string, string>;
}

// ── HELPERS ────────────────────────────────────────────────────────────────

async function getMerchantWhatsAppConfig(merchantId: string) {
  const snap = await admin.firestore()
    .collection("merchants").doc(merchantId)
    .collection("whatsappConfig").doc("config").get();
  if (!snap.exists) return null;
  return snap.data() as MerchantWhatsAppConfig;
}

async function checkAndIncrementQuota(
  merchantId: string,
  config: MerchantWhatsAppConfig
): Promise<{ allowed: boolean }> {
  const now = admin.firestore.Timestamp.now();
  const configRef = admin.firestore()
    .collection("merchants").doc(merchantId)
    .collection("whatsappConfig").doc("config");

  if (now.seconds > config.quotaResetAt.seconds) {
    await configRef.update({
      dailyUsed: 1,
      quotaResetAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86_400_000)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { allowed: true };
  }
  if (config.dailyUsed >= config.dailyQuota) return { allowed: false };
  await configRef.update({
    dailyUsed: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { allowed: true };
}

async function callInteraktSend(
  apiKey: string, to: string,
  templateName: string, variables: Record<string, string>
) {
  const bodyParams = Object.values(variables).map((v) => ({ type: "text", text: v }));
  try {
    const response = await axios.post(
      "https://api.interakt.ai/v1/public/message/",
      {
        countryCode: "+91",
        phoneNumber: to.replace(/^\+91/, "").replace(/\D/g, ""),
        callbackData: `flowbill_${Date.now()}`,
        type: "Template",
        template: { name: templateName, languageCode: "en", bodyValues: bodyParams },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}`,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      }
    );
    const data = response.data;
    return {
      success: data.result === true,
      providerMessageId: data.id ?? null,
      errorCode: data.result === true ? null : (data.message ?? "unknown"),
      errorMessage: data.result === true ? null : JSON.stringify(data),
    };
  } catch (err: any) {
    const status = err?.response?.status;
    let errorCode = "api_error";
    if (status === 400) errorCode = "invalid_request";
    if (status === 401) errorCode = "invalid_api_key";
    if (status === 429) errorCode = "rate_limited";
    const body = err?.response?.data ?? {};
    if (body?.message?.includes("not a valid WhatsApp")) errorCode = "invalid_number";
    if (body?.message?.includes("template")) errorCode = "template_rejected";
    return {
      success: false, providerMessageId: null, errorCode,
      errorMessage: err?.response?.data ? JSON.stringify(err.response.data) : err.message,
    };
  }
}

// ── CORE SEND ──────────────────────────────────────────────────────────────

export const sendWhatsAppMessage = async (
  params: SendWhatsappParams,
  retryCount = 0
): Promise<{ success: boolean; messageDocId: string; errorCode?: string }> => {
  const db = admin.firestore();
  const { merchantId, customerId, invoiceId = null, reminderId = null,
          to, templateKey, templateVariables } = params;

  const config = await getMerchantWhatsAppConfig(merchantId);
  if (!config) throw new Error(`No WhatsApp config for merchant ${merchantId}`);
  if (config.healthStatus === "suspended") throw new Error("WA account suspended");
  if (!config.approvedTemplates.includes(templateKey))
    throw new Error(`Template '${templateKey}' not approved`);

  const quota = await checkAndIncrementQuota(merchantId, config);
  if (!quota.allowed) {
    logger.warn(`[WhatsApp] Quota exceeded for merchant ${merchantId}`);
    const ref = db.collection(`merchants/${merchantId}/whatsappMessages`).doc();
    await ref.set({
      merchantId, customerId, invoiceId, reminderId, templateKey, to, templateVariables,
      sendStatus: "rate_limited", providerMessageId: null, deliveryStatus: null,
      retryCount, errorCode: "rate_limited", errorMessage: null,
      sentAt: null, deliveredAt: null, readAt: null,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: false, messageDocId: ref.id, errorCode: "rate_limited" };
  }

  // Create initial log
  const msgRef = db.collection(`merchants/${merchantId}/whatsappMessages`).doc();
  await msgRef.set({
    merchantId, customerId, invoiceId, reminderId, templateKey,
    providerMessageId: null, sendStatus: "queued", deliveryStatus: null,
    retryCount, errorCode: null, errorMessage: null, to, templateVariables,
    sentAt: null, deliveredAt: null, readAt: null, failedAt: null,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  const result = await callInteraktSend(
    config.interaktApiKey, to, TEMPLATE_MAP[templateKey], templateVariables
  );

  if (result.success) {
    await msgRef.update({
      sendStatus: "sent", providerMessageId: result.providerMessageId,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`[WhatsApp] Sent ${templateKey} to ${to} | wamid=${result.providerMessageId}`);
    return { success: true, messageDocId: msgRef.id };
  }

  const isPermanent = result.errorCode && PERMANENT_ERROR_CODES.has(result.errorCode);

  if (!isPermanent && retryCount < MAX_RETRIES - 1) {
    const delay = RETRY_DELAY_MS[retryCount + 1] ?? 120_000;
    await msgRef.update({
      sendStatus: "failed", errorCode: result.errorCode,
      errorMessage: result.errorMessage, retryCount,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.warn(`[WhatsApp] Transient fail (${result.errorCode}). Retry ${retryCount + 1} in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
    return sendWhatsAppMessage(params, retryCount + 1);
  }

  const finalStatus: MessageStatus = isPermanent
    ? ((result.errorCode as MessageStatus) ?? "failed") : "failed";
  await msgRef.update({
    sendStatus: finalStatus, errorCode: result.errorCode,
    errorMessage: result.errorMessage, retryCount,
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  logger.error(`[WhatsApp] Permanent failure: ${result.errorCode} | doc=${msgRef.id}`);
  return { success: false, messageDocId: msgRef.id, errorCode: result.errorCode ?? "unknown" };
};

// Backwards-compat shim for existing reminders.ts calls
export interface SendWhatsappParams_Legacy {
  merchantId: string; reminderId: string; customerId: string;
  customerName: string; to: string; templateId: string; variables: Record<string, any>;
}
/** @deprecated use sendWhatsAppMessage */
export const sendWhatsappReminder = async (p: SendWhatsappParams_Legacy) => {
  const result = await sendWhatsAppMessage({
    merchantId: p.merchantId, customerId: p.customerId, reminderId: p.reminderId,
    to: p.to, templateKey: (p.templateId as TemplateKey) ?? "manual_reminder",
    templateVariables: { message: p.variables?.message ?? "", invoiceId: p.variables?.invoiceId ?? "" },
  });
  return { success: result.success, messageId: result.messageDocId };
};