import React from 'react';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, CreditCard, ShieldCheck, Zap } from 'lucide-react';
import { useSubscription } from '../hooks/useSubsciption';
import { CurrentPlanCard } from '../components/subscription/CurrentPlanCard';
import { UsageLimitsSection } from '../components/subscription/UsageLinitsSection';
import { PlanComparisonTable } from '../components/subscription/PlanComparisonTable';
import { BillingHistorySection } from '../components/subscription/BillingHistorySection';

export function BillingPage() {
  const { details, history, plans, loading, error, upgradePlan } = useSubscription();

  if (loading && !details) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-center p-6 bg-red-50 rounded-2xl border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-red-900">Error Loading Billing Information</h3>
        <p className="text-red-700 mt-2 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Subscription & Billing</h2>
          <p className="text-sm text-gray-500">Manage your subscription plan, billing history, and usage limits.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 uppercase tracking-wider bg-green-50 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} /> Secure Billing
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-full">
            <Zap size={14} /> Instant Upgrades
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 space-y-8">
          {details && plans.length > 0 && (
            <CurrentPlanCard details={details} plans={plans} />
          )}
          
          {plans.length > 0 && details && (
            <PlanComparisonTable
              plans={plans}
              currentPlanId={details.currentPlanId}
              onUpgrade={upgradePlan}
            />
          )}

          <BillingHistorySection history={history} />
        </div>

        <div className="space-y-8">
          {details && (
            <UsageLimitsSection limits={details.usageLimits} />
          )}

          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Need more power?</h3>
              <p className="text-sm text-blue-100 mb-6">
                Upgrade to our Enterprise plan for custom workflows, API access, and dedicated support.
              </p>
              <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all shadow-sm">
                Contact Sales
              </button>
            </div>
            <CreditCard className="absolute -bottom-4 -right-4 text-blue-500 opacity-20 rotate-12" size={120} />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-gray-900 mb-4">Billing FAQs</h4>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-gray-700">Can I cancel anytime?</div>
                <div className="text-xs text-gray-500 mt-1">Yes, you can cancel your subscription at any time from the billing portal.</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-700">How do I get an invoice?</div>
                <div className="text-xs text-gray-500 mt-1">Invoices are automatically generated and available for download in the billing history section.</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-700">Do you offer refunds?</div>
                <div className="text-xs text-gray-500 mt-1">We offer a 14-day money-back guarantee for all our paid plans.</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
