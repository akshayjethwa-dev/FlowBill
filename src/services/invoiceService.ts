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
  runTransaction
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; // ✅ Imported this
import { db, functions } from '../firebase';       // ✅ Added functions import
import { Invoice, Order, Estimate } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';
import { activityService } from './activityService';

const COLLECTION_NAME = 'invoices';

export const invoiceService = {
  getInvoicesPath: (merchantId: string) => `merchants/${merchantId}/${COLLECTION_NAME}`,

  subscribeToInvoices: (
    merchantId: string, 
    callback: (invoices: Invoice[]) => void,
    onError: (error: any) => void
  ) => {
    const path = invoiceService.getInvoicesPath(merchantId);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      callback(invoices);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    });
  },

  getInvoice: async (merchantId: string, invoiceId: string) => {
    const path = invoiceService.getInvoicesPath(merchantId);
    const invoiceRef = doc(db, path, invoiceId);
    try {
      const docSnap = await getDoc(invoiceRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Invoice;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  },

  // ✅ UPDATED: Now calls the Cloud Function instead of client-side Firestore
  createInvoice: async (merchantId: string, invoiceData: any) => {
    const path = invoiceService.getInvoicesPath(merchantId);
    try {
      const createFn = httpsCallable(functions, 'createInvoice');
      const response = await createFn(invoiceData);
      
      // Return the payload containing the newly generated invoiceId
      return response.data as { invoiceId: string }; 
    } catch (error) {
      console.error("Failed to call backend createInvoice:", error);
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  updateInvoice: async (merchantId: string, invoiceId: string, invoiceData: Partial<Invoice>) => {
    const path = invoiceService.getInvoicesPath(merchantId);
    const invoiceRef = doc(db, path, invoiceId);

    try {
      await updateDoc(invoiceRef, invoiceData);
      
      if (invoiceData.status || invoiceData.totalAmount) {
        const docSnap = await getDoc(invoiceRef);
        if (docSnap.exists()) {
          const invoice = docSnap.data() as Invoice;
          await activityService.logActivity(
            merchantId,
            "invoice_updated",
            `Updated invoice #${invoice.invoiceNumber} status to ${invoice.status}`,
            {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerId: invoice.customerId,
              customerName: invoice.customerName,
              status: invoice.status
            }
          );
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  deleteInvoice: async (merchantId: string, invoiceId: string) => {
    const path = invoiceService.getInvoicesPath(merchantId);
    const invoiceRef = doc(db, path, invoiceId);

    try {
      await deleteDoc(invoiceRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  markAsPaid: async (merchantId: string, invoiceId: string, amount?: number) => {
    const path = invoiceService.getInvoicesPath(merchantId);
    const invoiceRef = doc(db, path, invoiceId);

    try {
      const docSnap = await getDoc(invoiceRef);
      if (!docSnap.exists()) throw new Error('Invoice not found');
      
      const invoice = docSnap.data() as Invoice;
      const newPaidAmount = amount ? (invoice.paidAmount || 0) + amount : invoice.totalAmount;
      const newStatus = newPaidAmount >= invoice.totalAmount ? 'paid' : 'partial';

      await updateDoc(invoiceRef, {
        paidAmount: newPaidAmount,
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  // ✅ ADDED: Trigger PDF Generation via Cloud Functions
  generatePdf: async (invoiceId: string) => {
    try {
      const generateFn = httpsCallable(functions, 'generateInvoicePdf');
      const response = await generateFn({ invoiceId });
      return response.data;
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      throw error;
    }
  },

  // ✅ ADDED: Fetch the secure Signed URL to download/view the PDF
  getPdfUrl: async (invoiceId: string) => {
    try {
      const getUrlFn = httpsCallable(functions, 'getInvoicePdfUrl');
      const response = await getUrlFn({ invoiceId });
      return response.data as { url: string };
    } catch (error) {
      console.error("Failed to get PDF URL:", error);
      throw error;
    }
  }
};