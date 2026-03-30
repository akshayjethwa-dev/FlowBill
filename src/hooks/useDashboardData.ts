import { useState, useEffect } from 'react';
import { DashboardStats, Invoice, ActivityItem } from '../types';

export const useDashboardData = (merchantId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!merchantId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock Stats
        setStats({
          totalSales: 125400,
          pendingAmount: 45200,
          overdueAmount: 12500,
          activeCustomers: 24,
          dueTodayCount: 3,
          overdueCount: 5,
        });

        // Mock Invoices
        setRecentInvoices([
          {
            id: 'inv-1',
            merchantId,
            customerId: 'cust-1',
            customerName: 'Rahul Sharma',
            invoiceNumber: 'INV-2024-001',
            items: [],
            totalAmount: 12500,
            paidAmount: 0,
            status: 'unpaid',
            dueDate: new Date(),
            createdAt: new Date(),
          },
          {
            id: 'inv-2',
            merchantId,
            customerId: 'cust-2',
            customerName: 'Priya Verma',
            invoiceNumber: 'INV-2024-002',
            items: [],
            totalAmount: 8400,
            paidAmount: 8400,
            status: 'paid',
            dueDate: new Date(),
            createdAt: new Date(),
          },
          {
            id: 'inv-3',
            merchantId,
            customerId: 'cust-3',
            customerName: 'Amit Patel',
            invoiceNumber: 'INV-2024-003',
            items: [],
            totalAmount: 15000,
            paidAmount: 0,
            status: 'overdue',
            dueDate: new Date(),
            createdAt: new Date(),
          },
        ]);

        // Mock Activities
        setActivities([
          {
            id: 'act-1',
            type: 'order',
            title: 'New Order #ORD-992',
            subtitle: 'From Rahul Sharma • ₹ 4,500',
            timestamp: new Date(),
            status: 'pending',
          },
          {
            id: 'act-2',
            type: 'payment',
            title: 'Payment Received',
            subtitle: 'INV-2024-002 • ₹ 8,400',
            timestamp: new Date(),
            status: 'confirmed',
          },
          {
            id: 'act-3',
            type: 'invoice',
            title: 'Invoice Generated',
            subtitle: 'INV-2024-003 • ₹ 15,000',
            timestamp: new Date(),
          },
          {
            id: 'act-4',
            type: 'customer',
            title: 'New Customer Added',
            subtitle: 'Priya Verma • Bangalore',
            timestamp: new Date(),
          },
        ]);

        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchData();
  }, [merchantId]);

  return { loading, error, stats, recentInvoices, activities };
};
