import { BaseEntity } from './common';

export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  email?: string;  
  businessName?: string;
  gstin?: string;
  address?: string;
  creditDays: number;
  outstandingAmount: number;
  status: 'active' | 'overdue' | 'inactive';
  
  // WhatsApp Consent & Tracking Fields
  whatsappOptIn?: boolean;
  whatsappOptedOutAt?: any; // Firestore Timestamp
  whatsappNumber?: string;  // Cleaned E.164 number (e.g., '919876543210')
}