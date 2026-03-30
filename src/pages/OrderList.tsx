import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useOrders } from '../hooks/useOrders';
import { useEstimates } from '../hooks/useEstimates';
import { useInvoices } from '../hooks/useInvoices';
import { Plus, ShoppingBag, Search, Filter, X, Calendar, User, ArrowRight, AlertCircle, Loader2, SearchX, FileText, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OrderList: React.FC = () => {
  const { orders, loading, error, deleteOrder } = useOrders();
  const { createEstimateFromOrder } = useEstimates();
  const { createInvoice } = useInvoices();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const handleConvertToEstimate = async (order: any) => {
    setConvertingId(order.id);
    try {
      const estimate = await createEstimateFromOrder(order);
      if (estimate) {
        window.dispatchEvent(new CustomEvent('navigate', { detail: `estimate-detail:${estimate.id}` }));
      }
    } catch (err) {
      console.error('Failed to convert order to estimate:', err);
      alert('Failed to convert order to estimate. Please try again.');
    } finally {
      setConvertingId(null);
    }
  };

  const handleConvertToInvoice = async (order: any) => {
    setConvertingId(order.id);
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const invoice = await createInvoice({
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        invoiceNumber,
        items: order.items,
        totalAmount: order.totalAmount,
        paidAmount: 0,
        status: 'unpaid',
        dueDate,
        notes: order.notes || '',
      });

      if (invoice) {
        window.dispatchEvent(new CustomEvent('navigate', { detail: `invoice-detail:${invoice.id}` }));
      }
    } catch (err) {
      console.error('Failed to convert order to invoice:', err);
      alert('Failed to convert order to invoice. Please try again.');
    } finally {
      setConvertingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'confirmed': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'converted_to_invoice': return 'bg-green-50 text-green-700 border-green-100';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Loading your orders...</p>
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
        title="Orders" 
        subtitle="Track and manage customer orders and sales."
        actions={
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'create-order' }))}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Order</span>
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
              placeholder="Search by customer name or order ID..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'draft', 'confirmed', 'converted_to_invoice', 'cancelled'].map((status) => (
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

        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm text-center px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              {searchQuery ? <SearchX className="w-10 h-10" /> : <ShoppingBag className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No results found' : 'No orders yet'}
            </h3>
            <p className="text-gray-500 max-w-xs mb-8">
              {searchQuery 
                ? `We couldn't find any orders matching "${searchQuery}". Try a different search.` 
                : "Start taking orders from your customers. You can track their status and convert them to invoices later."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'create-order' }))}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                Create Your First Order
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 flex-shrink-0">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                            {order.customerName}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                            {order.status.toUpperCase().replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {order.orderDate?.toDate?.()?.toLocaleDateString() || 'No Date'}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            ID: {order.id.slice(-6).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-4 sm:pt-0">
                      <div className="text-right mr-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">₹ {order.totalAmount.toLocaleString('en-IN')}</p>
                      </div>
                      <button 
                        onClick={() => handleConvertToEstimate(order)}
                        disabled={convertingId === order.id}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50"
                        title="Convert to Estimate"
                      >
                        {convertingId === order.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={() => handleConvertToInvoice(order)}
                        disabled={convertingId === order.id}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50"
                        title="Convert to Invoice"
                      >
                        {convertingId === order.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt className="w-5 h-5" />}
                      </button>
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
