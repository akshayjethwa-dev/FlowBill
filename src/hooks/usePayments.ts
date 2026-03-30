import { useState, useEffect } from 'react';
import { Payment } from '../types';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../context/AuthContext';

export const usePayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = paymentService.subscribeToPayments(
      user.uid,
      (data) => {
        setPayments(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load payments. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const recordPayment = async (paymentData: Omit<Payment, 'id' | 'merchantId' | 'createdAt'>) => {
    if (!user) return;
    return await paymentService.recordPayment(user.uid, paymentData);
  };

  const deletePayment = async (payment: Payment) => {
    if (!user) return;
    return await paymentService.deletePayment(user.uid, payment);
  };

  return { 
    payments, 
    loading, 
    error, 
    recordPayment, 
    deletePayment 
  };
};
