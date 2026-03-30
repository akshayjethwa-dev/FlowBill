import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useInvoices } from '../hooks/useInvoices';
import { Plus, FileText, Search, Filter, X, Calendar, User, ArrowRight, AlertCircle, Loader2, SearchX, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InvoiceStatusBadge } from '../components/invoices/InvoiceStatusBadge';

export const InvoiceList: React.FC = () => {
  const { invoices, loading, error } = useInvoices();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch = 
        invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, filterStatus]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Loading your invoices...</p>
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
        title="Invoices" 
        subtitle="Manage your formal invoices and track payments."
        actions={
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'create-invoice' }))}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Invoice</span>
          </button>
        }
      />

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or invoice #..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'draft', 'sent', 'unpaid', 'partial', 'paid', 'overdue'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  filterStatus === status 
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm text-center px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              {searchQuery ? <SearchX className="w-10 h-10" /> : <Receipt className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No results found' : 'No invoices yet'}
            </h3>
            <p className="text-gray-500 max-w-xs mb-8">
              {searchQuery 
                ? `We couldn't find any invoices matching "${searchQuery}". Try a different search.` 
                : "Create formal invoices for your customers. You can track their payment status and send reminders."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'create-invoice' }))}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                Create Your First Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredInvoices.map((invoice) => (
                <motion.div
                  key={invoice.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: `invoice-detail:${invoice.id}` }))}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                            {invoice.customerName}
                          </h3>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Due: {invoice.dueDate?.toDate?.()?.toLocaleDateString() || new Date(invoice.dueDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {invoice.invoiceNumber}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">₹ {invoice.totalAmount.toLocaleString('en-IN')}</p>
                      </div>
                      <button 
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="View Details"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
