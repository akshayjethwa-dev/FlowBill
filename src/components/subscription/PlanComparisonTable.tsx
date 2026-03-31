import React from 'react';
import { DetailedPlan } from '../../types/subscription';
import { Check, X } from 'lucide-react';

interface Props {
  plans: DetailedPlan[];
  currentPlanId: string;
  onUpgrade: (planId: string) => void;
}

export function PlanComparisonTable({ plans, currentPlanId, onUpgrade }: Props) {
  const featureNames = Array.from(
    new Set(plans.flatMap(p => p.detailedFeatures.map(f => f.name)))
  );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Compare Plans</h3>
      
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Features</th>
            {plans.map(plan => (
              <th key={plan.id} className="py-4 px-4 text-center">
                <div className="text-sm font-bold text-gray-900">{plan.name}</div>
                <div className="text-xs text-gray-500">${plan.price}/mo</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {featureNames.map(featureName => (
            <tr key={featureName} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 text-sm font-medium text-gray-700">{featureName}</td>
              {plans.map(plan => {
                const feature = plan.detailedFeatures.find(f => f.name === featureName);
                return (
                  <td key={plan.id} className="py-4 px-4 text-center">
                    {typeof feature?.included === 'string' ? (
                      <span className="text-sm font-semibold text-gray-900">{feature.included}</span>
                    ) : feature?.included ? (
                      <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full">
                        <Check size={14} />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-400 rounded-full">
                        <X size={14} />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="py-6 px-4"></td>
            {plans.map(plan => (
              <td key={plan.id} className="py-6 px-4 text-center">
                <button
                  disabled={plan.id === currentPlanId}
                  onClick={() => onUpgrade(plan.id)}
                  className={`w-full py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                    plan.id === currentPlanId
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {plan.id === currentPlanId ? 'Current' : 'Select Plan'}
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
