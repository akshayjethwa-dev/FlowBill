import { Timestamp, FieldValue } from 'firebase/firestore';
import { BaseEntity } from './common';

/**
 * Collection: /merchants/{merchantId}/customers/{customerId}
 *
 * REQUIRED:    id, merchantId, name, phone, creditDays, outstandingAmount, status
 * OPTIONAL:    email, businessName, gstin, address, whatsapp*
 * COMPUTED:    outstandingAmount (recalculated by Cloud Function on payment/invoice events)
 * IMMUTABLE:   id, merchantId, createdAt
 */
export interface Customer extends BaseEntity {
  // Required
  name: string;
  phone: string;
  creditDays: number;
  outstandingAmount: number;   // computed — do not set manually
  status: CustomerStatus;

  // Optional
  email?: string;
  businessName?: string;
  gstin?: string;
  address?: string;

  // WhatsApp consent & tracking
  whatsappOptIn?: boolean;
  whatsappOptedOutAt?: Timestamp | FieldValue | null;
  whatsappNumber?: string;     // E.164 format e.g. '919876543210'
}

export type CustomerStatus = 'active' | 'overdue' | 'inactive';