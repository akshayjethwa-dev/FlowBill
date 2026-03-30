import { useState, useEffect } from 'react';
import { Customer } from '../types';
import { customerService } from '../services/customerService';
import { useAuth } from '../context/AuthContext';

export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = customerService.subscribeToCustomers(
      user.uid,
      (data) => {
        setCustomers(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load customers. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'merchantId' | 'createdAt'>) => {
    if (!user) return;
    return await customerService.addCustomer(user.uid, customerData);
  };

  const updateCustomer = async (customerId: string, customerData: Partial<Customer>) => {
    if (!user) return;
    return await customerService.updateCustomer(user.uid, customerId, customerData);
  };

  const deleteCustomer = async (customerId: string) => {
    if (!user) return;
    return await customerService.deleteCustomer(user.uid, customerId);
  };

  return { customers, loading, error, addCustomer, updateCustomer, deleteCustomer };
};
