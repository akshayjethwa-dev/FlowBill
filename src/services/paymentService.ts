import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  increment,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { Payment } from '../types/payment';
import { Invoice } from '../types/invoice';
import { ServiceResult } from '../types/firestore';
import { paymentConverter } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const col = (merchantId: string) =>
  collection(db, FSPath.payments(merchantId)).withConverter(paymentConverter);

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

// Payment recording goes through backend to atomically update
// invoice.paidAmount + invoice.status + customer.outstandingAmount
export async function recordPayment(
  merchantId: string,
  paymentData: Omit<Payment, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<unknown>> {
  try {
    const fns = getFunctions(db.app, 'asia-south1');
    const fn = httpsCallable(fns, 'recordManualPayment');
    const payload = {
      ...paymentData,
      merchantId,
      paymentDate:
        paymentData.paymentDate instanceof Date
          ? paymentData.paymentDate.toISOString()
          : paymentData.paymentDate,
    };
    const result = await fn(payload);
    return { ok: true, data: result.data };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message ?? 'Failed to record payment', path: FSPath.payments(merchantId), operation: 'create', raw: e } };
  }
}

export async function deletePayment(
  merchantId: string,
  payment: Payment,
): Promise<ServiceResult<void>> {
  const path = FSPath.payment(merchantId, payment.id);
  try {
    await runTransaction(db, async (tx) => {
      // 1. Reverse invoice paidAmount & status
      if (payment.invoiceId) {
        const invoiceRef = doc(db, FSPath.invoice(merchantId, payment.invoiceId));
        const invoiceSnap = await tx.get(invoiceRef);
        if (invoiceSnap.exists()) {
          const inv = invoiceSnap.data() as Invoice;
          const newPaidAmount = Math.max(0, (inv.paidAmount || 0) - payment.amount);
          const newBalance = Math.max(0, inv.totalAmount - newPaidAmount);
          let newStatus: Invoice['status'] = 'unpaid';
          if (newPaidAmount > 0 && newPaidAmount < inv.totalAmount) newStatus = 'partial';
          else if (newPaidAmount >= inv.totalAmount) newStatus = 'paid';
          tx.update(invoiceRef, { paidAmount: newPaidAmount, balanceAmount: newBalance, status: newStatus, updatedAt: serverTimestamp() });
        }
      }
      // 2. Reverse customer outstandingAmount
      const customerRef = doc(db, FSPath.customer(merchantId, payment.customerId));
      tx.update(customerRef, { outstandingAmount: increment(payment.amount), updatedAt: serverTimestamp() });
      // 3. Delete the payment document
      tx.delete(doc(db, path));
    });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'delete', raw: e } };
  }
}

export const paymentService = {
  getPaymentsPath: FSPath.payments,
  subscribeToPayments,
  recordPayment,
  deletePayment,
};