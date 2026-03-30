import { BaseEntity, OrderItem } from './common';

export interface Order extends BaseEntity {
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'draft' | 'confirmed' | 'cancelled' | 'converted_to_invoice';
  notes?: string;
  orderDate: any;
}