import { useState, useEffect } from 'react';
import { Customer } from '../types';
import { customerService } from '../services/customerService';
import { useAuth } from '../context/AuthContext';

export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // FIX Error2: was subscribeToCustomers → correct name is subscribeCustomers
    const unsubscribe = customerService.subscribeCustomers(
      user.uid,
      // FIX Error3: explicit type on data param (was implicitly any)
      (data: Customer[]) => {
        setCustomers(data);
        setLoading(false);
      },
      // FIX Error4: explicit type on err param (was implicitly any)
      (_err: Error) => {
        setError('Failed to load customers. Please check your permissions.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // FIX Error5: was addCustomer → correct name is createCustomer
  // FIX Error1: input type is Omit<Customer,...> not missing CustomerData type
  const addCustomer = async (
    customerData: Omit<Customer, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!user) return;
    return await customerService.createCustomer(user.uid, customerData);
  };

  const updateCustomer = async (
    customerId: string,
    customerData: Partial<Customer>,
  ) => {
    if (!user) return;
    return await customerService.updateCustomer(user.uid, customerId, customerData);
  };

  // FIX Error6: was deleteCustomer → correct name is archiveCustomer (soft-delete)
  const deleteCustomer = async (customerId: string) => {
    if (!user) return;
    return await customerService.archiveCustomer(user.uid, customerId);
  };

  return { customers, loading, error, addCustomer, updateCustomer, deleteCustomer };
};