import { BaseEntity, OrderItem } from './common';

export interface Order extends BaseEntity {
  orderNumber: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'draft' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'converted_to_invoice';
  notes?: string;
  orderDate?: any;
  deliveryDate?: any;
}