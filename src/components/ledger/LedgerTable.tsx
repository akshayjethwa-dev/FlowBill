import React from 'react';
import { CustomerLedgerEntry } from '../../types';
import { ArrowRight, Receipt } from 'lucide-react';

interface LedgerTableProps {
  data: CustomerLedgerEntry[];
  onViewCustomer: (id: string) => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ data, onViewCustomer }) => {
  return (
    <div className="hidden md:block bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">0-30 Days</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">31-60 Days</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">61-90 Days</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">90+ Days</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-800 uppercase tracking-wider text-right">Total Outstanding</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((entry) => (
              <tr key={entry.customerId} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {entry.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{entry.customerName}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
                        <Receipt className="w-3 h-3" />
                        {entry.invoiceCount} Unpaid Invoices
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-sm font-medium ${entry.buckets['0_30'] > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    ₹{entry.buckets['0_30'].toLocaleString('en-IN')}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-sm font-medium ${entry.buckets['31_60'] > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
                    ₹{entry.buckets['31_60'].toLocaleString('en-IN')}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-sm font-medium ${entry.buckets['61_90'] > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                    ₹{entry.buckets['61_90'].toLocaleString('en-IN')}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-sm font-bold ${entry.buckets['90_plus'] > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                    ₹{entry.buckets['90_plus'].toLocaleString('en-IN')}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="text-sm font-bold text-gray-900">₹{entry.outstandingAmount.toLocaleString('en-IN')}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onViewCustomer(entry.customerId)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const LedgerCard: React.FC<{ entry: CustomerLedgerEntry; onClick: () => void }> = ({ entry, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="md:hidden bg-white p-6 rounded-3xl border border-gray-200 shadow-sm active:scale-95 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
            {entry.customerName.charAt(0)}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{entry.customerName}</h3>
            <p className="text-xs text-gray-400 font-medium">{entry.invoiceCount} Unpaid Invoices</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-300" />
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-2 pt-4 border-t border-gray-50 mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">0-30 Days</p>
          <p className="text-sm font-medium text-gray-700">₹{entry.buckets['0_30'].toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">31-60 Days</p>
          <p className="text-sm font-medium text-yellow-600">₹{entry.buckets['31_60'].toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">61-90 Days</p>
          <p className="text-sm font-medium text-orange-600">₹{entry.buckets['61_90'].toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">90+ Days</p>
          <p className="text-sm font-bold text-red-600">₹{entry.buckets['90_plus'].toLocaleString('en-IN')}</p>
        </div>
      </div>
      
      <div className="pt-4 border-t border-dashed border-gray-200 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Outstanding</span>
        <span className="text-lg font-bold text-gray-900">₹{entry.outstandingAmount.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
};