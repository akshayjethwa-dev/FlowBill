// src/types/reminder.ts
import { Timestamp, FieldValue } from 'firebase/firestore';
import { BaseEntity } from './common';

/**
 * Collection: /merchants/{merchantId}/reminders/{reminderId}
 *
 * REQUIRED:    id, merchantId, customerId, customerName, type, status, scheduledAt, message
 * OPTIONAL:    invoiceId, invoiceNumber, sentAt, failureReason
 * IMMUTABLE:   id, merchantId, createdAt
 */
export interface Reminder extends BaseEntity {
  // Required
  customerId: string;
  customerName: string;
  type: ReminderType;
  status: ReminderStatus;
  scheduledAt: Timestamp | FieldValue | string;
  message: string;

  // Optional linkage
  invoiceId?: string;
  invoiceNumber?: string;
  sentAt?: Timestamp | FieldValue | string | null;
  failureReason?: string | null;
}

export type ReminderType   = 'payment' | 'follow_up' | 'custom' | 'manual';
export type ReminderStatus = 'queued' | 'upcoming' | 'overdue' | 'sent' | 'cancelled' | 'failed';

/**
 * Collection: /merchants/{merchantId}/reminders/{reminderId}/history/{historyId}
 * Subcollection tracking each delivery attempt.
 */
export interface ReminderHistory extends BaseEntity {
  reminderId: string;             // required — link back to parent
  customerId: string;
  customerName: string;
  type: ReminderType;
  channel: ReminderChannel;
  status: ReminderDeliveryStatus;
  sentAt?: Timestamp | FieldValue | string | null;
  failureReason?: string | null;
}

export type ReminderChannel        = 'whatsapp' | 'sms' | 'email';
export type ReminderDeliveryStatus = 'delivered' | 'failed' | 'sent' | 'read';

// ─── Job scheduling types (live in reminderJob.ts, re-exported here for convenience) ───
export type { ReminderStage, ReminderJobStatus, ReminderJob, ReminderJobSummary } from './reminderJob';