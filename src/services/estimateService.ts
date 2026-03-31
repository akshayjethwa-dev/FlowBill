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
  getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
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
      createdAt: serverTimestamp() as any,
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
    
    const estimateNumber = `EST-${Date.now().toString().slice(-6)}`;
    
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 15);

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
      createdAt: serverTimestamp() as any,
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

  // ✅ WIRED TO CLOUD FUNCTION (CONV-01)
  convertToInvoice: async (merchantId: string, estimateId: string) => {
    try {
      const convertFn = httpsCallable(functions, 'convertEstimateToInvoice');
      const response = await convertFn({ merchantId, estimateId });
      return response.data as Invoice;
    } catch (error) {
      console.error("Failed to convert estimate to invoice via backend:", error);
      throw error;
    }
  }
};