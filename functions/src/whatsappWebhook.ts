// functions/src/whatsappWebhook.ts
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { WhatsappDeliveryStatus } from './whatsapp';

const db = admin.firestore();

// ─── Types ────────────────────────────────────────────────────────────────────

interface GupshupMessageEventPayload {
  /** Gupshup internal message ID – primary lookup key */
  gsId?: string;
  /** WhatsApp message ID – fallback lookup key */
  id?: string;
  /** 'enqueued' | 'sent' | 'delivered' | 'read' | 'failed' */
  type: string;
  destination?: string;
  code?: number | string | null;
  reason?: string | null;
}

interface GupshupInboundMessagePayload {
  sender: { phone: string; name?: string };
  payload: { type: string; text?: string };
}

interface GupshupWebhookBody {
  type: 'message-event' | 'message' | string;
  payload: GupshupMessageEventPayload | GupshupInboundMessagePayload | any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STOP_KEYWORDS  = new Set(['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT', 'CANCEL', 'QUIT', 'END']);
const START_KEYWORDS = new Set(['START', 'JOIN', 'SUBSCRIBE', 'OPT IN', 'OPTIN', 'YES', 'UNSTOP']);

// ─── Status maps ──────────────────────────────────────────────────────────────

const DELIVERY_STATUS_MAP: Record<string, WhatsappDeliveryStatus> = {
  enqueued:  'sent',
  sent:      'sent',
  delivered: 'delivered',
  read:      'read',
  failed:    'failed',
};

const ACTIVITY_TYPE_MAP: Record<string, string> = {
  sent:      'whatsapp_sent',
  delivered: 'whatsapp_delivered',
  read:      'whatsapp_read',
  failed:    'whatsapp_failed',
};

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Normalize phone: strip all non-digits. "919876543210", "+919876543210" → "919876543210" */
function normalizePhone(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '');
}

function buildDescription(
  status: WhatsappDeliveryStatus,
  data: Record<string, any>
): string {
  const invoice  = data.invoiceNumber ? `invoice ${data.invoiceNumber}` : 'an invoice';
  const customer = data.customerName ?? 'customer';
  switch (status) {
    case 'sent':      return `WhatsApp reminder sent to ${customer} for ${invoice}`;
    case 'delivered': return `WhatsApp reminder delivered to ${customer} for ${invoice}`;
    case 'read':      return `WhatsApp reminder read by ${customer} for ${invoice}`;
    case 'failed':    return `WhatsApp reminder failed for ${customer} (${invoice})`;
    default:          return `WhatsApp status update for ${invoice}`;
  }
}

// ─── Handler: message-event (DLR / delivery receipt) ─────────────────────────

