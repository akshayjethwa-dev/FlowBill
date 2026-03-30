import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDoc,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Payment, Invoice } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';
import { activityService } from './activityService';

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
    const path = paymentService.getPaymentsPath(merchantId);
    const paymentRef = doc(collection(db, path));
    
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Create the payment record
        const newPayment: Payment = {
          ...paymentData,
          id: paymentRef.id,
          merchantId,
          createdAt: serverTimestamp(),
        };
        transaction.set(paymentRef, newPayment);

        // 2. If linked to an invoice, update the invoice's paidAmount and status
        if (paymentData.invoiceId) {
          const invoicePath = `merchants/${merchantId}/invoices/${paymentData.invoiceId}`;
          const invoiceRef = doc(db, invoicePath);
          const invoiceSnap = await transaction.get(invoiceRef);

          if (invoiceSnap.exists()) {
            const invoice = invoiceSnap.data() as Invoice;
            const newPaidAmount = (invoice.paidAmount || 0) + paymentData.amount;
            
            let newStatus: Invoice['status'] = 'partial';
            if (newPaidAmount >= invoice.totalAmount) {
              newStatus = 'paid';
            }

            transaction.update(invoiceRef, {
              paidAmount: newPaidAmount,
              status: newStatus
            });
          }
        }

        // 3. Update customer outstanding amount
        const customerPath = `merchants/${merchantId}/customers/${paymentData.customerId}`;
        const customerRef = doc(db, customerPath);
        transaction.update(customerRef, {
          outstandingAmount: increment(-paymentData.amount)
        });

        // 4. Log activity
        const activitiesRef = collection(db, "merchants", merchantId, "activities");
        const activityRef = doc(activitiesRef);
        transaction.set(activityRef, {
          merchantId,
          type: "payment_marked",
          description: `Recorded payment of ₹${paymentData.amount.toLocaleString()} from ${paymentData.customerName}`,
          metadata: {
            paymentId: paymentRef.id,
            customerId: paymentData.customerId,
            customerName: paymentData.customerName,
            invoiceId: paymentData.invoiceId,
            invoiceNumber: paymentData.invoiceNumber,
            amount: paymentData.amount,
            method: paymentData.method
          },
          userId: auth.currentUser?.uid,
          userName: auth.currentUser?.displayName || "Unknown User",
          createdAt: serverTimestamp()
        });
      });

      return paymentRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
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
