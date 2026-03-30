import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: LucideIcon;
  color: 'indigo' | 'green' | 'red' | 'orange';
}

const colorMap = {
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
};

export const KPICard: React.FC<KPICardProps> = ({ title, value, trend, icon: Icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
          
          {trend && (
            <div className={`mt-2 flex items-center text-xs font-bold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              <span>{trend.value} from last month</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-xl border transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
