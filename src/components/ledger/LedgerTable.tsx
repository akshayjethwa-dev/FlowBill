import React from 'react';
import { CustomerLedgerEntry } from '../../types';
import { ArrowRight, User, AlertCircle, Calendar, Receipt } from 'lucide-react';

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
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outstanding</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overdue</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Payment</th>
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
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-900">₹{entry.outstandingAmount.toLocaleString('en-IN')}</p>
                </td>
                <td className="px-6 py-4">
                  <p className={`text-sm font-bold ${entry.overdueAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    ₹{entry.overdueAmount.toLocaleString('en-IN')}
                  </p>
                </td>
                <td className="px-6 py-4">
                  {entry.lastPaymentDate ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {entry.lastPaymentDate?.toDate?.()?.toLocaleDateString() || new Date(entry.lastPaymentDate).toLocaleDateString()}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium">No payments yet</p>
                  )}
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

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Outstanding</p>
          <p className="text-sm font-bold text-gray-900">₹{entry.outstandingAmount.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Overdue</p>
          <p className={`text-sm font-bold ${entry.overdueAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            ₹{entry.overdueAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </div>
  );
};
