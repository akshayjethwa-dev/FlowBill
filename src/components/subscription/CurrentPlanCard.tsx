import React from 'react';
import { DetailedPlan, SubscriptionDetails } from '../../types/subscription';
import { Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  details: SubscriptionDetails;
  plans: DetailedPlan[];
}

export function CurrentPlanCard({ details, plans }: Props) {
  const currentPlan = plans.find(p => p.id === details.currentPlanId);
  const isPastDue = details.status === 'past_due';

  if (!currentPlan) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full">
              Current Plan
            </span>
            {isPastDue && (
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle size={12} /> Past Due
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{currentPlan.name}</h3>
          <p className="text-sm text-gray-500">{currentPlan.description}</p>
        </div>

        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Calendar className="text-blue-600" size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Next Billing Date</div>
            <div className="text-sm font-semibold text-gray-900">
              {format(new Date(details.nextBillingDate), 'MMM dd, yyyy')}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <h4 className="text-sm font-bold text-gray-900 mb-4">Plan Features</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {currentPlan.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
