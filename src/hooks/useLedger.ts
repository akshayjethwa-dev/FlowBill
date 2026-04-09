import { useMemo } from 'react';
import { Timestamp, FieldValue } from 'firebase/firestore';
import { useInvoices } from './useInvoices';
import { useCustomers } from './useCustomers';
import { usePayments } from './usePayments';
import {
  LedgerSummary,
  AgingBucket,
  CustomerLedgerEntry,
} from '../types';

// ─── Helper: safely convert Firestore Timestamp | FieldValue | string → Date ──
// FIX E1-E8: All errors stem from calling .toDate() or new Date() on a union
// type. This utility handles all 3 cases safely.
function toJsDate(value: Timestamp | FieldValue | string | undefined | null): Date {
  if (!value) return new Date(0);
  // Firestore Timestamp has a .toDate() method
  if (value instanceof Timestamp) return value.toDate();
  // FieldValue (serverTimestamp sentinel) cannot be converted client-side
  // — treat as epoch so aging math doesn't crash
  if (typeof value === 'object' && !('toDate' in value)) return new Date(0);
  // Plain ISO string
  if (typeof value === 'string') return new Date(value);
  return new Date(0);
}

export const useLedger = () => {
  const { invoices,  loading: invoicesLoading,  error: invoicesError  } = useInvoices();
  const { customers, loading: customersLoading, error: customersError } = useCustomers();
  const { payments,  loading: paymentsLoading,  error: paymentsError  } = usePayments();

  const loading = invoicesLoading || customersLoading || paymentsLoading;
  const error   = invoicesError   || customersError   || paymentsError;

  const ledgerData = useMemo(() => {
    if (loading || !invoices.length || !customers.length) {
      return {
        summary: {
          totalOutstanding: 0,
          overdueAmount:    0,
          agingBuckets:     [],
        } as LedgerSummary,
        customerLedger: [] as CustomerLedgerEntry[],
      };
    }

    const now = new Date();
    const unpaidInvoices = invoices.filter(
      i => i.status !== 'paid' && i.status !== 'draft',
    );

    // ── 1. Global aging buckets ─────────────────────────────────────────────
    const buckets: AgingBucket[] = [
      { label: '0-30 Days',  amount: 0, count: 0, color: 'bg-green-500'  },
      { label: '31-60 Days', amount: 0, count: 0, color: 'bg-yellow-500' },
      { label: '61-90 Days', amount: 0, count: 0, color: 'bg-orange-500' },
      { label: '90+ Days',   amount: 0, count: 0, color: 'bg-red-500'    },
    ];

    let totalOutstanding = 0;
    let overdueAmount    = 0;

    unpaidInvoices.forEach(invoice => {
      // FIX E1-E2: use toJsDate() helper instead of .toDate() directly
      const dueDate   = toJsDate(invoice.dueDate);
      const diffTime  = now.getTime() - dueDate.getTime();
      const diffDays  = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const outstanding = invoice.totalAmount - (invoice.paidAmount || 0);

      totalOutstanding += outstanding;
      if (diffDays > 0) overdueAmount += outstanding;

      if      (diffDays <= 30) { buckets[0].amount += outstanding; buckets[0].count++; }
      else if (diffDays <= 60) { buckets[1].amount += outstanding; buckets[1].count++; }
      else if (diffDays <= 90) { buckets[2].amount += outstanding; buckets[2].count++; }
      else                     { buckets[3].amount += outstanding; buckets[3].count++; }
    });

    // ── 2. Customer-level ledger ────────────────────────────────────────────
    const customerLedger: CustomerLedgerEntry[] = customers
      .map(customer => {
        const customerInvoices = unpaidInvoices.filter(
          i => i.customerId === customer.id,
        );
        const customerPayments = payments.filter(
          p => p.customerId === customer.id,
        );

        const customerBuckets = { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
        let customerOverdue = 0;

        customerInvoices.forEach(inv => {
          // FIX E3-E4: use toJsDate() helper
          const dueDate   = toJsDate(inv.dueDate);
          const diffTime  = now.getTime() - dueDate.getTime();
          const diffDays  = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const outstanding = inv.totalAmount - (inv.paidAmount || 0);

          if (diffDays > 0) customerOverdue += outstanding;

          if      (diffDays <= 30) customerBuckets['0_30']    += outstanding;
          else if (diffDays <= 60) customerBuckets['31_60']   += outstanding;
          else if (diffDays <= 90) customerBuckets['61_90']   += outstanding;
          else                     customerBuckets['90_plus'] += outstanding;
        });

        const lastPayment =
          customerPayments.length > 0
            ? customerPayments.sort((a, b) => {
                // FIX E5-E8: use toJsDate() for both sides of the sort
                const dateA = toJsDate(a.paymentDate);
                const dateB = toJsDate(b.paymentDate);
                return dateB.getTime() - dateA.getTime();
              })[0].paymentDate
            : undefined;

        return {
          customerId:        customer.id,
          customerName:      customer.name,
          outstandingAmount: customer.outstandingAmount || 0,
          overdueAmount:     customerOverdue,
          lastPaymentDate:   lastPayment,
          invoiceCount:      customerInvoices.length,
          buckets:           customerBuckets,
        };
      })
      .filter(entry => entry.outstandingAmount > 0);

    return {
      summary: {
        totalOutstanding,
        overdueAmount,
        agingBuckets: buckets,
      } as LedgerSummary,
      customerLedger: customerLedger.sort(
        (a, b) => b.outstandingAmount - a.outstandingAmount,
      ),
    };
  }, [invoices, customers, payments, loading]);

  return { ...ledgerData, loading, error };
};