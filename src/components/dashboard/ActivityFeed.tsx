import React from 'react';
import { ActivityItem } from '../../types';
import { ShoppingCart, FileText, CreditCard, UserPlus, Clock } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const iconMap = {
  order: { icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  invoice: { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
  payment: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
  customer: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
      </div>
      
      <div className="p-6 space-y-6">
        {activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No recent activity.
          </div>
        ) : (
          activities.map((activity, idx) => {
            const config = iconMap[activity.type];
            const Icon = config.icon;
            return (
              <div key={activity.id} className="flex gap-4 relative">
                {idx !== activities.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-100" />
                )}
                
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${config.bg}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{activity.title}</p>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Just now
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.subtitle}</p>
                  {activity.status && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-gray-50 text-[10px] font-bold text-gray-500 rounded border border-gray-100">
                      {activity.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
