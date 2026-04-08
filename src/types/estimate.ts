import { Timestamp, FieldValue } from 'firebase/firestore';
import { BaseEntity, OrderItem } from './common';

/**
 * Collection: /merchants/{merchantId}/estimates/{estimateId}
 *
 * REQUIRED:    id, merchantId, estimateNumber, customerId, customerName, items, totalAmount, status, validUntil
 * OPTIONAL:    orderId, notes, convertedInvoiceId
 * COMPUTED:    totalAmount
 * IMMUTABLE:   id, merchantId, createdAt, estimateNumber
 */
export interface Estimate extends BaseEntity {
  // Required
  estimateNumber: string;         // immutable after creation
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;            // computed
  status: EstimateStatus;
  validUntil: Timestamp | FieldValue | string;

  // Optional
  orderId?: string;
  notes?: string;
  convertedInvoiceId?: string;    // set when status = 'converted_to_invoice'
}

export type EstimateStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'converted_to_invoice'
  | 'expired';