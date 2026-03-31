import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from './LoginPage';
import { UserRole } from '../../types/user';
import { AlertCircle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];     // e.g., ['owner', 'admin']
  requireOnboarding?: boolean;   // e.g., false for the actual Onboarding page
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  requireOnboarding = true
}) => {
  const { user, userProfile, merchantProfile, loading } = useAuth();

  // 1. Wait for Auth & DB checks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 font-medium animate-pulse">Securing your session...</p>
        </div>
      </div>
    );
  }

  // 2. Must be logged in
  if (!user) {
    return <LoginPage />;
  }

  // 3. Must not be suspended (Step 7)
  if (userProfile?.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-red-100">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h2>
          <p className="text-gray-600 mb-6">Your access to this business has been revoked by the administrator.</p>
        </div>
      </div>
    );
  }

  // 4. Check Roles (Step 5)
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-200">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You do not have the required permissions to view this page. Contact your administrator.</p>
          <button onClick={() => window.history.back()} className="text-indigo-600 font-medium hover:text-indigo-700">Go Back</button>
        </div>
      </div>
    );
  }

  // 5. Onboarding Gate (Step 4)
  if (requireOnboarding && merchantProfile && !merchantProfile.onboarding?.completed) {
    // If onboarding is required but not done, we would normally redirect to the /onboarding route here.
    // For now, we dispatch a generic event or you can replace this with React Router's <Navigate to="/onboarding" />
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'onboarding' }));
    return null;
  }

  return <>{children}</>;
};