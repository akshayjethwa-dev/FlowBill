import { 
  collection, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  getDoc,
  runTransaction,
  increment
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../firebase';
import { Payment, Invoice } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const COLLECTION_NAME = 'payments';

export const paymentService = {
  getPaymentsPath: (merchantId: string) => `merchants/${merchantId}/${COLLECTION_NAME}`,

  subscribeToPayments: (
    merchantId: string, 
    callback: (payments: Payment[]) => void,
    onError: (error: any) => void
  ) => {
    const path = paymentService.getPaymentsPath(merchantId);
    const q = query(collection(db, path), orderBy('paymentDate', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
      callback(payments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    });
  },

  recordPayment: async (merchantId: string, paymentData: Omit<Payment, 'id' | 'merchantId' | 'createdAt'>) => {
    try {
      const functions = getFunctions(db.app, 'asia-south1');
      const recordManualPayment = httpsCallable(functions, 'recordManualPayment');
      
      const payload = {
        merchantId,
        ...paymentData,
        // Cloud functions handle ISO strings reliably over HTTP limits
        paymentDate: paymentData.paymentDate instanceof Date ? paymentData.paymentDate.toISOString() : paymentData.paymentDate
      };
      
      const result = await recordManualPayment(payload);
      return result.data;
    } catch (error: any) {
      console.error("Payment recording failed:", error);
      throw new Error(error.message || "Failed to record payment");
    }
  },

  deletePayment: async (merchantId: string, payment: Payment) => {
    const path = paymentService.getPaymentsPath(merchantId);
    const paymentRef = doc(db, path, payment.id);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Reverse invoice updates if applicable
        if (payment.invoiceId) {
          const invoicePath = `merchants/${merchantId}/invoices/${payment.invoiceId}`;
          const invoiceRef = doc(db, invoicePath);
          const invoiceSnap = await transaction.get(invoiceRef);

          if (invoiceSnap.exists()) {
            const invoice = invoiceSnap.data() as Invoice;
            const newPaidAmount = Math.max(0, (invoice.paidAmount || 0) - payment.amount);
            
            let newStatus: Invoice['status'] = 'unpaid';
            if (newPaidAmount > 0 && newPaidAmount < invoice.totalAmount) {
              newStatus = 'partial';
            } else if (newPaidAmount >= invoice.totalAmount) {
              newStatus = 'paid';
            }

            transaction.update(invoiceRef, {
              paidAmount: newPaidAmount,
              status: newStatus
            });
          }
        }

        // 2. Reverse customer outstanding amount
        const customerPath = `merchants/${merchantId}/customers/${payment.customerId}`;
        const customerRef = doc(db, customerPath);
        transaction.update(customerRef, {
          outstandingAmount: increment(payment.amount)
        });

        // 3. Delete the payment record
        transaction.delete(paymentRef);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }
};