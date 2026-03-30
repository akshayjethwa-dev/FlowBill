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
}