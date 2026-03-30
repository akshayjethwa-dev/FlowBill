import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Smartphone, Mail, ArrowRight } from 'lucide-react';
import { BRAND_NAME } from '../../constants';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loading } = useAuth();
  const [isEmailMode, setIsEmailMode] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to manage your business ledger.</p>
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
                <span className="px-2 bg-white text-gray-400">Or continue with</span>
              </div>
            </div>

            {isEmailMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@business.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                  Send Magic Link <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsEmailMode(false)}
                  className="w-full text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  Use Phone Number instead
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                  <div className="flex gap-2">
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium">+91</div>
                    <input 
                      type="tel" 
                      placeholder="98765 43210"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                  Get OTP <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsEmailMode(true)}
                  className="w-full text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  Use Email Address instead
                </button>
              </div>
            )}
          </div>

          <p className="mt-12 text-center text-xs text-gray-400">
            By signing in, you agree to our <br />
            <a href="#" className="underline hover:text-gray-600">Terms of Service</a> and <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};
