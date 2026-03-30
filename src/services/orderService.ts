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
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const COLLECTION_NAME = 'orders';

export const orderService = {
  getOrdersPath: (merchantId: string) => `merchants/${merchantId}/${COLLECTION_NAME}`,

  subscribeToOrders: (
    merchantId: string, 
    callback: (orders: Order[]) => void,
    onError: (error: any) => void
  ) => {
    const path = orderService.getOrdersPath(merchantId);
    const q = query(collection(db, path), orderBy('orderDate', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    });
  },

  addOrder: async (merchantId: string, orderData: Omit<Order, 'id' | 'merchantId' | 'createdAt'>) => {
    const path = orderService.getOrdersPath(merchantId);
    const orderRef = doc(collection(db, path));
    const newOrder: Order = {
      ...orderData,
      id: orderRef.id,
      merchantId,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(orderRef, newOrder);
      return newOrder;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  updateOrder: async (merchantId: string, orderId: string, orderData: Partial<Order>) => {
    const path = orderService.getOrdersPath(merchantId);
    const orderRef = doc(db, path, orderId);

    try {
      await updateDoc(orderRef, orderData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  deleteOrder: async (merchantId: string, orderId: string) => {
    const path = orderService.getOrdersPath(merchantId);
    const orderRef = doc(db, path, orderId);

    try {
      await deleteDoc(orderRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }
};
