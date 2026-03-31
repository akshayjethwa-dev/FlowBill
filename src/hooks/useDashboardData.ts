import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { auth } from '../firebase';
import { Invoice } from '../types';

interface DashboardStats {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
}

interface DashboardData {
  stats: DashboardStats;
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
        // This is now lightning fast and very cheap on reads!
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