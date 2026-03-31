import React from 'react';
import { AgingBucket } from '../../types';
import { TrendingUp, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface AgingSummaryCardsProps {
  buckets: AgingBucket[];
  totalOutstanding: number;
  overdueAmount: number;
}

export const AgingSummaryCards: React.FC<AgingSummaryCardsProps> = ({ buckets, totalOutstanding, overdueAmount }) => {
  // Safely handle empty buckets array when there are no invoices yet
  const b0Amount = buckets[0]?.amount || 0;
  const b1Amount = buckets[1]?.amount || 0;
  const b2Amount = buckets[2]?.amount || 0;
  const b3Amount = buckets[3]?.amount || 0;

  const b0Count = buckets[0]?.count || 0;
  const b1Count = buckets[1]?.count || 0;
  const b2Count = buckets[2]?.count || 0;
  const b3Count = buckets[3]?.count || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Outstanding */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Outstanding</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900">₹{totalOutstanding.toLocaleString('en-IN')}</h3>
        <p className="text-xs text-gray-400 mt-1 font-medium">Across all customers</p>
      </div>

      {/* Overdue Amount */}
      <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Overdue</span>
        </div>
        <h3 className="text-2xl font-bold text-red-600">₹{overdueAmount.toLocaleString('en-IN')}</h3>
        <p className="text-xs text-red-400 mt-1 font-medium">Immediate attention needed</p>
      </div>

      {/* Aging Breakdown (0-60) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">0-60 Days</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900">₹{(b0Amount + b1Amount).toLocaleString('en-IN')}</h3>
        <p className="text-xs text-gray-400 mt-1 font-medium">{b0Count + b1Count} Invoices</p>
      </div>

      {/* Aging Breakdown (60+) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">60+ Days</span>
        </div>
        <h3 className="text-2xl font-bold text-orange-600">₹{(b2Amount + b3Amount).toLocaleString('en-IN')}</h3>
        <p className="text-xs text-orange-400 mt-1 font-medium">{b2Count + b3Count} Invoices</p>
      </div>
    </div>
  );
};