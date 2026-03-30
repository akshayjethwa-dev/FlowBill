import { useState, useEffect } from 'react';
import { Order } from '../types';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';

export const useOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = orderService.subscribeToOrders(
      user.uid,
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load orders. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addOrder = async (orderData: Omit<Order, 'id' | 'merchantId' | 'createdAt'>) => {
    if (!user) return;
    return await orderService.addOrder(user.uid, orderData);
  };

  const updateOrder = async (orderId: string, orderData: Partial<Order>) => {
    if (!user) return;
    return await orderService.updateOrder(user.uid, orderId, orderData);
  };

  const deleteOrder = async (orderId: string) => {
    if (!user) return;
    return await orderService.deleteOrder(user.uid, orderId);
  };

  return { orders, loading, error, addOrder, updateOrder, deleteOrder };
};
