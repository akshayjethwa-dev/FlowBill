import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/shared/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PageContainer, PageHeader } from './components/layout/PageContainer';
import { DashboardSkeleton } from './components/ui/Skeleton';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { merchantService } from './services/merchantService';
import { Merchant } from './types';

import { DashboardHome } from './pages/DashboardHome';
// FIXED: Removed curly braces for default import
import CustomerList from './pages/CustomerList'; 
import { ProductList } from './pages/ProductList';
import { OrderList } from './pages/OrderList';
import { CreateOrder } from './pages/CreateOrder';
import { EstimateList } from './pages/EstimateList';
import { EstimateDetail } from './pages/EstimateDetail';
import { InvoiceList } from './pages/InvoiceList';
import { CreateInvoice } from './pages/CreateInvoice';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { ReminderCenter } from './pages/ReminderCenter';
import { ReminderHistoryLog } from './pages/ReminderHistoryLog';
import { PaymentList } from './pages/PaymentList';
import { LedgerPage } from './pages/LedgerPage';
import ActivityLog from './pages/ActivityLog';
import { SettingsPage } from './pages/SettingsPage';
import { BillingPage } from './pages/BillingPage';

function AppContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      if (user) {
        const profile = await merchantService.getMerchant(user.uid);
        setMerchant(profile);
      }
      setIsLoading(false);
    }
    checkOnboarding();
  }, [user]);

  // Handle custom navigation events
  useEffect(() => {
    const handleNavigateEvent = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('navigate', handleNavigateEvent);
    return () => window.removeEventListener('navigate', handleNavigateEvent);
  }, []);

  // Mock navigation handler
  const handleNavigate = (id: string) => {
    setActiveTab(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 font-medium animate-pulse">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!merchant || !merchant.onboarded) {
    return <OnboardingFlow onComplete={() => window.location.reload()} />;
  }

  const renderContent = () => {
    // Handle parameterized routes
    if (activeTab.startsWith('estimate-detail:')) {
      const estimateId = activeTab.split(':')[1];
      return <EstimateDetail estimateId={estimateId} />;
    }

    if (activeTab.startsWith('invoice-detail:')) {
      const invoiceId = activeTab.split(':')[1];
      return <InvoiceDetail invoiceId={invoiceId} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome />;
      case 'customers':
        return <CustomerList />;
      case 'inventory':
      case 'products':
        return <ProductList />;
      case 'orders':
        return <OrderList />;
      case 'create-order':
        return <CreateOrder />;
      case 'estimates':
        return <EstimateList />;
      case 'invoices':
        return <InvoiceList />;
      case 'create-invoice':
        return <CreateInvoice />;
      case 'reminders':
        return <ReminderCenter />;
      case 'reminder-history':
        return <ReminderHistoryLog />;
      case 'payments':
        return <PaymentList />;
      case 'ledger':
        return <LedgerPage />;
      case 'activity-log':
        return <ActivityLog />;
      case 'settings':
        return <SettingsPage />;
      case 'billing':
        return <BillingPage />;
      default:
        return (
          <PageContainer>
            <PageHeader 
              title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} 
              subtitle={`Manage your ${activeTab}.`}
            />
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center">
              <p className="text-gray-500">Module for {activeTab} is coming soon!</p>
            </div>
          </PageContainer>
        );
    }
  };

  return (
    <DashboardLayout activeId={activeTab} onNavigate={handleNavigate}>
      {renderContent()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}