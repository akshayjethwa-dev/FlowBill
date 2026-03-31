import { BaseEntity } from './common';

export interface Reminder extends BaseEntity {
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  type: 'payment' | 'follow_up' | 'custom' | 'manual';
  status: 'queued' | 'upcoming' | 'overdue' | 'sent' | 'cancelled' | 'failed';
  scheduledAt: any;
  message: string;
}

export interface ReminderHistory extends BaseEntity {
  reminderId?: string;
  customerId: string;
  customerName: string;
  type: string;
  sentAt?: any;
  createdAt?: any;
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'delivered' | 'failed' | 'sent' | 'read';
}