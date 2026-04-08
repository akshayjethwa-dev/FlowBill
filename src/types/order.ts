import { Timestamp, FieldValue } from 'firebase/firestore';
import { BaseEntity, OrderItem } from './common';

/**
 * Collection: /merchants/{merchantId}/orders/{orderId}
 *
 * REQUIRED:    id, merchantId, orderNumber, customerId, customerName, items, totalAmount, status
 * OPTIONAL:    notes, orderDate, deliveryDate, convertedInvoiceId
 * COMPUTED:    totalAmount (sum of items[].totalAmount)
 * IMMUTABLE:   id, merchantId, createdAt, orderNumber
 */
export interface Order extends BaseEntity {
  // Required
  orderNumber: string;            // immutable after creation
  customerId: string;
  customerName: string;           // denormalized for display
  items: OrderItem[];
  totalAmount: number;            // computed
  status: OrderStatus;

  // Optional
  notes?: string;
  orderDate?: Timestamp | FieldValue | string;
  deliveryDate?: Timestamp | FieldValue | string;
  convertedInvoiceId?: string;    // set when status = 'converted_to_invoice'
}

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'converted_to_invoice';