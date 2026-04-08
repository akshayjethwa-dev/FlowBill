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
import { db } from '../firebase';
import { Invoice } from '../types/invoice';
import { DashboardSnapshot, DashboardStats } from '../types/dashboard';
import { ServiceResult } from '../types/firestore';
import { invoiceConverter, dashboardConverter } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';

export async function getDashboardSnapshot(
  merchantId: string,
): Promise<ServiceResult<{ stats: DashboardStats; recentInvoices: Invoice[] }>> {
  try {
    const statsRef = doc(db, FSPath.merchant(merchantId), 'stats', 'dashboard');
    const recentQ = query(
      collection(db, FSPath.invoices(merchantId)).withConverter(invoiceConverter),
      where('merchantId', '==', merchantId),
      where('isArchived', '!=', true),
      orderBy('createdAt', 'desc'),
      limit(5),
    );

    const [statsSnap, recentSnap] = await Promise.all([getDoc(statsRef), getDocs(recentQ)]);

    const stats: DashboardStats = statsSnap.exists()
      ? (statsSnap.data() as DashboardStats)
      : { totalSales: 0, pendingAmount: 0, overdueAmount: 0, activeCustomers: 0, dueTodayCount: 0, overdueCount: 0 };

    return { ok: true, data: { stats, recentInvoices: recentSnap.docs.map(d => d.data()) } };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: FSPath.merchant(merchantId), operation: 'get', raw: e } };
  }
}

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
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: FSPath.dashboardSnapshots(merchantId), operation: 'list', raw: e } };
  }
}

export function subscribeToDashboard(
  merchantId: string,
  callback: (invoices: Invoice[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, FSPath.invoices(merchantId)).withConverter(invoiceConverter),
    where('merchantId', '==', merchantId),
    where('isArchived', '!=', true),
    orderBy('createdAt', 'desc'),
    limit(10),
  );
  return onSnapshot(q, snap => callback(snap.docs.map(d => d.data())), onError);
}

export const dashboardService = {
  getSnapshot: getDashboardSnapshot,
  getDashboardHistory,
  subscribeToDashboard,
};