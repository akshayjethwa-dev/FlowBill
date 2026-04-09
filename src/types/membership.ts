export type MemberRole = 'owner' | 'staff' | 'accountant' | 'support';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export interface MembershipDoc {
  uid: string;
  merchantId: string;
  role: MemberRole;
  status: MemberStatus;
  displayName: string;
  email: string;
  invitedBy: string;       // UID of owner who invited
  joinedAt: any;           // Firestore Timestamp
  createdAt: any;
}

export interface PendingInvite {
  id: string;              // doc ID = inviteToken
  email: string;
  role: MemberRole;
  merchantId: string;
  invitedBy: string;
  invitedAt: any;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: any;
}

export const ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  owner: ['*'],
  staff: ['customers', 'products', 'orders', 'invoices', 'estimates', 'payments'],
  accountant: ['invoices', 'payments', 'ledger', 'reminders', 'reminder-history', 'customers'],
  support: ['customers', 'orders'],
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  staff: 'Staff',
  accountant: 'Accountant',
  support: 'Support',
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: 'Full access including billing, team, and settings',
  staff: 'Can create orders, invoices, manage products & customers',
  accountant: 'Can reconcile payments, manage ledger and reminders',
  support: 'Read-only access to customers and orders',
};