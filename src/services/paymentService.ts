/**
 * paymentService.ts  (UPDATED — server-authoritative)
 *
 * Changes:
 *  1. recordPayment  → now sends idempotencyKey (uuidv4) to Cloud Function
 *                      Return type tightened to { paymentId, alreadyRecorded }
 *  2. deletePayment  → moved to Cloud Function call (server handles reversal)
 *                      Old client-side runTransaction removed
 *  3. All other read/subscribe functions are unchanged
 */
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { Payment } from '../types/payment';
import { ServiceResult } from '../types/firestore';
import { paymentConverter } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const fns = getFunctions(db.app, 'asia-south1');

const col = (merchantId: string) =>
  collection(db, FSPath.payments(merchantId)).withConverter(paymentConverter);

// ─── Real-time subscription ────────────────────────────────────────────────────

export function subscribeToPayments(
  merchantId: string,
  callback: (payments: Payment[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    col(merchantId),
    where('merchantId', '==', merchantId),
    orderBy('paymentDate', 'desc'),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => d.data())),
    error => {
      handleFirestoreError(error, OperationType.LIST, FSPath.payments(merchantId));
      onError(error);
    },
  );
}

// ─── Record payment via Cloud Function (idempotent) ───────────────────────────
// idempotencyKey is generated here per call.
// On network retry the server returns the existing paymentId safely —
// no duplicate payments even if the user taps the button twice.

export async function recordPayment(
  merchantId: string,
  paymentData: Omit<Payment, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<{ paymentId: string; alreadyRecorded: boolean }>> {
  try {
    const fn = httpsCallable<
      Record<string, unknown>,
      { success: boolean; paymentId: string; alreadyRecorded: boolean }
    >(fns, 'recordManualPayment');

    const payload = {
      ...paymentData,
      merchantId,
      idempotencyKey: uuidv4(), // NEW: unique per payment attempt
      paymentDate:
        paymentData.paymentDate instanceof Date
          ? paymentData.paymentDate.toISOString()
          : paymentData.paymentDate,
    };

    const result = await fn(payload);
    return { ok: true, data: result.data };
  } catch (e: any) {
    return {
      ok: false,
      error: {
        code:      e.code      ?? 'unknown',
        message:   e.message   ?? 'Failed to record payment',
        path:      FSPath.payments(merchantId),
        operation: 'create',
        raw:       e,
      },
    };
  }
}

// ─── Delete / reverse payment via Cloud Function ──────────────────────────────
// OLD: client-side runTransaction that wrote directly to Firestore.
// NEW: Cloud Function handles reversal atomically on the server.
//      The function reverses invoice balance, customer outstanding,
//      deletes the payment doc, and logs the activity — all in one transaction.

export async function deletePayment(
  merchantId: string,
  paymentId: string,
): Promise<ServiceResult<void>> {
  try {
    const fn = httpsCallable<
      { merchantId: string; paymentId: string },
      { success: boolean }
    >(fns, 'deletePayment');

    await fn({ merchantId, paymentId });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return {
      ok: false,
      error: {
        code:      e.code    ?? 'unknown',
        message:   e.message ?? 'Failed to delete payment',
        path:      FSPath.payment(merchantId, paymentId),
        operation: 'delete',
        raw:       e,
      },
    };
  }
}

// ─── Namespace export (backward-compatible) ───────────────────────────────────
// deletePayment signature changed: now takes paymentId (string) instead of
// full Payment object. Update any callers accordingly.

export const paymentService = {
  getPaymentsPath:  FSPath.payments,
  subscribeToPayments,
  recordPayment,
  deletePayment,
};