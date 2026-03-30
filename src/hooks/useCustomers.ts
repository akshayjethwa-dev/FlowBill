import { useState, useEffect, useCallback } from "react";
import { Customer } from "../types";                          // ✅ ONLY source of Customer
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  CustomerData,
} from "../services/customerService";

// ─── State shape ──────────────────────────────────────────────────────────────

interface UseCustomersState {
  customers: Customer[];   // ✅ from types/customer.ts
  loading: boolean;
  error: string | null;
}

interface UseCustomersReturn extends UseCustomersState {
  refetch: () => Promise<void>;
  addCustomer: (data: CustomerData) => Promise<string>;
  editCustomer: (id: string, data: Partial<CustomerData>) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCustomers(merchantId: string | null): UseCustomersReturn {
  const [state, setState] = useState<UseCustomersState>({
    customers: [],
    loading: false,
    error: null,
  });

  const fetchCustomers = useCallback(async () => {
    if (!merchantId) {
      setState({ customers: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await listCustomers(merchantId);
      setState({ customers: data as Customer[], loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load customers";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [merchantId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = useCallback(
    async (data: CustomerData): Promise<string> => {
      if (!merchantId) throw new Error("No merchant authenticated");
      const newId = await createCustomer(merchantId, data);
      await fetchCustomers();
      return newId;
    },
    [merchantId, fetchCustomers]
  );

  const editCustomer = useCallback(
    async (id: string, data: Partial<CustomerData>): Promise<void> => {
      if (!merchantId) throw new Error("No merchant authenticated");
      await updateCustomer(merchantId, id, data);
      await fetchCustomers();
    },
    [merchantId, fetchCustomers]
  );

  return { ...state, refetch: fetchCustomers, addCustomer, editCustomer };
}