async function handleMessageEvent(payload: GupshupMessageEventPayload): Promise<void> {
  const providerId = payload.gsId ?? payload.id;
  const eventType  = (payload.type ?? '').toLowerCase();

  if (!providerId) {
    logger.warn('[Webhook] message-event missing providerId', { payload });
    return;
  }

  const deliveryStatus = DELIVERY_STATUS_MAP[eventType];
  if (!deliveryStatus) {
    logger.info(`[Webhook] Ignoring unknown event type: ${eventType}`);
    return;
  }

  // ── 1. Find the whatsappMessages doc ──────────────────────────────────────
  const snap = await db
    .collectionGroup('whatsappMessages')
    .where('providerMessageId', '==', providerId)
    .limit(1)
    .get();

  if (snap.empty) {
    logger.warn(`[Webhook] No doc found for providerMessageId=${providerId}`);
    return;
  }

  const msgDoc  = snap.docs[0];
  const current = msgDoc.data() as Record<string, any>;
  const now     = admin.firestore.FieldValue.serverTimestamp();

  // ── 2. Build status patch ─────────────────────────────────────────────────
  const patch: Record<string, any> = { deliveryStatus, updatedAt: now };

  if (deliveryStatus === 'sent') {
    patch.sentAt = now;
  } else if (deliveryStatus === 'delivered') {
    patch.deliveredAt = now;
    if (!current.sentAt) patch.sentAt = now; // back-fill if sent was missed
  } else if (deliveryStatus === 'read') {
    patch.readAt = now;
    if (!current.deliveredAt) patch.deliveredAt = now;
    if (!current.sentAt)      patch.sentAt      = now;
  } else if (deliveryStatus === 'failed') {
    patch.failedAt        = now;
    patch.lastErrorCode   = payload.code   ?? null;
    patch.lastErrorReason = payload.reason ?? null;
    const code      = typeof payload.code === 'string'
      ? parseInt(payload.code, 10)
      : (payload.code ?? 0);
    const permanent = new Set([1002, 1004, 1005, 1012, 4003, 4005]);
    patch.isPermanentFailure = permanent.has(code);
  }

  await msgDoc.ref.update(patch);
  logger.info(`[Webhook] ${msgDoc.id} → deliveryStatus=${deliveryStatus}`);

  // ── 3. Write invoice activity log ─────────────────────────────────────────
  const activityType = ACTIVITY_TYPE_MAP[deliveryStatus];
  if (activityType && current.invoiceId && current.merchantId) {
    try {
      await db
        .collection(`merchants/${current.merchantId}/activities`)
        .doc()
        .set({
          merchantId:  current.merchantId,
          type:        activityType,
          description: buildDescription(deliveryStatus, current),
          metadata: {
            invoiceId:         current.invoiceId,
            invoiceNumber:     current.invoiceNumber  ?? null,
            whatsappMessageId: msgDoc.id,
            providerMessageId: providerId,
            customerId:        current.customerId,
            customerPhone:     current.customerPhone,
            deliveryStatus,
            errorCode:         payload.code   ?? null,
            errorReason:       payload.reason ?? null,
          },
          userId:    current.merchantId,
          userName:  'System',
          createdAt: now,
        });
      logger.info(`[Webhook] Activity written: ${activityType} for invoice ${current.invoiceId}`);
    } catch (err) {
      logger.error('[Webhook] Failed to write activity log', err);
    }
  }

  // ── 4. Update reminderJob delivery status ─────────────────────────────────
  if (current.reminderId && current.merchantId) {
    const reminderDeliveryMap: Partial<Record<WhatsappDeliveryStatus, string>> = {
      delivered: 'delivered',
      read:      'read',
      failed:    'delivery_failed',
    };
    const reminderStatus = reminderDeliveryMap[deliveryStatus];
    if (reminderStatus) {
      try {
        await db
          .collection(`merchants/${current.merchantId}/reminderJobs`)
          .doc(current.reminderId)
          .update({ deliveryStatus: reminderStatus, updatedAt: now });
      } catch (err) {
        logger.warn('[Webhook] Failed to update reminderJob', err);
      }
    }
  }
}

// ─── Handler: inbound STOP opt-out ───────────────────────────────────────────

async function handleStopOptOut(phone: string): Promise<void> {
  const now = admin.firestore.FieldValue.serverTimestamp();

  const snap = await db
    .collectionGroup('customers')
    .where('whatsappNumber', '==', phone)
    .get();

  if (snap.empty) {
    logger.info(`[Webhook/STOP] No customer found for phone=${phone}`);
    return;
  }

  const batch = db.batch();

  snap.docs.forEach((doc) => {
    // Update customer opt-out fields
    batch.update(doc.ref, {
      whatsappOptIn:      false,
      whatsappOptedOutAt: now,
      updatedAt:          now,
    });

    // Write activity log per merchant
    const data       = doc.data();
    const merchantId = data.merchantId as string | undefined;
    if (merchantId) {
      const logRef = db
        .collection(`merchants/${merchantId}/activityLogs`)
        .doc();
      batch.set(logRef, {
        merchantId,
        type:        'whatsapp_opt_out',
        description: `${data.name ?? phone} sent STOP — opted out of WhatsApp reminders.`,
        metadata: {
          customerId: doc.id,
          phone,
          customerName: data.name ?? null,
        },
        userId:    'SYSTEM',
        userName:  'System Webhook',
        isArchived: false,
        createdAt:  now,
      });
    }
  });

  await batch.commit();
  logger.info(`[Webhook/STOP] Opted out phone=${phone}, ${snap.size} customer(s) updated`);
}

