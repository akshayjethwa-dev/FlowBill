import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * IMMUTABLE after creation: id, merchantId, createdAt
 * COMPUTED: updatedAt (always set by service layer, never by caller)
 * OPTIONAL: isArchived (soft-delete flag)
 */
export interface BaseEntity {
  /** Firestore document ID — immutable once written */
  readonly id: string;
  /** Owner of this document — immutable, set at creation from auth context */
  readonly merchantId: string;
  /** Set by serverTimestamp() at creation — immutable */
  createdAt?: Timestamp | FieldValue | string;
  /** Updated by serverTimestamp() on every write */
  updatedAt?: Timestamp | FieldValue | string;
  /** Soft-delete flag — never hard-delete documents */
  isArchived?: boolean;
}

/**
 * Line item shared across orders, estimates, invoices
 */
export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  gstRate: number;       // Percentage: 0 | 5 | 12 | 18 | 28
  amount: number;        // Computed: qty * rate (excluding GST)
  gstAmount?: number;    // Computed: amount * gstRate / 100
  totalAmount?: number;  // Computed: amount + gstAmount
}