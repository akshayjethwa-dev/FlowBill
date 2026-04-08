import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { Invoice } from '../types/invoice';
import { ServiceResult } from '../types/firestore';
import { invoiceConverter, withTimestamps } from '../lib/models/converters';
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

// ─── Create invoice via Cloud Function ────────────────────────────────────────
// Delegated to backend to generate invoiceNumber atomically.

export async function createInvoice(
  merchantId: string,
  invoiceData: Omit<Invoice, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<{ invoiceId: string }>> {
  const path = FSPath.invoices(merchantId);
  try {
    const createFn = httpsCallable(functions, 'createInvoice');
    const response = await createFn({ ...invoiceData, merchantId });
    return { ok: true, data: response.data as { invoiceId: string } };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'create', raw: e } };
  }
}

// ─── Update invoice ────────────────────────────────────────────────────────────

export async function updateInvoice(
  merchantId: string,
  invoiceId: string,
  data: Partial<Omit<Invoice, 'id' | 'merchantId' | 'createdAt' | 'invoiceNumber'>>,
): Promise<ServiceResult<void>> {
  const path = FSPath.invoice(merchantId, invoiceId);
  try {
    await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() });

    if (data.status || data.totalAmount !== undefined) {
      const snap = await getDoc(doc(db, path).withConverter(invoiceConverter));
      if (snap.exists()) {
        const inv = snap.data();
        await activityService.logActivity(
          merchantId,
          'invoice_updated',
          `Updated invoice #${inv.invoiceNumber} — status: ${inv.status}`,
          { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, customerId: inv.customerId, status: inv.status },
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
  return updateInvoice(merchantId, invoiceId, { isArchived: true });
}

// ─── Mark as paid (partial or full) ───────────────────────────────────────────

export async function markAsPaid(
  merchantId: string,
  invoiceId: string,
  amount?: number,
): Promise<ServiceResult<void>> {
  const path = FSPath.invoice(merchantId, invoiceId);
  try {
    const snap = await getDoc(doc(db, path).withConverter(invoiceConverter));
    if (!snap.exists()) {
      return { ok: false, error: { code: 'not-found', message: 'Invoice not found', path, operation: 'update' } };
    }
    const inv = snap.data();
    const newPaidAmount = amount ? (inv.paidAmount || 0) + amount : inv.totalAmount;
    const newBalance = Math.max(0, inv.totalAmount - newPaidAmount);
    const newStatus: Invoice['status'] = newPaidAmount >= inv.totalAmount ? 'paid' : 'partial';

    await updateDoc(doc(db, path), {
      paidAmount: newPaidAmount,
      balanceAmount: newBalance,
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

// ─── PDF helpers (Cloud Function calls) ───────────────────────────────────────

export async function generatePdf(invoiceId: string): Promise<ServiceResult<unknown>> {
  try {
    const fn = httpsCallable(functions, 'generateInvoicePdf');
    return { ok: true, data: (await fn({ invoiceId })).data };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: null, operation: 'get', raw: e } };
  }
}

export async function getPdfUrl(invoiceId: string): Promise<ServiceResult<{ url: string }>> {
  try {
    const fn = httpsCallable(functions, 'getInvoicePdfUrl');
    return { ok: true, data: (await fn({ invoiceId })).data as { url: string } };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: null, operation: 'get', raw: e } };
  }
}

// ─── Namespace export (backward-compatible) ───────────────────────────────────

export const invoiceService = {
  getInvoicesPath: FSPath.invoices,
  subscribeToInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  archiveInvoice,
  markAsPaid,
  generatePdf,
  getPdfUrl,
};