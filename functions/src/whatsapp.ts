// functions/src/whatsapp.ts
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SendWhatsappParams {
  merchantId: string;
  reminderId?: string | null;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  templateKey: string;
  variables: Record<string, unknown>;
}

export interface MerchantWhatsappConfig {
  provider: 'gupshup' | 'twilio' | '360dialog' | string;
  status: 'pending' | 'active' | 'error' | 'disabled';
  businessNumber: string;
  appName: string;
  optInRequired: boolean;
  lastHealthCheckAt?: admin.firestore.Timestamp | null;
  lastError?: string | null;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

export interface WhatsappTemplateDefinition {
  templateKey: string;
  providerTemplateId: string;
  category: 'utility' | 'marketing' | 'auth' | string;
  language: string;
  sampleBody?: string;
  paramOrder: string[];
  approved: boolean;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

export type WhatsappSendStatus    = 'pending' | 'queued' | 'sent' | 'failed';
export type WhatsappDeliveryStatus = 'unknown' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsappMessageLog {
  merchantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  reminderId: string | null;
  templateKey: string;
  provider: string;
  providerTemplateId: string;
  providerMessageId: string | null;
  sendStatus: WhatsappSendStatus;
  deliveryStatus: WhatsappDeliveryStatus;
  retryCount: number;
  lastErrorCode: string | number | null;
  lastErrorReason: string | null;
  isPermanentFailure: boolean;
  channel: 'whatsapp';
  variables: Record<string, unknown>;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  sentAt?: admin.firestore.Timestamp | null;
  deliveredAt?: admin.firestore.Timestamp | null;
  readAt?: admin.firestore.Timestamp | null;
  failedAt?: admin.firestore.Timestamp | null;
}

export interface WhatsappQuotaDaily {
  date: string;
  count: number;
  limit: number;
  updatedAt?: admin.firestore.Timestamp;
}

export interface CustomerWhatsappFields {
  whatsappOptIn?: boolean;
  whatsappOptedOutAt?: admin.firestore.Timestamp | null;
  whatsappNumber?: string | null;
}

// ─── Opt-in check result (used by reminders.ts) ───────────────────────────────

export interface OptInCheckResult {
  allowed: boolean;
  /** Populated when allowed=true — the resolved phone number to send to */
  whatsappNumber?: string;
  /** Populated when allowed=false — reason for skipping */
  reason?: 'opted_out' | 'no_whatsapp_number' | 'no_customer_doc';
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class WhatsappSendError extends Error {
  code: string;
  isTransient: boolean;

  constructor(message: string, code: string, isTransient: boolean) {
    super(message);
    this.code        = code;
    this.isTransient = isTransient;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GUPSHUP_BASE_URL =
  process.env.GUPSHUP_BASE_URL ?? 'https://api.gupshup.io/wa/api/v1';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function merchantRef(merchantId: string) {
  return db.collection('merchants').doc(merchantId);
}

function classifyGupshupError(code?: number | string): boolean {
  if (code === undefined || code === null) return true;
  const numeric = typeof code === 'string' ? parseInt(code, 10) : code;

  const permanentCodes = new Set([1002, 1004, 1005, 1012, 4003, 4005]);
  const transientCodes = new Set([500, 1003, 4001]);

  if (permanentCodes.has(numeric)) return false;
  if (transientCodes.has(numeric)) return true;
  return true;
}

async function getMerchantWhatsappConfig(merchantId: string): Promise<MerchantWhatsappConfig> {
  const snap = await merchantRef(merchantId)
    .collection('whatsappConfig')
    .doc('default')
    .get();

  if (!snap.exists) {
    throw new WhatsappSendError(
      'WhatsApp configuration not found for merchant',
      'config_not_found',
      false
    );
  }

  const data = snap.data() as MerchantWhatsappConfig;

  if (data.status !== 'active') {
    throw new WhatsappSendError(
      `WhatsApp config is not active: ${data.status}`,
      'config_inactive',
      false
    );
  }

  if (!data.businessNumber || !data.appName || !data.provider) {
    throw new WhatsappSendError(
      'WhatsApp configuration is incomplete',
      'config_invalid',
      false
    );
  }

  return data;
}

async function getTemplateDefinition(
  merchantId: string,
  templateKey: string
): Promise<WhatsappTemplateDefinition> {
  const snap = await merchantRef(merchantId)
    .collection('whatsappTemplates')
    .doc(templateKey)
    .get();

  if (!snap.exists) {
    throw new WhatsappSendError(
      `Template ${templateKey} not found`,
      'template_not_found',
      false
    );
  }

  const data = snap.data() as WhatsappTemplateDefinition;

  if (!data.providerTemplateId || !Array.isArray(data.paramOrder)) {
    throw new WhatsappSendError(
      `Template ${templateKey} is invalid`,
      'template_invalid',
      false
    );
  }

  if (!data.approved) {
    throw new WhatsappSendError(
      `Template ${templateKey} is not approved`,
      'template_not_approved',
      false
    );
  }

  return data;
}

async function getCustomerWhatsappConsent(
  merchantId: string,
  customerId: string
): Promise<Required<CustomerWhatsappFields>> {
  const snap = await merchantRef(merchantId)
    .collection('customers')
    .doc(customerId)
    .get();

  if (!snap.exists) {
    throw new WhatsappSendError('Customer not found', 'customer_not_found', false);
  }

  const data = snap.data() as CustomerWhatsappFields;

  return {
    whatsappOptIn:      data.whatsappOptIn      ?? false,
    whatsappOptedOutAt: data.whatsappOptedOutAt ?? null,
    whatsappNumber:     data.whatsappNumber     ?? null,
  };
}

async function checkAndIncrementQuota(merchantId: string): Promise<void> {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const quotaRef = merchantRef(merchantId)
    .collection('whatsappQuota')
    .doc('daily');

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(quotaRef);

    let count = 0;
    let limit = 500;

    if (snap.exists) {
      const data = snap.data() as Partial<WhatsappQuotaDaily>;
      if (data.date === dateStr) count = data.count ?? 0;
      limit = data.limit ?? limit;
    }

    if (count >= limit) {
      throw new WhatsappSendError(
        `Daily WhatsApp quota exceeded (${count}/${limit})`,
        'quota_exceeded',
        false
      );
    }

    tx.set(
      quotaRef,
      {
        date:      dateStr,
        count:     count + 1,
        limit,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

// ─── ✅ NEW: Exported opt-in guard for reminders.ts ───────────────────────────

/**
 * Checks if a customer is eligible to receive WhatsApp messages.
 * Call this BEFORE sendWhatsappReminder to skip gracefully without
 * writing a failed message doc.
 *
 * Returns:
 *  { allowed: true,  whatsappNumber }  — safe to send
 *  { allowed: false, reason }          — skip with reason logged
 */
export async function checkCustomerOptIn(
  merchantId: string,
  customerId: string
): Promise<OptInCheckResult> {
  try {
    const snap = await merchantRef(merchantId)
      .collection('customers')
      .doc(customerId)
      .get();

    if (!snap.exists) {
      return { allowed: false, reason: 'no_customer_doc' };
    }

    const data = snap.data() as CustomerWhatsappFields;

    // Resolve phone: prefer dedicated whatsappNumber field
    const whatsappNumber = String(data.whatsappNumber ?? '').replace(/\D/g, '');
    if (!whatsappNumber) {
      return { allowed: false, reason: 'no_whatsapp_number' };
    }

    // whatsappOptIn must be explicitly true — undefined/null/false = opted out
    if (data.whatsappOptIn !== true) {
      return { allowed: false, reason: 'opted_out' };
    }

    return { allowed: true, whatsappNumber };

  } catch {
    // If Firestore read fails, treat as opted-out to avoid accidental sends
    return { allowed: false, reason: 'no_customer_doc' };
  }
}

// ─── Core send function ───────────────────────────────────────────────────────

export async function sendWhatsappReminder(params: SendWhatsappParams) {
  const {
    merchantId,
    reminderId    = null,
    customerId,
    customerName,
    customerPhone,
    invoiceId     = null,
    invoiceNumber = null,
    templateKey,
    variables,
  } = params;

  const apiKey = process.env.GUPSHUP_API_KEY;
  if (!apiKey) {
    throw new WhatsappSendError(
      'GUPSHUP_API_KEY is not configured',
      'missing_api_key',
      false
    );
  }

  const [config, template, consent] = await Promise.all([
    getMerchantWhatsappConfig(merchantId),
    getTemplateDefinition(merchantId, templateKey),
    getCustomerWhatsappConsent(merchantId, customerId),
  ]);

  if (config.provider !== 'gupshup') {
    throw new WhatsappSendError(
      `Unsupported provider: ${config.provider}`,
      'unsupported_provider',
      false
    );
  }

  // ── Opt-in guard (inner check — also enforced by checkCustomerOptIn above) ──
  if (config.optInRequired && !consent.whatsappOptIn) {
    throw new WhatsappSendError(
      'Customer has not opted in for WhatsApp',
      'customer_opted_out',
      false
    );
  }

  const resolvedPhone = consent.whatsappNumber || customerPhone || null;
  if (!resolvedPhone) {
    throw new WhatsappSendError(
      'Customer WhatsApp number is missing',
      'missing_customer_phone',
      false
    );
  }

  await checkAndIncrementQuota(merchantId);

  const paramsArray = template.paramOrder.map((key) => {
    const value = variables[key];
    return value == null ? '' : String(value);
  });

  const messageRef = merchantRef(merchantId)
    .collection('whatsappMessages')
    .doc();

  const baseMessage: WhatsappMessageLog = {
    merchantId,
    customerId,
    customerName,
    customerPhone: resolvedPhone,
    invoiceId,
    invoiceNumber,
    reminderId,
    templateKey,
    provider:           'gupshup',
    providerTemplateId: template.providerTemplateId,
    providerMessageId:  null,
    sendStatus:         'pending',
    deliveryStatus:     'unknown',
    retryCount:         0,
    lastErrorCode:      null,
    lastErrorReason:    null,
    isPermanentFailure: false,
    channel:            'whatsapp',
    variables,
    sentAt:      null,
    deliveredAt: null,
    readAt:      null,
    failedAt:    null,
  };

  await messageRef.set({
    ...baseMessage,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const url             = `${GUPSHUP_BASE_URL}/template/msg`;
  const templatePayload = { id: template.providerTemplateId, params: paramsArray };

  const form = new URLSearchParams();
  form.append('channel',     'whatsapp');
  form.append('source',      config.businessNumber);
  form.append('destination', resolvedPhone);
  form.append('src.name',    config.appName);
  form.append('template',    JSON.stringify(templatePayload));

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: apiKey,
      },
      body: form.toString(),
    });

    const text = await res.text();
    let responseJson: any = null;
    try { responseJson = JSON.parse(text); }
    catch { responseJson = { raw: text }; }

    if (!res.ok) {
      const errorCode   = responseJson?.code   ?? res.status;
      const errorReason = responseJson?.reason  ?? res.statusText ?? 'Unknown error';
      const isTransient = classifyGupshupError(errorCode);

      await messageRef.update({
        sendStatus:         'failed',
        deliveryStatus:     'failed',
        lastErrorCode:      errorCode,
        lastErrorReason:    errorReason,
        isPermanentFailure: !isTransient,
        failedAt:           admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:          admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new WhatsappSendError(
        `Gupshup API error: ${errorReason}`,
        String(errorCode),
        isTransient
      );
    }

    const providerMessageId =
      responseJson?.messageId ?? responseJson?.id ?? responseJson?.payload?.id ?? null;

    await messageRef.update({
      providerMessageId,
      sendStatus:    'sent',
      deliveryStatus: 'sent',
      sentAt:        admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, messageId: messageRef.id, providerMessageId };

  } catch (error: any) {
    if (error instanceof WhatsappSendError) throw error;

    await messageRef.update({
      sendStatus:         'failed',
      deliveryStatus:     'failed',
      lastErrorCode:      'network_error',
      lastErrorReason:    error?.message ?? 'Network or unknown error',
      isPermanentFailure: false,
      failedAt:           admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:          admin.firestore.FieldValue.serverTimestamp(),
    });

    throw new WhatsappSendError(
      error?.message ?? 'Network or unknown error',
      'network_error',
      true
    );
  }
}