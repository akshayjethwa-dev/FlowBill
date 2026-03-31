import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { auth } from '../firebase';
import { Invoice } from '../types';

interface DashboardData {
  dueToday: { count: number; amount: number };
  overdue: { count: number; amount: number };
  recentInvoices: Invoice[];
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const merchantId = auth.currentUser?.uid;
      if (!merchantId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // We use getSnapshot which currently falls back to getLiveDashboardData
        // Once the cloud function snapshot is ready, it'll fetch smoothly from there
        const dashboardData = await dashboardService.getSnapshot(merchantId);
        setData(dashboardData);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return { data, loading, error };
};