// ─── Handler: inbound START opt-back-in ──────────────────────────────────────

async function handleStartOptIn(phone: string): Promise<void> {
  const now = admin.firestore.FieldValue.serverTimestamp();

  const snap = await db
    .collectionGroup('customers')
    .where('whatsappNumber', '==', phone)
    .get();

  if (snap.empty) {
    logger.info(`[Webhook/START] No customer found for phone=${phone}`);
    return;
  }

  const batch = db.batch();

  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      whatsappOptIn:      true,
      whatsappOptedOutAt: null,
      updatedAt:          now,
    });

    const data       = doc.data();
    const merchantId = data.merchantId as string | undefined;
    if (merchantId) {
      const logRef = db
        .collection(`merchants/${merchantId}/activityLogs`)
        .doc();
      batch.set(logRef, {
        merchantId,
        type:        'whatsapp_opt_in',
        description: `${data.name ?? phone} sent START — opted back in to WhatsApp reminders.`,
        metadata: {
          customerId:   doc.id,
          phone,
          customerName: data.name ?? null,
        },
        userId:    'SYSTEM',
        userName:  'System Webhook',
        isArchived: false,
        createdAt:  now,
      });
    }
  });

  await batch.commit();
  logger.info(`[Webhook/START] Opted in phone=${phone}, ${snap.size} customer(s) updated`);
}

// ─── Handler: inbound message (dispatches STOP / START / ignore) ─────────────

async function handleInboundMessage(payload: GupshupInboundMessagePayload): Promise<void> {
  const rawPhone = payload?.sender?.phone;
  if (!rawPhone) {
    logger.warn('[Webhook] Inbound message missing sender phone');
    return;
  }

  // Normalize to digits-only so "919876543210" and "+91-9876-543210" both match
  const phone = normalizePhone(rawPhone);
  const text  = (payload?.payload?.text ?? '').trim().toUpperCase();

  logger.info(`[Webhook] Inbound from ${phone}: "${text}"`);

  if (STOP_KEYWORDS.has(text)) {
    await handleStopOptOut(phone);
    return;
  }

  if (START_KEYWORDS.has(text)) {
    await handleStartOptIn(phone);
    return;
  }

  // All other inbound messages — no action needed yet
  logger.info(`[Webhook] Inbound message ignored (not a keyword): "${text}" from ${phone}`);
}

// ─── Main Cloud Function ──────────────────────────────────────────────────────

export const gupshupWhatsappWebhook = onRequest(
  { region: 'asia-south1', cors: false },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // ✅ Always respond 200 FIRST — Gupshup retries on any non-200
    res.status(200).send('ok');

    const body = req.body as GupshupWebhookBody;

    if (!body?.type || !body?.payload) {
      logger.warn('[Webhook] Empty or malformed body');
      return;
    }

    logger.info(`[Webhook] Received type=${body.type}`);

    try {
      if (body.type === 'message-event') {
        await handleMessageEvent(body.payload as GupshupMessageEventPayload);
      } else if (body.type === 'message') {
        await handleInboundMessage(body.payload as GupshupInboundMessagePayload);
      } else {
        logger.info(`[Webhook] Ignored unsupported type: ${body.type}`);
      }
    } catch (err) {
      // Log but never throw — response already sent as 200
      logger.error('[Webhook] Unhandled processing error', err);
    }
  }
);