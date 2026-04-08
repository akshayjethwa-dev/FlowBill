import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { Order } from '../types/order';
import { ServiceResult } from '../types/firestore';
import { orderConverter, withTimestamps } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';
import { activityService } from './activityService';

const col = (merchantId: string) =>
  collection(db, FSPath.orders(merchantId)).withConverter(orderConverter);

export function subscribeToOrders(
  merchantId: string,
  callback: (orders: Order[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    col(merchantId),
    where('merchantId', '==', merchantId),
    where('isArchived', '!=', true),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => d.data())),
    error => {
      handleFirestoreError(error, OperationType.LIST, FSPath.orders(merchantId));
      onError(error);
    },
  );
}

export async function getOrder(
  merchantId: string,
  orderId: string,
): Promise<ServiceResult<Order>> {
  const path = FSPath.order(merchantId, orderId);
  try {
    const snap = await getDoc(doc(db, path).withConverter(orderConverter));
    if (!snap.exists()) {
      return { ok: false, error: { code: 'not-found', message: 'Order not found', path, operation: 'get' } };
    }
    return { ok: true, data: snap.data() };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'get', raw: e } };
  }
}

export async function addOrder(
  merchantId: string,
  orderData: Omit<Order, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<Order>> {
  const path = FSPath.orders(merchantId);
  try {
    const orderRef = doc(col(merchantId));
    const orderNumber = orderData.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
    const newOrder = withTimestamps<Order>(
      { ...orderData, orderNumber, id: orderRef.id, merchantId, isArchived: false },
      true,
    ) as Order;

    await setDoc(orderRef, newOrder);
    await activityService.logActivity(
      merchantId,
      'order_created',
      `Created order #${orderNumber} for ${orderData.customerName}`,
      { orderId: orderRef.id, orderNumber, customerId: orderData.customerId, customerName: orderData.customerName, amount: orderData.totalAmount },
    );
    return { ok: true, data: newOrder };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'create', raw: e } };
  }
}

export async function updateOrder(
  merchantId: string,
  orderId: string,
  data: Partial<Omit<Order, 'id' | 'merchantId' | 'createdAt' | 'orderNumber'>>,
): Promise<ServiceResult<void>> {
  const path = FSPath.order(merchantId, orderId);
  try {
    await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() });
    if (data.status) {
      const snap = await getDoc(doc(db, path).withConverter(orderConverter));
      if (snap.exists()) {
        const order = snap.data();
        await activityService.logActivity(
          merchantId,
          'order_updated',
          `Updated order #${order.orderNumber} status to ${data.status}`,
          { orderId: order.id, orderNumber: order.orderNumber, status: data.status },
        );
      }
    }
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

export async function deleteOrder(
  merchantId: string,
  orderId: string,
): Promise<ServiceResult<void>> {
  return updateOrder(merchantId, orderId, { isArchived: true });
}

export async function convertToEstimate(
  merchantId: string,
  orderId: string,
): Promise<ServiceResult<{ estimateId: string }>> {
  try {
    const fn = httpsCallable(functions, 'convertOrderToEstimate');
    const response = await fn({ sourceId: orderId, merchantId });
    const data = response.data as { estimateId: string; message?: string };
    if (data.message === 'Already converted') console.warn('Idempotency: Order already converted.');
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: FSPath.orders(merchantId), operation: 'update', raw: e } };
  }
}

export const orderService = {
  getOrdersPath: FSPath.orders,
  subscribeToOrders,
  getOrder,
  addOrder,
  updateOrder,
  deleteOrder,
  convertToEstimate,
};