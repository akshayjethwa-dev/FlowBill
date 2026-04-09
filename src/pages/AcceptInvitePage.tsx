import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMembership } from '../hooks/useMembership';
import { CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';

interface AcceptInvitePageProps {
  token: string;
}

export const AcceptInvitePage: React.FC<AcceptInvitePageProps> = ({ token }) => {
  const { user, loginWithGoogle } = useAuth();
  const { acceptInvite, loading, error } = useMembership();
  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user && token && status === 'idle') {
      handleAccept();
    }
  }, [user, token]);

  const handleAccept = async () => {
    setStatus('accepting');
    const ok = await acceptInvite(token);
    if (ok) {
      setStatus('success');
      setMessage('You have successfully joined the workspace! Redirecting...');
      setTimeout(() => window.location.replace('/'), 2500);
    } else {
      setStatus('error');
      setMessage('This invite link is invalid or has expired. Please ask your owner to resend.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-50 to-white p-6">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-white text-2xl font-bold">FB</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">FlowBill Invitation</h1>

        {!user && (
          <>
            <p className="text-gray-500 text-sm">You've been invited to join a FlowBill workspace. Sign in to accept your invitation.</p>
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google to Accept
            </button>
          </>
        )}

        {user && status === 'idle' && (
          <p className="text-gray-500 text-sm">Preparing to join workspace...</p>
        )}

        {status === 'accepting' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-gray-500 text-sm">Accepting your invitation...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-green-700 font-medium">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="w-12 h-12 text-red-500" />
            <p className="text-red-600 text-sm font-medium">{message || error}</p>
            <a href="/" className="text-indigo-600 text-sm underline hover:text-indigo-800">Go to FlowBill Home</a>
          </div>
        )}
      </div>
    </div>
  );
};