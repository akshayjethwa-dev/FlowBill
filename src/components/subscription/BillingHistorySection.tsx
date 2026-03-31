import React from 'react';
import { BillingInvoice } from '../../types/subscription';
import { Download, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  history: BillingInvoice[];
}

export function BillingHistorySection({ history }: Props) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'pending': return <Clock size={14} className="text-yellow-500" />;
      case 'failed': return <AlertCircle size={14} className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Billing History</h3>
      
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice</th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={32} strokeWidth={1} />
                    No billing history found.
                  </div>
                </td>
              </tr>
            ) : (
              history.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">#{invoice.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(invoice.date), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">${invoice.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium capitalize">
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white border border-gray-100 rounded-lg shadow-sm">
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
