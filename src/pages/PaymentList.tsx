import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { usePayments } from '../hooks/usePayments';
import { 
  Plus, 
  CreditCard, 
  Search, 
  Filter, 
  X, 
  Calendar, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  SearchX, 
  Receipt,
  Trash2,
  Tag,
  Download,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentStatusBadge } from '../components/payments/PaymentStatusBadge';
import { AddPaymentModal } from '../components/payments/AddPaymentModal';
import { Payment } from '../types';

export const PaymentList: React.FC = () => {
  const { payments, loading, error, deletePayment } = usePayments();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch = 
        payment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesMethod = filterMethod === 'all' || payment.method === filterMethod;
      
      return matchesSearch && matchesMethod;
    });
  }, [payments, searchQuery, filterMethod]);

  const handleDelete = async (payment: Payment) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will also reverse the balance updates for the customer and invoice.')) return;
    try {
      await deletePayment(payment);
    } catch (err) {
      console.error('Failed to delete payment:', err);
      alert('Failed to delete payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Loading payments...</p>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Payment History" 
        subtitle="Track all incoming payments and customer receipts."
        actions={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {}} // Placeholder for export
              className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-gray-200"
              title="Export Report"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Record Payment</span>
            </button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Filters & Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, invoice #, or reference..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'upi', 'cash', 'bank_transfer', 'cheque', 'other'].map((method) => (
              <button
                key={method}
                onClick={() => setFilterMethod(method)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  filterMethod === method 
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                {method === 'all' ? 'All Methods' : method.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        {filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm text-center px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              {searchQuery ? <SearchX className="w-10 h-10" /> : <CreditCard className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No results found' : 'No payments recorded'}
            </h3>
            <p className="text-gray-500 max-w-xs mb-8">
              {searchQuery 
                ? `We couldn't find any payments matching "${searchQuery}". Try a different search.` 
                : "Start recording payments from your customers to track your cash flow and outstanding balances."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice / Ref</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">
                          {payment.paymentDate?.toDate?.()?.toLocaleDateString() || new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{payment.customerName}</p>
                      </td>
                      <td className="px-6 py-4">
                        {payment.invoiceNumber ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                            <Receipt className="w-3.5 h-3.5" />
                            {payment.invoiceNumber}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 font-medium">General Receipt</p>
                        )}
                        {payment.referenceNumber && (
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">Ref: {payment.referenceNumber}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg uppercase tracking-wider">
                            {payment.method.replace('_', ' ')}
                          </span>
                          <PaymentStatusBadge status={payment.status} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-bold text-green-600">₹{payment.amount.toLocaleString('en-IN')}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDelete(payment)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="View Details"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AddPaymentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </PageContainer>
  );
};
