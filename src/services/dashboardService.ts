import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Invoice } from '../types';

export const dashboardService = {
  /**
   * MVP: Live queries for Dashboard KPIs
   * Queries due today, overdue, and recent invoices in real-time.
   */
  getLiveDashboardData: async (merchantId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const invoicesRef = collection(db, `merchants/${merchantId}/invoices`);

    // 1. Due Today: status in ['sent', 'partial', 'overdue'] and dueDate is today
    const dueTodayQuery = query(
      invoicesRef,
      where('status', 'in', ['sent', 'partial', 'overdue']),
      where('dueDate', '>=', today),
      where('dueDate', '<', tomorrow)
    );

    // 2. Overdue: status == 'overdue'
    const overdueQuery = query(
      invoicesRef,
      where('status', '==', 'overdue')
    );

    // 3. Recent Invoices: latest 5 invoices
    const recentInvoicesQuery = query(
      invoicesRef,
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const [dueTodaySnap, overdueSnap, recentSnap] = await Promise.all([
      getDocs(dueTodayQuery),
      getDocs(overdueQuery),
      getDocs(recentInvoicesQuery)
    ]);

    const dueTodayInvoices = dueTodaySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
    const overdueInvoices = overdueSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
    const recentInvoices = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];

    // Calculate sum of remaining balances
    const dueTodayTotal = dueTodayInvoices.reduce((sum, inv) => sum + (inv.totalAmount - (inv.paidAmount || 0)), 0);
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount - (inv.paidAmount || 0)), 0);

    return {
      dueToday: {
        count: dueTodayInvoices.length,
        amount: dueTodayTotal
      },
      overdue: {
        count: overdueInvoices.length,
        amount: overdueTotal
      },
      recentInvoices
    };
  },

  /**
   * Future-proofing: For when the dashboardSnapshots Cloud Function is implemented.
   * We will load from `merchants/{merchantId}/dashboardSnapshots` here instead.
   */
  getSnapshot: async (merchantId: string) => {
    // Fallback to live queries for MVP
    return dashboardService.getLiveDashboardData(merchantId);
  }
};