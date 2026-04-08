import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Collection: /merchants/{merchantId}/dashboardSnapshots/{snapshotId}
 * Snapshot document written daily by a scheduled Cloud Function.
 *
 * REQUIRED:    merchantId, date, totalSales, pendingAmount, overdueAmount,
 *              activeCustomers, dueTodayCount, overdueCount
 * COMPUTED:    all numeric fields — written by Cloud Function, never by frontend
 * IMMUTABLE:   merchantId, date, createdAt
 */
export interface DashboardSnapshot {
  readonly id: string;
  readonly merchantId: string;
  readonly date: string;          // ISO date 'YYYY-MM-DD' — partition key
  totalSales: number;
  pendingAmount: number;
  overdueAmount: number;
  activeCustomers: number;
  dueTodayCount: number;
  overdueCount: number;
  createdAt?: Timestamp | FieldValue | string;
}

/** Live computed stats used in the Dashboard page — NOT persisted */
export interface DashboardStats {
  totalSales: number;
  pendingAmount: number;
  overdueAmount: number;
  activeCustomers: number;
  dueTodayCount: number;
  overdueCount: number;
}