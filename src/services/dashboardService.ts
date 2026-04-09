/**
 * dashboardService.ts  (UPDATED — server-authoritative snapshot)
 *
 * Changes:
 *  1. getDashboardSnapshot  → reads from correct path `dashboardSnapshot/current`
 *                             (was wrong: `stats/dashboard`)
 *  2. subscribeToDashboard  → now subscribes to the single snapshot doc
 *                             (was: expensive full invoices collection scan)
 *  3. refreshDashboardSnapshot → NEW: calls Cloud Function to recompute snapshot
 *  4. getDashboardHistory   → unchanged
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { Invoice } from '../types/invoice';
import { DashboardSnapshot, DashboardStats } from '../types/dashboard';
import { ServiceResult } from '../types/firestore';
import { invoiceConverter, dashboardConverter } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';

const fns = getFunctions(db.app, 'asia-south1');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LiveDashboardSnapshot {
  merchantId:        string;
  totalInvoiced:     number;
  totalCollected:    number;
  totalOutstanding:  number;
  overdueCount:      number;
  overdueAmount:     number;
  draftCount:        number;
  paidCount:         number;
  openCount:         number;
  totalInvoiceCount: number;
  lastRefreshedAt:   any;
}

// ─── Get snapshot (one-shot read) ─────────────────────────────────────────────
// Reads the pre-computed `dashboardSnapshot/current` doc written by Cloud Functions.
// FIXED: was reading from wrong path `stats/dashboard`.

export async function getDashboardSnapshot(
  merchantId: string,
): Promise<ServiceResult<{ stats: LiveDashboardSnapshot; recentInvoices: Invoice[] }>> {
  try {
    // ✅ Correct path: dashboardSnapshot/current
    const snapshotRef = doc(db, `merchants/${merchantId}/dashboardSnapshot/current`);
    const recentQ = query(
      collection(db, FSPath.invoices(merchantId)).withConverter(invoiceConverter),
      where('merchantId', '==', merchantId),
      where('isArchived', '!=', true),
      orderBy('createdAt', 'desc'),
      limit(5),
    );

    const [snapshotSnap, recentSnap] = await Promise.all([
      getDoc(snapshotRef),
      getDocs(recentQ),
    ]);

    const stats: LiveDashboardSnapshot = snapshotSnap.exists()
      ? (snapshotSnap.data() as LiveDashboardSnapshot)
      : {
          merchantId,
          totalInvoiced:     0,
          totalCollected:    0,
          totalOutstanding:  0,
          overdueCount:      0,
          overdueAmount:     0,
          draftCount:        0,
          paidCount:         0,
          openCount:         0,
          totalInvoiceCount: 0,
          lastRefreshedAt:   null,
        };

    return {
      ok:   true,
      data: { stats, recentInvoices: recentSnap.docs.map(d => d.data()) },
    };
  } catch (e: any) {
    return {
      ok: false,
      error: {
        code:      e.code    ?? 'unknown',
        message:   e.message ?? 'Failed to load dashboard',
        path:      FSPath.merchant(merchantId),
        operation: 'get',
        raw:       e,
      },
    };
  }
}

// ─── Real-time subscription to snapshot doc ───────────────────────────────────
// REPLACED the old full invoices collection scan with a single-doc listener.
// The Cloud Functions keep this doc up-to-date after every invoice/payment write.
// One document read vs. N invoice reads — massively cheaper on Firestore billing.

export function subscribeToDashboard(
  merchantId: string,
  callback: (snapshot: LiveDashboardSnapshot | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const snapshotRef = doc(db, `merchants/${merchantId}/dashboardSnapshot/current`);
  return onSnapshot(
    snapshotRef,
    snap => callback(snap.exists() ? (snap.data() as LiveDashboardSnapshot) : null),
    onError,
  );
}

// ─── Trigger server-side recompute (NEW) ──────────────────────────────────────
// Call this after bulk imports, data migrations, or if the dashboard
// appears out of sync. The Cloud Function recomputes all totals from scratch
// and overwrites the snapshot doc.

export async function refreshDashboardSnapshot(
  merchantId: string,
): Promise<ServiceResult<void>> {
  try {
    const fn = httpsCallable<
      Record<string, never>,
      { success: boolean }
    >(fns, 'refreshDashboardSnapshotFn');
    await fn({});
    return { ok: true, data: undefined };
  } catch (e: any) {
    return {
      ok: false,
      error: {
        code:      e.code    ?? 'unknown',
        message:   e.message ?? 'Failed to refresh dashboard snapshot',
        path:      `merchants/${merchantId}/dashboardSnapshot/current`,
        operation: 'update',
        raw:       e,
      },
    };
  }
}

// ─── Dashboard history (unchanged) ────────────────────────────────────────────

export async function getDashboardHistory(
  merchantId: string,
  limitCount = 30,
): Promise<ServiceResult<DashboardSnapshot[]>> {
  try {
    const q = query(
      collection(db, FSPath.dashboardSnapshots(merchantId)).withConverter(dashboardConverter),
      where('merchantId', '==', merchantId),
      orderBy('date', 'desc'),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return { ok: true, data: snap.docs.map(d => d.data()) };
  } catch (e: any) {
    return {
      ok: false,
      error: {
        code:      e.code    ?? 'unknown',
        message:   e.message ?? 'Failed to load history',
        path:      FSPath.dashboardSnapshots(merchantId),
        operation: 'list',
        raw:       e,
      },
    };
  }
}

// ─── Namespace export (backward-compatible) ───────────────────────────────────
// subscribeToDashboard callback type changed from Invoice[] → LiveDashboardSnapshot | null
// Update any components using dashboardService.subscribeToDashboard accordingly.

export const dashboardService = {
  getSnapshot:              getDashboardSnapshot,
  subscribeToDashboard,
  refreshDashboardSnapshot,
  getDashboardHistory,
};