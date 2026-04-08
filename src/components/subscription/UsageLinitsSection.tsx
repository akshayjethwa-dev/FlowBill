import React from 'react';
import { UsageLimit } from '../../types/subscription';

interface Props {
  limits: UsageLimit[];
}

export function UsageLimitsSection({ limits }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Usage Limits</h3>
      <p className="text-sm text-gray-500 mb-6">Track your current usage against your plan's limits.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {limits.map((limit, i) => {
          const percentage = Math.min(100, (limit.current / limit.max) * 100);
          const isNearLimit = percentage > 80;
          const isAtLimit = percentage >= 100;

          return (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-gray-700">{limit.name}</span>
                <span className={isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}>
                  {limit.current} / {limit.max} {limit.unit}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {isAtLimit && (
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                  Limit reached. Upgrade to increase.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}