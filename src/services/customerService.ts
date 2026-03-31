import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Customer } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const COLLECTION_NAME = 'customers';

export type CustomerData = Omit<Customer, 'id' | 'merchantId' | 'createdAt'>;

export const customerService = {
  getCustomersPath: (merchantId: string) => `merchants/${merchantId}/${COLLECTION_NAME}`,

  subscribeToCustomers: (
    merchantId: string, 
    callback: (customers: Customer[]) => void,
    onError: (error: any) => void
  ) => {
    const path = customerService.getCustomersPath(merchantId);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      callback(customers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    });
  },

  addCustomer: async (merchantId: string, customerData: CustomerData) => {
    const path = customerService.getCustomersPath(merchantId);
    const customerRef = doc(collection(db, path));
    const newCustomer: Customer = {
      ...customerData,
      id: customerRef.id,
      merchantId,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(customerRef, newCustomer);
      return newCustomer;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  updateCustomer: async (merchantId: string, customerId: string, customerData: Partial<Customer>) => {
    const path = customerService.getCustomersPath(merchantId);
    const customerRef = doc(db, path, customerId);

    try {
      await updateDoc(customerRef, customerData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  deleteCustomer: async (merchantId: string, customerId: string) => {
    const path = customerService.getCustomersPath(merchantId);
    const customerRef = doc(db, path, customerId);

    try {
      await deleteDoc(customerRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }
};