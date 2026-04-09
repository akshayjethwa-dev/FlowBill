// src/types/reminderJob.ts
import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Reminder stage keys — maps to a WhatsApp template.
 *
 * T-3: 3 days before due date   → friendly heads-up
 * T-0: due today                → urgent nudge
 * T+2: 2 days overdue           → first overdue notice
 * T+7: 7 days overdue           → final notice
 */
export type ReminderStage = 'T-3' | 'T-0' | 'T+2' | 'T+7';

/**
 * Job lifecycle statuses — managed by the processor function only.
 *
 * pending    → waiting to be picked up (initial state or retry scheduled)
 * processing → locked by the processor (prevents double-processing)
 * completed  → WhatsApp message sent successfully
 * skipped    → invoice paid / customer opted-out / merchant inactive
 * failed     → permanent error or max retries exhausted
 */
export type ReminderJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'skipped'
  | 'failed';

/**
 * Collection: /merchants/{merchantId}/reminderJobs/{jobId}
 *
 * Document ID format: `inv_{invoiceId}_stage_{stage}`
 * This deterministic ID is the deduplication key — doc.create() fails
 * with ALREADY_EXISTS (gRPC code 6) if the scheduler re-runs for the
 * same invoice + stage combination, preventing duplicate sends.
 *
 * REQUIRED:    merchantId, invoiceId, customerId, stage, templateKey,
 *              scheduledAt, status, retryCount, maxRetries
 * OPTIONAL:    lastError, nextRetryAt, lastAttemptAt, whatsappMessageId
 * IMMUTABLE:   id, merchantId, invoiceId, stage, templateKey, createdAt
 * COMPUTED:    status, retryCount, nextRetryAt — mutated by processor only
 */
export interface ReminderJob {
  readonly id: string;
  readonly merchantId: string;
  readonly invoiceId: string;
  readonly customerId: string;
  readonly stage: ReminderStage;
  readonly templateKey: string;
  readonly scheduledAt: Timestamp | FieldValue | string;

  // Lifecycle — mutated by processor only
  status: ReminderJobStatus;
  retryCount: number;
  maxRetries: number;

  // Error and retry tracking
  lastError: string | null;
  nextRetryAt: Timestamp | FieldValue | string | null;
  lastAttemptAt?: Timestamp | FieldValue | string | null;

  // Set on successful delivery
  whatsappMessageId?: string | null;

  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
}

/**
 * Per-invoice summary used by the Reminder Center UI
 * to display which stages have been sent/pending/failed.
 */
export interface ReminderJobSummary {
  invoiceId: string;
  stages: {
    stage: ReminderStage;
    status: ReminderJobStatus;
    retryCount: number;
    lastError: string | null;
    completedAt?: Timestamp | FieldValue | string | null;
  }[];
}