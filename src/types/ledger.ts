export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
}

export interface LedgerSummary {
  totalOutstanding: number;
  overdueAmount: number;
  agingBuckets: AgingBucket[];
}

export interface CustomerLedgerEntry {
  customerId: string;
  customerName: string;
  outstandingAmount: number;
  overdueAmount: number;
  lastPaymentDate?: any;
  invoiceCount: number;
}