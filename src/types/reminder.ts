import { BaseEntity } from './common';

export interface Reminder extends BaseEntity {
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  type: 'payment' | 'follow_up' | 'custom';
  status: 'upcoming' | 'overdue' | 'sent' | 'cancelled';
  scheduledDate: any;
  message: string;
}

export interface ReminderHistory extends BaseEntity {
  reminderId: string;
  customerId: string;
  customerName: string;
  type: string;
  sentAt: any;
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'delivered' | 'failed';
}