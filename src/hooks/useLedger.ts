import { useMemo } from 'react';
import { useInvoices } from './useInvoices';
import { useCustomers } from './useCustomers';
import { usePayments } from './usePayments';
import { 
  LedgerSummary, 
  AgingBucket, 
  CustomerLedgerEntry, 
  Invoice, 
  Customer, 
  Payment 
} from '../types';

export const useLedger = () => {
  const { invoices, loading: invoicesLoading, error: invoicesError } = useInvoices();
  const { customers, loading: customersLoading, error: customersError } = useCustomers();
  const { payments, loading: paymentsLoading, error: paymentsError } = usePayments();

  const loading = invoicesLoading || customersLoading || paymentsLoading;
  const error = invoicesError || customersError || paymentsError;

  const ledgerData = useMemo(() => {
    if (loading || !invoices.length || !customers.length) {
      return {
        summary: {
          totalOutstanding: 0,
          overdueAmount: 0,
          agingBuckets: [],
        } as LedgerSummary,
        customerLedger: [] as CustomerLedgerEntry[],
      };
    }

    const now = new Date();
    const unpaidInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'draft');
    
    // 1. Calculate Aging Buckets
    const buckets: AgingBucket[] = [
      { label: '0-30 Days', amount: 0, count: 0, color: 'bg-green-500' },
      { label: '31-60 Days', amount: 0, count: 0, color: 'bg-yellow-500' },
      { label: '61-90 Days', amount: 0, count: 0, color: 'bg-orange-500' },
      { label: '90+ Days', amount: 0, count: 0, color: 'bg-red-500' },
    ];

    let totalOutstanding = 0;
    let overdueAmount = 0;

    unpaidInvoices.forEach(invoice => {
      const dueDate = invoice.dueDate?.toDate?.() || new Date(invoice.dueDate);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const outstanding = invoice.totalAmount - (invoice.paidAmount || 0);

      totalOutstanding += outstanding;
      if (diffDays > 0) overdueAmount += outstanding;

      if (diffDays <= 30) {
        buckets[0].amount += outstanding;
        buckets[0].count++;
      } else if (diffDays <= 60) {
        buckets[1].amount += outstanding;
        buckets[1].count++;
      } else if (diffDays <= 90) {
        buckets[2].amount += outstanding;
        buckets[2].count++;
      } else {
        buckets[3].amount += outstanding;
        buckets[3].count++;
      }
    });

    // 2. Calculate Customer Ledger
    const customerLedger: CustomerLedgerEntry[] = customers.map(customer => {
      const customerInvoices = unpaidInvoices.filter(i => i.customerId === customer.id);
      const customerPayments = payments.filter(p => p.customerId === customer.id);
      
      const customerOverdue = customerInvoices.reduce((sum, inv) => {
        const dueDate = inv.dueDate?.toDate?.() || new Date(inv.dueDate);
        if (now > dueDate) {
          return sum + (inv.totalAmount - (inv.paidAmount || 0));
        }
        return sum;
      }, 0);

      const lastPayment = customerPayments.length > 0 
        ? customerPayments.sort((a, b) => {
            const dateA = a.paymentDate?.toDate?.() || new Date(a.paymentDate);
            const dateB = b.paymentDate?.toDate?.() || new Date(b.paymentDate);
            return dateB.getTime() - dateA.getTime();
          })[0].paymentDate 
        : undefined;

      return {
        customerId: customer.id,
        customerName: customer.name,
        outstandingAmount: customer.outstandingAmount || 0,
        overdueAmount: customerOverdue,
        lastPaymentDate: lastPayment,
        invoiceCount: customerInvoices.length,
      };
    }).filter(entry => entry.outstandingAmount > 0);

    return {
      summary: {
        totalOutstanding,
        overdueAmount,
        agingBuckets: buckets,
      } as LedgerSummary,
      customerLedger: customerLedger.sort((a, b) => b.outstandingAmount - a.outstandingAmount),
    };
  }, [invoices, customers, payments, loading]);

  return {
    ...ledgerData,
    loading,
    error,
  };
};
