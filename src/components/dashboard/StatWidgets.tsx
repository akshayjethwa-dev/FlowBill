import React from 'react';
import { Calendar, AlertCircle, ArrowRight } from 'lucide-react';

interface StatWidgetProps {
  title: string;
  count: number;
  type: 'due' | 'overdue';
  onAction: () => void;
}

export const StatWidget: React.FC<StatWidgetProps> = ({ title, count, type, onAction }) => {
  const isDue = type === 'due';
  
  return (
    <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between group cursor-pointer transition-all hover:shadow-md ${
      isDue ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-red-100 text-gray-900'
    }`} onClick={onAction}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isDue ? 'bg-white/20' : 'bg-red-50 text-red-600'
        }`}>
          {isDue ? <Calendar className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <div>
          <p className={`text-sm font-medium ${isDue ? 'text-indigo-100' : 'text-gray-500'}`}>{title}</p>
          <p className="text-2xl font-bold tracking-tight">{count} Invoices</p>
        </div>
      </div>
      
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 ${
        isDue ? 'bg-white/10' : 'bg-gray-50 text-gray-400'
      }`}>
        <ArrowRight className="w-5 h-5" />
      </div>
    </div>
  );
};
