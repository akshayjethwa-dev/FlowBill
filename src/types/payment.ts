import { Timestamp, FieldValue } from 'firebase/firestore';
import { BaseEntity } from './common';

/**
 * Collection: /merchants/{merchantId}/payments/{paymentId}
 *
 * REQUIRED:    id, merchantId, customerId, customerName, amount, method, status, paymentDate
 * OPTIONAL:    invoiceId, invoiceNumber, referenceNumber, notes
 * IMMUTABLE:   id, merchantId, createdAt
 */
export interface Payment extends BaseEntity {
  // Required
  customerId: string;
  customerName: string;           // denormalized
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: Timestamp | FieldValue | string;

  // Optional linkage
  invoiceId?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  notes?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
export type PaymentStatus  = 'completed' | 'pending' | 'failed' | 'refunded';