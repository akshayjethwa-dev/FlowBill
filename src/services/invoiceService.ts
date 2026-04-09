/**
 * invoiceService.ts  (UPDATED — server-authoritative)
 *
 * Rules:
 *  1. createInvoice  → always goes through Cloud Function with idempotencyKey
 *  2. markAsPaid     → replaced by recordManualPayment Cloud Function call
 *  3. updateInvoice  → kept for safe non-financial field updates only
 *                      (notes, dueDate, etc.) – NEVER status driven by payment
 *  4. PDF helpers    → unchanged, already use Cloud Functions
 */
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { v4 as uuidv4 } from 'uuid';
import { db, functions } from '../firebase';
import { Invoice } from '../types/invoice';
import { ServiceResult } from '../types/firestore';
import { invoiceConverter } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';
import { activityService } from './activityService';

// ─── Typed collection reference ───────────────────────────────────────────────

const col = (merchantId: string) =>
  collection(db, FSPath.invoices(merchantId)).withConverter(invoiceConverter);

// ─── Real-time subscription ────────────────────────────────────────────────────

export function subscribeToInvoices(
  merchantId: string,
  callback: (invoices: Invoice[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    col(merchantId),
    where('merchantId', '==', merchantId),
    where('isArchived', '!=', true),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => d.data())),
    error => {
      handleFirestoreError(error, OperationType.LIST, FSPath.invoices(merchantId));
      onError(error);
    },
  );
}

// ─── Get single invoice ────────────────────────────────────────────────────────

export async function getInvoice(
  merchantId: string,
  invoiceId: string,
): Promise<ServiceResult<Invoice>> {
  const path = FSPath.invoice(merchantId, invoiceId);
  try {
    const snap = await getDoc(doc(db, path).withConverter(invoiceConverter));
    if (!snap.exists()) {
      return { ok: false, error: { code: 'not-found', message: 'Invoice not found', path, operation: 'get' } };
    }
    return { ok: true, data: snap.data() };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'get', raw: e } };
  }
}

// ─── Create invoice via Cloud Function (idempotent) ───────────────────────────
// idempotencyKey is generated here per call.
// On network retry the server returns the existing invoiceId safely.

export async function createInvoice(
  merchantId: string,
  invoiceData: Omit<Invoice, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<{ invoiceId: string; alreadyCreated: boolean }>> {
  const path = FSPath.invoices(merchantId);
  try {
    const createFn = httpsCallable<
      Record<string, unknown>,
      { invoiceId: string; alreadyCreated: boolean }
    >(functions, 'createInvoice');

    const response = await createFn({
      ...invoiceData,
      merchantId,
      idempotencyKey: uuidv4(), // NEW: unique per form submission
    });
    return { ok: true, data: response.data };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'create', raw: e } };
  }
}

// ─── Update invoice (safe fields only) ────────────────────────────────────────
// Only use this for non-financial fields: notes, dueDate, customerName, items
// that don't change totalAmount.
// For payment status changes → use recordManualPayment below.

export async function updateInvoice(
  merchantId: string,
  invoiceId: string,
  data: Partial<Omit<Invoice, 'id' | 'merchantId' | 'createdAt' | 'invoiceNumber' | 'paidAmount' | 'balanceDue' | 'status'>>,
): Promise<ServiceResult<void>> {
  const path = FSPath.invoice(merchantId, invoiceId);
  try {
    await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() });

    // Log activity if meaningful fields changed
    if (data.totalAmount !== undefined) {
      const snap = await getDoc(doc(db, path).withConverter(invoiceConverter));
      if (snap.exists()) {
        const inv = snap.data();
        await activityService.logActivity(
          merchantId,
          'invoice_updated',
          `Updated invoice #${inv.invoiceNumber}`,
          { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, customerId: inv.customerId },
        );
      }
    }
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

// ─── Soft-delete invoice ───────────────────────────────────────────────────────

export async function archiveInvoice(
  merchantId: string,
  invoiceId: string,
): Promise<ServiceResult<void>> {
  const path = FSPath.invoice(merchantId, invoiceId);
  try {
    await updateDoc(doc(db, path), { isArchived: true, updatedAt: serverTimestamp() });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

// ─── Record payment via Cloud Function (idempotent) ───────────────────────────
// REPLACES the old markAsPaid which wrote directly to Firestore.
// The server handles: invoice balance update + customer balance + activity log
// + dashboard snapshot refresh — all in one transaction.

export interface RecordPaymentInput {
  merchantId:       string;
  customerId:       string;
  customerName:     string;
  invoiceId:        string;
  invoiceNumber?:   string;
  amount:           number;
  method:           string;
  referenceNumber?: string;
  notes?:           string;
  paymentDate?:     string; // ISO string
}

export async function recordManualPayment(
  input: RecordPaymentInput,
): Promise<ServiceResult<{ paymentId: string; alreadyRecorded: boolean }>> {
  try {
    const fn = httpsCallable<
      RecordPaymentInput & { idempotencyKey: string },
      { success: boolean; paymentId: string; alreadyRecorded: boolean }
    >(functions, 'recordManualPayment');

    const response = await fn({ ...input, idempotencyKey: uuidv4() });
    return { ok: true, data: response.data };
  } catch (e: any) {
    return {
      ok: false,
      error: { code: e.code ?? 'unknown', message: e.message, path: null, operation: 'update', raw: e },
    };
  }
}

// ─── PDF helpers (Cloud Function calls) ───────────────────────────────────────

export async function generatePdf(
  invoiceId: string,
): Promise<ServiceResult<{ success: boolean; storagePath: string }>> {
  try {
    const fn = httpsCallable<
      { invoiceId: string },
      { success: boolean; storagePath: string }
    >(functions, 'generateInvoicePdf');
    return { ok: true, data: (await fn({ invoiceId })).data };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: null, operation: 'get', raw: e } };
  }
}

export async function getPdfUrl(
  invoiceId: string,
): Promise<ServiceResult<{ url: string }>> {
  try {
    const fn = httpsCallable<{ invoiceId: string }, { url: string }>(functions, 'getInvoicePdfUrl');
    return { ok: true, data: (await fn({ invoiceId })).data };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: null, operation: 'get', raw: e } };
  }
}

// ─── Namespace export (backward-compatible) ───────────────────────────────────
// markAsPaid is intentionally REMOVED from this namespace.
// Any component using invoiceService.markAsPaid must be updated to call
// invoiceService.recordManualPayment instead.

export const invoiceService = {
  getInvoicesPath:     FSPath.invoices,
  subscribeToInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  archiveInvoice,
  recordManualPayment, // replaces markAsPaid
  generatePdf,
  getPdfUrl,
};