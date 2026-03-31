import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, // ✅ Added where import for archival strategy
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; // ✅ Added for calling backend functions
import { db, functions } from '../firebase';
import { Estimate } from '../types';
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
    
    // ✅ Filter out archived estimates automatically
    const q = query(
      collection(db, path), 
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc')
    );

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
      isArchived: false, // ✅ Initialize as active
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
      await updateDoc(estimateRef, {
        ...estimateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  // ✅ Soft delete instead of hard delete
  deleteEstimate: async (merchantId: string, estimateId: string) => {
    const path = estimateService.getEstimatesPath(merchantId);
    const estimateRef = doc(db, path, estimateId);

    try {
      await updateDoc(estimateRef, {
        isArchived: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  // ✅ UPDATED: Shifted responsibility entirely to the Server Function with Idempotency
  convertToInvoice: async (merchantId: string, estimateId: string): Promise<string> => {
    try {
      const convertFn = httpsCallable(functions, 'convertEstimateToInvoice');
      const response = await convertFn({ sourceId: estimateId });
      
      const data = response.data as { invoiceId: string; message?: string };
      
      if (data.message === 'Already converted') {
        console.warn('Idempotency caught: Estimate was already converted.');
      }
      
      return data.invoiceId;
    } catch (error) {
      console.error("Failed to convert estimate via backend:", error);
      handleFirestoreError(error, OperationType.UPDATE, `merchants/${merchantId}/estimates`);
      throw error;
    }
  }
};