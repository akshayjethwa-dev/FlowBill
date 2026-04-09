import { useState, useEffect } from 'react';
import { Estimate, Order } from '../types';
import { estimateService } from '../services/estimateService';
import { convertOrderToEstimate } from '../services/conversionsService';
import { useAuth } from '../context/AuthContext';

export const useEstimates = () => {
  const { user } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = estimateService.subscribeToEstimates(
      user.uid,
      (data: Estimate[]) => {
        setEstimates(data);
        setLoading(false);
      },
      (_err: Error) => {
        setError('Failed to load estimates. Please check your permissions.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const createEstimate = async (
    estimateData: Omit<Estimate, 'id' | 'merchantId' | 'createdAt'>,
  ) => {
    if (!user) return;
    return await estimateService.createEstimate(user.uid, estimateData);
  };

  // FIX Error1: estimateService.createEstimateFromOrder does not exist.
  // This operation is now handled by the idempotent Cloud Function
  // convertOrderToEstimate (functions/src/conversions.ts).
  // We call the frontend service wrapper from conversionsService.ts.
  const createEstimateFromOrder = async (order: Order) => {
    if (!user) return;
    return await convertOrderToEstimate(order.id);
  };

  const updateEstimate = async (
    estimateId: string,
    estimateData: Partial<Estimate>,
  ) => {
    if (!user) return;
    return await estimateService.updateEstimate(user.uid, estimateId, estimateData);
  };

  const deleteEstimate = async (estimateId: string) => {
    if (!user) return;
    return await estimateService.deleteEstimate(user.uid, estimateId);
  };

  const convertToInvoice = async (estimateId: string) => {
    if (!user) return;
    return await estimateService.convertToInvoice(user.uid, estimateId);
  };

  return {
    estimates,
    loading,
    error,
    createEstimate,
    createEstimateFromOrder,
    updateEstimate,
    deleteEstimate,
    convertToInvoice,
  };
};

// ── useEstimate (single record) ────────────────────────────────────────────────

export const useEstimate = (estimateId: string | undefined) => {
  const { user } = useAuth();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!user || !estimateId) return;

    const fetchEstimate = async () => {
      try {
        // FIX Error2: getEstimate returns ServiceResult<Estimate>, not Estimate.
        // Must unwrap .data before calling setEstimate.
        const result = await estimateService.getEstimate(user.uid, estimateId);
        if (result.ok) {
          setEstimate(result.data);   // result.data is Estimate — correct type
        } else {
          setError(result.error?.message ?? 'Failed to fetch estimate details.');
          setEstimate(null);
        }
      } catch (err) {
        setError('Failed to fetch estimate details.');
        setEstimate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEstimate();
  }, [user, estimateId]);

  return { estimate, loading, error };
};