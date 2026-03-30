import React from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { KPICard } from '../components/dashboard/KPICard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { RecentInvoices } from '../components/dashboard/RecentInvoices';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { StatWidget } from '../components/dashboard/StatWidgets';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, Users, CreditCard, AlertTriangle } from 'lucide-react';
import { DashboardSkeleton } from '../components/ui/Skeleton';

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const { loading, error, stats, recentInvoices, activities } = useDashboardData(user?.uid);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard" 
        subtitle="Welcome back! Here's what's happening with your business."
      />

      <div className="space-y-8">
        {/* Quick Actions */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</h3>
          <QuickActions onAction={(id) => console.log('Action:', id)} />
        </section>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Total Sales" 
            value={`₹ ${stats?.totalSales.toLocaleString('en-IN')}`} 
            trend={{ value: '12%', isPositive: true }}
            icon={IndianRupee}
            color="indigo"
          />
          <KPICard 
            title="Pending Amount" 
            value={`₹ ${stats?.pendingAmount.toLocaleString('en-IN')}`} 
            trend={{ value: '5%', isPositive: false }}
            icon={CreditCard}
            color="orange"
          />
          <KPICard 
            title="Overdue Amount" 
            value={`₹ ${stats?.overdueAmount.toLocaleString('en-IN')}`} 
            icon={AlertTriangle}
            color="red"
          />
          <KPICard 
            title="Active Customers" 
            value={stats?.activeCustomers.toString() || '0'} 
            trend={{ value: '8%', isPositive: true }}
            icon={Users}
            color="green"
          />
        </div>

        {/* Critical Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatWidget 
            title="Due Today" 
            count={stats?.dueTodayCount || 0} 
            type="due" 
            onAction={() => console.log('View due today')}
          />
          <StatWidget 
            title="Overdue Invoices" 
            count={stats?.overdueCount || 0} 
            type="overdue" 
            onAction={() => console.log('View overdue')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Invoices Table */}
          <div className="lg:col-span-2">
            <RecentInvoices 
              invoices={recentInvoices} 
              onViewAll={() => console.log('View all invoices')} 
            />
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
