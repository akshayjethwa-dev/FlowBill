import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  serverTimestamp,
  WithFieldValue,
} from 'firebase/firestore';
import { Customer } from '../../types/customer';
import { Product } from '../../types/product';
import { Order } from '../../types/order';
import { Estimate } from '../../types/estimate';
import { Invoice } from '../../types/invoice';
import { Payment } from '../../types/payment';
import { Reminder, ReminderHistory } from '../../types/reminder';
import { ActivityLog } from '../../types/activity';
import { WhatsappMessage } from '../../types/whatsapp';
import { DashboardSnapshot } from '../../types/dashboard';

// ─── Generic converter factory ────────────────────────────────────────────────

function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: WithFieldValue<T>): Record<string, unknown> {
      const { id, ...rest } = data as T & { id: string };
      void id; // exclude id — it lives in the doc path, not the doc body
      return rest as Record<string, unknown>;
    },
    fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): T {
      const data = snap.data(options) as Omit<T, 'id'>;
      return { id: snap.id, ...data } as T;
    },
  };
}

// ─── Exported converters (one per collection) ─────────────────────────────────

export const customerConverter    = makeConverter<Customer>();
export const productConverter     = makeConverter<Product>();
export const orderConverter       = makeConverter<Order>();
export const estimateConverter    = makeConverter<Estimate>();
export const invoiceConverter     = makeConverter<Invoice>();
export const paymentConverter     = makeConverter<Payment>();
export const reminderConverter    = makeConverter<Reminder>();
export const reminderHistoryConverter = makeConverter<ReminderHistory>();
export const activityConverter    = makeConverter<ActivityLog>();
export const whatsappConverter    = makeConverter<WhatsappMessage>();
export const dashboardConverter   = makeConverter<DashboardSnapshot>();

// ─── Helper: write timestamps automatically ──────────────────────────────────

export function withTimestamps<T>(
  data: Omit<T, 'createdAt' | 'updatedAt'>,
  isNew: boolean,
): T & { createdAt?: unknown; updatedAt: unknown } {
  return {
    ...data,
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  } as T & { createdAt?: unknown; updatedAt: unknown };
}