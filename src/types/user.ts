import { BaseEntity } from './common';

// 1. Defined Access Model
export type UserRole = 'owner' | 'admin' | 'staff' | 'accountant';
export type UserStatus = 'active' | 'suspended' | 'invited';

// 2 & 3. Membership Document (Links Auth UID to Merchant)
export interface UserProfile extends BaseEntity {
  merchantId: string; // Links the user to their specific business
  role: UserRole;
  status: UserStatus;
  displayName: string;
  phone?: string;
  email?: string;
  joinedAt?: any;
  invitedBy?: string; // UID of the owner who invited them
}

// 4. Onboarding & Setup States
export interface MerchantOnboardingState {
  completed: boolean;
  gstConfigured: boolean;
  firstInvoiceCreated: boolean;
  whatsappConnected: boolean;
  paymentGatewayConnected: boolean;
}

export interface Merchant {
  id: string;
  businessName: string;
  ownerName: string;
  ownerUid?: string; 
  email?: string;
  phone: string;
  gstin?: string;
  category: string;
  upiId?: string;
  address?: string;
  onboarding: MerchantOnboardingState; // ✅ Replaced flat boolean with detailed state
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing'; // For Step 8
  createdAt: any;
}