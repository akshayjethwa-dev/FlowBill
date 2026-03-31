import React from 'react';
import { Check, CreditCard, ExternalLink } from 'lucide-react';
import { SubscriptionPlan } from '../../types/settings';

interface Props {
  plans: SubscriptionPlan[];
  currentPlanId: string;
  onUpgrade: (planId: string) => void;
}

export function SubscriptionSection({ plans, currentPlanId, onUpgrade }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Subscription Plan</h3>
          <p className="text-sm text-gray-500">Manage your billing and account limits.</p>
        </div>
        <button
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
        >
          <CreditCard size={16} className="mr-2" />
          Billing Portal
          <ExternalLink size={14} className="ml-2 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative p-4 border rounded-xl transition-all ${
              plan.id === currentPlanId
                ? 'border-blue-600 bg-blue-50/30'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {plan.id === currentPlanId && (
              <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Current
              </span>
            )}
            <div className="text-sm font-bold text-gray-900">{plan.name}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
              <span className="text-xs text-gray-500">/{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <Check size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.id === currentPlanId}
              onClick={() => onUpgrade(plan.id)}
              className={`mt-6 w-full py-2 rounded-lg text-sm font-medium transition-all ${
                plan.id === currentPlanId
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {plan.id === currentPlanId ? 'Current Plan' : 'Upgrade Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
