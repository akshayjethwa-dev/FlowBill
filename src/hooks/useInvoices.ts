import { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { invoiceService } from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';

// invoiceNumber is omitted — the Cloud Function generates it atomically server-side
export type CreateInvoicePayload = Omit<
  Invoice,
  'id' | 'merchantId' | 'createdAt' | 'updatedAt' | 'invoiceNumber'
>;

// ─── useInvoices — list + mutations ──────────────────────────────────────────

export const useInvoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = invoiceService.subscribeToInvoices(
      user.uid,
      (data: Invoice[]) => {
        setInvoices(data);
        setLoading(false);
      },
      (_err: Error) => {
        setError('Failed to load invoices. Please check your permissions.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const createInvoice = async (invoiceData: CreateInvoicePayload) => {
    if (!user) return;
    // Safe cast: invoiceNumber excluded intentionally — filled by Cloud Function
    return await invoiceService.createInvoice(
      user.uid,
      invoiceData as Omit<Invoice, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
    );
  };

  const updateInvoice = async (invoiceId: string, invoiceData: Partial<Invoice>) => {
    if (!user) return;
    return await invoiceService.updateInvoice(user.uid, invoiceId, invoiceData);
  };

  // FIX: old code called invoiceService.deleteInvoice which does NOT exist.
  // The correct method name is archiveInvoice (soft-delete via isArchived flag).
  // This was the root cause — TypeScript resolves the namespace object without
  // deleteInvoice, so markAsPaid also appeared "missing" in the error message.
  const deleteInvoice = async (invoiceId: string) => {
    if (!user) return;
    return await invoiceService.archiveInvoice(user.uid, invoiceId);
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
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user || !invoiceId) {
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        // FIX: getInvoice now returns ServiceResult<Invoice> (after our backend update).
        // Must unwrap .data before calling setInvoice — passing the raw result caused E4.
        const result = await invoiceService.getInvoice(user.uid, invoiceId);
        if (result.ok) {
          setInvoice(result.data);
        } else {
          setError(result.error?.message ?? 'Failed to fetch invoice details.');
          setInvoice(null);
        }
      } catch (_err) {
        setError('Failed to fetch invoice details.');
        setInvoice(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [user, invoiceId]);

  return { invoice, loading, error };
};