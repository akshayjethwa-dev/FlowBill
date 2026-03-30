import { BaseEntity } from './common';

export type UserRole = 'owner' | 'admin' | 'accounts' | 'sales';

export interface UserProfile extends BaseEntity {
  role: UserRole;
  displayName: string;
  phone?: string;
  email?: string;
  onboardingCompleted: boolean;
}

export interface Merchant {
  id: string;
  businessName: string;
  ownerName: string;
  ownerUid?: string; // Kept to ensure the Auth context linking works
  email?: string;
  phone: string;
  gstin?: string;
  category: string;
  upiId?: string;
  address?: string;
  onboarded: boolean;
  createdAt: any;
}