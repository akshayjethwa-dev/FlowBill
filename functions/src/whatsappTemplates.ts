// functions/src/whatsappTemplates.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface UpsertTemplateInput {
  templateKey: string;
  providerTemplateId: string;
  category?: 'utility' | 'marketing' | 'auth' | string;
  language?: string;
  sampleBody?: string;
  paramOrder: string[];
}

export const upsertWhatsappTemplate = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const merchantId = auth.uid;
  const {
    templateKey,
    providerTemplateId,
    category = 'utility',
    language = 'en',
    sampleBody = '',
    paramOrder,
  } = (data || {}) as UpsertTemplateInput;

  // ── Validation ────────────────────────────────────────────────────────────
  if (!templateKey || typeof templateKey !== 'string' || templateKey.trim() === '') {
    throw new HttpsError('invalid-argument', 'templateKey is required and must be a non-empty string.');
  }

  // templateKey must be slug-safe: lowercase letters, digits, underscores only
  if (!/^[a-z0-9_]+$/.test(templateKey.trim())) {
    throw new HttpsError(
      'invalid-argument',
      'templateKey must contain only lowercase letters, digits, and underscores (e.g. payment_due_soon).'
    );
  }

  if (!providerTemplateId || typeof providerTemplateId !== 'string' || providerTemplateId.trim() === '') {
    throw new HttpsError('invalid-argument', 'providerTemplateId is required (copy from Gupshup console).');
  }

  if (!Array.isArray(paramOrder) || paramOrder.length === 0) {
    throw new HttpsError('invalid-argument', 'paramOrder must be a non-empty array of variable names.');
  }

  const invalidParams = paramOrder.filter((p) => typeof p !== 'string' || p.trim() === '');
  if (invalidParams.length > 0) {
    throw new HttpsError('invalid-argument', 'All paramOrder entries must be non-empty strings.');
  }

  // ── Write to Firestore ────────────────────────────────────────────────────
  const ref = db
    .collection(`merchants/${merchantId}/whatsappTemplates`)
    .doc(templateKey.trim());

  await ref.set(
    {
      templateKey:        templateKey.trim(),
      providerTemplateId: providerTemplateId.trim(),
      category:           String(category).trim(),
      language:           String(language).trim(),
      sampleBody:         String(sampleBody).trim(),
      paramOrder:         paramOrder.map((p) => String(p).trim()),
      approved:           true,
      updatedAt:          admin.firestore.FieldValue.serverTimestamp(),
      createdAt:          admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true, templateKey: templateKey.trim() };
});

export const deleteWhatsappTemplate = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const merchantId = auth.uid;
  const { templateKey } = (data || {}) as { templateKey: string };

  if (!templateKey) {
    throw new HttpsError('invalid-argument', 'templateKey is required.');
  }

  await db
    .collection(`merchants/${merchantId}/whatsappTemplates`)
    .doc(templateKey)
    .delete();

  return { success: true };
});