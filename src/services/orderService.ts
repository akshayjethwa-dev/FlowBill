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
import { db } from '../firebase';
import { Order } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';
import { activityService } from './activityService';

const COLLECTION_NAME = 'orders';

export const orderService = {
  getOrdersPath: (merchantId: string) => `merchants/${merchantId}/${COLLECTION_NAME}`,

  subscribeToOrders: (
    merchantId: string, 
    callback: (orders: Order[]) => void,
    onError: (error: any) => void
  ) => {
    const path = orderService.getOrdersPath(merchantId);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

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
    
    // Generate Order Number if not provided
    const orderNumber = orderData.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
    
    const newOrder: Order = {
      ...orderData,
      orderNumber,
      id: orderRef.id,
      merchantId,
      createdAt: serverTimestamp() as any,
    };

    try {
      await setDoc(orderRef, newOrder);
      
      // Log activity
      await activityService.logActivity(
        merchantId,
        "order_created",
        `Created order #${newOrder.orderNumber} for ${newOrder.customerName}`,
        {
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          customerId: newOrder.customerId,
          customerName: newOrder.customerName,
          amount: newOrder.totalAmount
        }
      );
      
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
      await updateDoc(orderRef, {
        ...orderData,
        updatedAt: serverTimestamp()
      });
      
      // Log status updates if applicable
      if (orderData.status) {
        const docSnap = await getDoc(orderRef);
        if (docSnap.exists()) {
          const order = docSnap.data() as Order;
          await activityService.logActivity(
            merchantId,
            "order_updated",
            `Updated order #${order.orderNumber} status to ${orderData.status}`,
            {
              orderId: order.id,
              orderNumber: order.orderNumber,
              status: orderData.status
            }
          );
        }
      }
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