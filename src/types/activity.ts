import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Collection: /merchants/{merchantId}/activities/{activityId}
 *
 * REQUIRED:    id, merchantId, type, description, userId, userName
 * OPTIONAL:    metadata
 * IMMUTABLE:   id, merchantId, createdAt (activity logs are append-only — never update)
 */
export type ActivityType =
  | 'order_created'
  | 'order_updated'
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_sent'
  | 'payment_recorded'
  | 'payment_marked'
  | 'customer_added'
  | 'customer_updated'
  | 'reminder_sent'
  | 'estimate_created'
  | 'estimate_converted'
  | 'product_created'
  | 'product_updated';

export interface ActivityLog {
  readonly id: string;
  readonly merchantId: string;    // required — ownership anchor
  type: ActivityType;
  description: string;
  userId: string;                 // auth UID of actor
  userName: string;               // denormalized display name
  metadata: Record<string, unknown>;
  createdAt?: Timestamp | FieldValue | string;
}

/** UI display shape — constructed from ActivityLog in the service layer */
export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  timestamp: Timestamp | FieldValue | string;
  status?: string;
  description?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}