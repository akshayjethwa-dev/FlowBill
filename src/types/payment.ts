import { BaseEntity } from './common';

export interface Payment extends BaseEntity {
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  referenceNumber?: string;
  notes?: string;
  paymentDate: any;
}