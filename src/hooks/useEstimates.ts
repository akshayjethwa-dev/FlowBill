import { useState, useEffect } from 'react';
import { Estimate, Order, Invoice } from '../types';
import { estimateService } from '../services/estimateService';
import { useAuth } from '../context/AuthContext';

export const useEstimates = () => {
  const { user } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = estimateService.subscribeToEstimates(
      user.uid,
      (data) => {
        setEstimates(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load estimates. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const createEstimate = async (estimateData: Omit<Estimate, 'id' | 'merchantId' | 'createdAt'>) => {
    if (!user) return;
    return await estimateService.createEstimate(user.uid, estimateData);
  };

  const createEstimateFromOrder = async (order: Order) => {
    if (!user) return;
    return await estimateService.createEstimateFromOrder(user.uid, order);
  };

  const updateEstimate = async (estimateId: string, estimateData: Partial<Estimate>) => {
    if (!user) return;
    return await estimateService.updateEstimate(user.uid, estimateId, estimateData);
  };

  const deleteEstimate = async (estimateId: string) => {
    if (!user) return;
    return await estimateService.deleteEstimate(user.uid, estimateId);
  };

  const convertToInvoice = async (estimate: Estimate) => {
    if (!user) return;
    return await estimateService.convertToInvoice(user.uid, estimate);
  };

  return { 
    estimates, 
    loading, 
    error, 
    createEstimate, 
    createEstimateFromOrder, 
    updateEstimate, 
    deleteEstimate,
    convertToInvoice
  };
};

export const useEstimate = (estimateId: string | undefined) => {
  const { user } = useAuth();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !estimateId) return;

    const fetchEstimate = async () => {
      try {
        const data = await estimateService.getEstimate(user.uid, estimateId);
        setEstimate(data);
      } catch (err) {
        setError('Failed to fetch estimate details.');
      } finally {
        setLoading(false);
      }
    };

    fetchEstimate();
  }, [user, estimateId]);

  return { estimate, loading, error };
};
