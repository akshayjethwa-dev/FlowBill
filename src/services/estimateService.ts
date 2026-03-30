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
import { db } from '../firebase';
import { Estimate, Order, Invoice } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const COLLECTION_NAME = 'estimates';

export const estimateService = {
  getEstimatesPath: (merchantId: string) => `merchants/${merchantId}/${COLLECTION_NAME}`,

  subscribeToEstimates: (
    merchantId: string, 
    callback: (estimates: Estimate[]) => void,
    onError: (error: any) => void
  ) => {
    const path = estimateService.getEstimatesPath(merchantId);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const estimates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Estimate[];
      callback(estimates);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    });
  },

  getEstimate: async (merchantId: string, estimateId: string) => {
    const path = estimateService.getEstimatesPath(merchantId);
    const estimateRef = doc(db, path, estimateId);
    try {
      const docSnap = await getDoc(estimateRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Estimate;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  },

  createEstimate: async (merchantId: string, estimateData: Omit<Estimate, 'id' | 'merchantId' | 'createdAt'>) => {
    const path = estimateService.getEstimatesPath(merchantId);
    const estimateRef = doc(collection(db, path));
    const newEstimate: Estimate = {
      ...estimateData,
      id: estimateRef.id,
      merchantId,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(estimateRef, newEstimate);
      return newEstimate;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  createEstimateFromOrder: async (merchantId: string, order: Order) => {
    const path = estimateService.getEstimatesPath(merchantId);
    const estimateRef = doc(collection(db, path));
    
    // Generate a simple estimate number (in production, use a counter)
    const estimateNumber = `EST-${Date.now().toString().slice(-6)}`;
    
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 15); // Valid for 15 days by default

    const newEstimate: Estimate = {
      id: estimateRef.id,
      merchantId,
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      estimateNumber,
      items: order.items,
      totalAmount: order.totalAmount,
      status: 'draft',
      validUntil: validUntil,
      notes: order.notes || '',
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(estimateRef, newEstimate);
      return newEstimate;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  updateEstimate: async (merchantId: string, estimateId: string, estimateData: Partial<Estimate>) => {
    const path = estimateService.getEstimatesPath(merchantId);
    const estimateRef = doc(db, path, estimateId);

    try {
      await updateDoc(estimateRef, estimateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  deleteEstimate: async (merchantId: string, estimateId: string) => {
    const path = estimateService.getEstimatesPath(merchantId);
    const estimateRef = doc(db, path, estimateId);

    try {
      await deleteDoc(estimateRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  convertToInvoice: async (merchantId: string, estimate: Estimate) => {
    const invoicePath = `merchants/${merchantId}/invoices`;
    const estimatePath = estimateService.getEstimatesPath(merchantId);
    
    const invoiceRef = doc(collection(db, invoicePath));
    const estimateRef = doc(db, estimatePath, estimate.id);
    
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Default 7 days due
    
    const newInvoice: Omit<Invoice, 'id'> = {
      merchantId,
      orderId: estimate.orderId || '',
      estimateId: estimate.id,
      customerId: estimate.customerId,
      customerName: estimate.customerName,
      invoiceNumber,
      items: estimate.items,
      totalAmount: estimate.totalAmount,
      paidAmount: 0,
      status: 'unpaid',
      dueDate,
      notes: estimate.notes || '',
      createdAt: serverTimestamp(),
    };

    try {
      await runTransaction(db, async (transaction) => {
        transaction.set(invoiceRef, { ...newInvoice, id: invoiceRef.id });
        transaction.update(estimateRef, { status: 'converted_to_invoice' });
      });
      return { ...newInvoice, id: invoiceRef.id } as Invoice;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, invoicePath);
      throw error;
    }
  }
};
