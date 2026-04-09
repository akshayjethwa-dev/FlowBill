import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MerchantProvider } from './context/MerchantContext';
import { ToastProvider } from './components/shared/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PageContainer, PageHeader } from './components/layout/PageContainer';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AcceptInvitePage } from './pages/AcceptInvitePage';

import { DashboardHome } from './pages/DashboardHome';
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

// ── Detect invite token from URL ────────────────────────────────────
function getInviteToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

function AppContent() {
  const { merchantProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check for invite token on load
  const inviteToken = getInviteToken();
  const isAcceptInvitePath = window.location.pathname === '/accept-invite' && !!inviteToken;

  useEffect(() => {
    const handleNavigateEvent = (e: any) => setActiveTab(e.detail);
    window.addEventListener('navigate', handleNavigateEvent);
    return () => window.removeEventListener('navigate', handleNavigateEvent);
  }, []);

  const handleNavigate = (id: string) => setActiveTab(id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 font-medium animate-pulse">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // ── Accept Invite Page (before normal auth gate) ─────────────────
  if (isAcceptInvitePath) {
    return <AcceptInvitePage token={inviteToken!} />;
  }

  // ── Onboarding for owners who haven't completed setup ────────────
  if (merchantProfile && !merchantProfile.onboarding?.completed) {
    return <OnboardingFlow onComplete={() => window.location.reload()} />;
  }

  const renderContent = () => {
    if (activeTab.startsWith('estimate-detail:')) {
      const estimateId = activeTab.split(':')[1];
      return <EstimateDetail estimateId={estimateId} />;
    }
    if (activeTab.startsWith('invoice-detail:')) {
      const invoiceId = activeTab.split(':')[1];
      return <InvoiceDetail invoiceId={invoiceId} />;
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardHome />;
      case 'customers': return <CustomerList />;
      case 'inventory':
      case 'products':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <ProductList />
          </ProtectedRoute>
        );
      case 'orders': return <OrderList />;
      case 'create-order':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <CreateOrder />
          </ProtectedRoute>
        );
      case 'estimates': return <EstimateList />;
      case 'invoices': return <InvoiceList />;
      case 'create-invoice':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff', 'accountant']}>
            <CreateInvoice />
          </ProtectedRoute>
        );
      case 'reminders':
        return (
          <ProtectedRoute allowedRoles={['owner', 'accountant']}>
            <ReminderCenter />
          </ProtectedRoute>
        );
      case 'reminder-history':
        return (
          <ProtectedRoute allowedRoles={['owner', 'accountant']}>
            <ReminderHistoryLog />
          </ProtectedRoute>
        );
      case 'payments': return <PaymentList />;
      case 'ledger':
        return (
          <ProtectedRoute allowedRoles={['owner', 'accountant']}>
            <LedgerPage />
          </ProtectedRoute>
        );
      case 'activity-log':
        return (
          <ProtectedRoute allowedRoles={['owner']}>
            <ActivityLog />
          </ProtectedRoute>
        );
      case 'settings':
        return (
          <ProtectedRoute allowedRoles={['owner']}>
            <SettingsPage />
          </ProtectedRoute>
        );
      case 'billing':
        return (
          <ProtectedRoute allowedRoles={['owner']}>
            <BillingPage />
          </ProtectedRoute>
        );
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
          <MerchantProvider>
            <ProtectedRoute requireOnboarding={false}>
              <AppContent />
            </ProtectedRoute>
          </MerchantProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}