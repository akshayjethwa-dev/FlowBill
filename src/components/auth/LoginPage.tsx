import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Smartphone, ArrowRight } from 'lucide-react';
import { BRAND_NAME } from '../../constants';

export const LoginPage: React.FC = () => {
  // ✅ Destructure registerWithEmail
  const { loginWithGoogle, loginWithEmail, registerWithEmail, loading } = useAuth();
  
  // ✅ Added toggle for Login / Signup mode
  const [isLogin, setIsLogin] = useState(true); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password); // ✅ Calls the new signup function
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding & Info (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-2xl">V</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">{BRAND_NAME}</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Grow your business <br /> with WhatsApp Native <br /> Invoicing.
          </h1>
          <p className="text-indigo-100 text-lg max-w-md">
            The simplest way for Indian micro-SMEs to manage orders, send invoices, and collect payments via UPI.
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-indigo-500/30 p-4 rounded-xl backdrop-blur-sm border border-indigo-400/20">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">WhatsApp Native</p>
              <p className="text-sm text-indigo-100">Send invoices directly to customers.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="max-w-md w-full">
          <div className="lg:hidden flex items-center gap-2 mb-12 justify-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">{BRAND_NAME}</span>
          </div>

          {/* ✅ Dynamic Header based on state */}
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-gray-500">
              {isLogin ? 'Sign in to manage your business ledger.' : 'Enter your email to get started.'}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400">Or continue with email</span>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}

            {/* ✅ Unified Email/Password Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@business.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <button disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70">
                {isSubmitting ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Sign Up')} <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* ✅ Toggle Button */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(''); // Clear errors when switching
                  }}
                  className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>

          <p className="mt-12 text-center text-xs text-gray-400">
            By continuing, you agree to our <br />
            <a href="#" className="underline hover:text-gray-600">Terms of Service</a> and <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};