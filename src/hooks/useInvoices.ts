import { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { invoiceService } from '../services/invoiceService';
import { useAuth } from './useAuth'; // ✅ correct path (not ../context/AuthContext)

// ─── Input type for creating an invoice ──────────────────────────────────────

type CreateInvoiceData = Omit<Invoice, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>;

// ─── useInvoices — list + mutations ──────────────────────────────────────────

export const useInvoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = invoiceService.subscribeToInvoices(
      user.uid,
      (data) => {
        setInvoices(data);
        setLoading(false);
      },
      (_err) => {
        setError('Failed to load invoices. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const createInvoice = async (invoiceData: CreateInvoiceData) => {
    if (!user) return;
    return await invoiceService.createInvoice(user.uid, invoiceData);
  };

  const updateInvoice = async (invoiceId: string, invoiceData: Partial<Invoice>) => {
    if (!user) return;
    return await invoiceService.updateInvoice(user.uid, invoiceId, invoiceData);
  };

  const deleteInvoice = async (invoiceId: string) => {
    if (!user) return;
    return await invoiceService.deleteInvoice(user.uid, invoiceId);
  };

  const markAsPaid = async (invoiceId: string, amount?: number) => {
    if (!user) return;
    return await invoiceService.markAsPaid(user.uid, invoiceId, amount);
  };

  return {
    invoices,
    loading,
    error,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markAsPaid,
  };
};

// ─── useInvoice — single invoice fetch ───────────────────────────────────────

export const useInvoice = (invoiceId: string | undefined) => {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !invoiceId) {
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        const data = await invoiceService.getInvoice(user.uid, invoiceId);
        setInvoice(data);
      } catch (_err) {
        setError('Failed to fetch invoice details.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [user, invoiceId]);

  return { invoice, loading, error };
};