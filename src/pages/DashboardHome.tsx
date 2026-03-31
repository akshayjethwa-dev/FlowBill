import React from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useDashboardData } from '../hooks/useDashboardData';
import { StatWidget } from '../components/dashboard/StatWidgets'; 
import { RecentInvoices } from '../components/dashboard/RecentInvoices';
import { Loader2, AlertCircle } from 'lucide-react';

export const DashboardHome: React.FC = () => {
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Loading dashboard KPIs...</p>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
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
        subtitle="Welcome back! Here's a quick look at your business health today." 
      />

      <div className="space-y-6">
        {/* Render two separate StatWidget components in a grid */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatWidget 
              title="Due Today"
              count={data.dueToday.count}
              type="due"
              onAction={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoices' }))}
            />
            <StatWidget 
              title="Overdue"
              count={data.overdue.count}
              type="overdue"
              onAction={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoices' }))}
            />
          </div>
        )}
        
        {data && data.recentInvoices && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentInvoices 
                invoices={data.recentInvoices} 
                onViewAll={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoices' }))}
              />
            </div>
            {/* Future placement for Activity Feed or Ledger Snapshots */}
          </div>
        )}
      </div>
    </PageContainer>
  );
};