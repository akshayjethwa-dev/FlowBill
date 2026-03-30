import { BaseEntity, OrderItem } from './common';

export interface Estimate extends BaseEntity {
  orderId?: string;
  customerId: string;
  customerName: string;
  estimateNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'converted_to_invoice';
  validUntil: any;
  notes?: string;
}