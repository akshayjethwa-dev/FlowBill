/**
 * useDashboardData.ts  (UPDATED)
 *
 * Changes:
 *  1. Switched from one-shot getDashboardSnapshot() fetch
 *     → real-time subscribeToDashboard() listener on dashboardSnapshot/current
 *     So the UI auto-updates the moment a payment or invoice is recorded —
 *     no manual refresh needed.
 *
 *  2. Handles ServiceResult { ok, data, error } shape correctly.
 *
 *  3. Fetches recentInvoices separately via subscribeToInvoices (already
 *     real-time) so the dashboard table also stays live.
 *
 *  4. Calls refreshDashboardSnapshot() on first mount if the snapshot doc
 *     doesn't exist yet (new merchant / first login).
 */
import { useState, useEffect } from 'react';
import { dashboardService, LiveDashboardSnapshot } from '../services/dashboardService';
import { subscribeToInvoices } from '../services/invoiceService';
import { auth } from '../firebase';
import { Invoice } from '../types';

interface DashboardStats {
  totalInvoiced:    number;
  totalCollected:   number;
  totalOutstanding: number;
  overdueCount:     number;
  overdueAmount:    number;
  draftCount:       number;
  paidCount:        number;
  openCount:        number;
  totalInvoiceCount: number;
  lastRefreshedAt:  any;
}

interface DashboardData {
  stats:          DashboardStats;
  recentInvoices: Invoice[];
}

const EMPTY_STATS: DashboardStats = {
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

export const useDashboardData = () => {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const merchantId = auth.currentUser?.uid;
    if (!merchantId) {
      setLoading(false);
      return;
    }

    let recentInvoices: Invoice[] = [];

    // ── 1. Real-time listener on dashboardSnapshot/current ───────────────────
    // Updates the KPI numbers the instant Cloud Functions write to the snapshot doc.
    const unsubSnapshot = dashboardService.subscribeToDashboard(
      merchantId,
      async (snapshot: LiveDashboardSnapshot | null) => {
        if (snapshot) {
          // Snapshot doc exists — populate stats immediately
          setData({ stats: snapshot as DashboardStats, recentInvoices });
          setLoading(false);
          setError(null);
        } else {
          // Snapshot doc doesn't exist yet (new merchant) — trigger a server recompute
          try {
            await dashboardService.refreshDashboardSnapshot(merchantId);
            // The onSnapshot listener above will fire again once the doc is created
          } catch (refreshErr) {
            console.warn('Could not trigger dashboard refresh:', refreshErr);
            // Show empty stats rather than crashing
            setData({ stats: EMPTY_STATS, recentInvoices });
            setLoading(false);
          }
        }
      },
      (err) => {
        console.error('Dashboard snapshot listener error:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      },
    );

    // ── 2. Real-time listener on recent invoices (for the table) ─────────────
    // Keeps the recent invoices table live without needing a separate fetch.
    const unsubInvoices = subscribeToInvoices(
      merchantId,
      (invoices: Invoice[]) => {
        // Keep only the 5 most recent for the dashboard table
        recentInvoices = invoices.slice(0, 5);
        // Merge into existing data if snapshot is already loaded
        setData(prev =>
          prev ? { ...prev, recentInvoices } : null,
        );
      },
      (err) => {
        console.warn('Recent invoices listener error (non-critical):', err);
      },
    );

    // ── Cleanup both listeners on unmount ────────────────────────────────────
    return () => {
      unsubSnapshot();
      unsubInvoices();
    };
  }, []);

  // Manual refresh — call this from a "Refresh" button if needed
  const refresh = async () => {
    const merchantId = auth.currentUser?.uid;
    if (!merchantId) return;
    setLoading(true);
    const result = await dashboardService.refreshDashboardSnapshot(merchantId);
    if (!result.ok) {
      setError(result.error?.message ?? 'Refresh failed');
    }
    setLoading(false);
    // onSnapshot will auto-update data once the server writes the new doc
  };

  return { data, loading, error, refresh };
};