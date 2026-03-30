import { BaseEntity, OrderItem } from './common';

export interface Invoice extends BaseEntity {
  orderId?: string;
  estimateId?: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'sent' | 'unpaid' | 'paid' | 'partial' | 'overdue';
  dueDate: any;
  notes?: string;
}