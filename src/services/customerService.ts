import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Customer } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';
import { activityService } from './activityService';

const COLLECTION_NAME = 'customers';

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

  addCustomer: async (merchantId: string, customerData: Omit<Customer, 'id' | 'merchantId' | 'createdAt'>) => {
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
      
      // Log activity
      await activityService.logActivity(
        merchantId,
        "customer_added",
        `Added new customer: ${newCustomer.name}`,
        {
          customerId: newCustomer.id,
          customerName: newCustomer.name,
          phone: newCustomer.phone
        }
      );
      
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
