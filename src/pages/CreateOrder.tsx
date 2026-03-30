import React, { useState } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { CustomerSelector } from '../components/orders/CustomerSelector';
import { ProductSelector } from '../components/orders/ProductSelector';
import { OrderItemRow } from '../components/orders/OrderItemRow';
import { OrderTotals } from '../components/orders/OrderTotals';
import { useOrders } from '../hooks/useOrders';
import { Customer, Product, OrderItem } from '../types';
import { Save, FileText, X, Loader2, AlertCircle, ShoppingBag, FileCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Timestamp } from 'firebase/firestore';

export const CreateOrder: React.FC = () => {
  const { addOrder } = useOrders();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddProduct = (product: Product) => {
    const existingItemIndex = items.findIndex(i => i.productId === product.id);
    
    if (existingItemIndex > -1) {
      const newItems = [...items];
      newItems[existingItemIndex].qty += 1;
      newItems[existingItemIndex].amount = newItems[existingItemIndex].qty * newItems[existingItemIndex].rate;
      setItems(newItems);
    } else {
      setItems([...items, {
        productId: product.id,
        name: product.name,
        qty: 1,
        rate: product.price,
        gstRate: product.gstRate,
        amount: product.price
      }]);
    }
  };

  const handleUpdateItem = (index: number, updates: Partial<OrderItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const gstTotal = items.reduce((sum, item) => sum + (item.amount * item.gstRate / 100), 0);
    return subtotal + gstTotal;
  };

  const handleSubmit = async (status: 'draft' | 'confirmed') => {
    if (!selectedCustomer) {
      setError('Please select a customer first.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one product to the order.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addOrder({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        items,
        totalAmount: calculateTotal(),
        status,
        notes,
        orderDate: Timestamp.fromDate(new Date(orderDate))
      });
      setSuccess(true);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'orders' }));
      }, 1500);
    } catch (err) {
      setError('Failed to save order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-green-100 shadow-sm text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce">
            <FileCheck className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Created Successfully!</h2>
          <p className="text-gray-500 mb-8">Redirecting you back to the order list...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Create New Order" 
        subtitle="Draft a new order for your customer."
        actions={
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'orders' }))}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Customer & Date */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CustomerSelector 
                selectedCustomerId={selectedCustomer?.id} 
                onSelect={setSelectedCustomer} 
              />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Order Date *</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                Order Items
              </h3>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {items.length} Items Added
              </span>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <motion.div
                    key={`${item.productId}-${index}`}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <OrderItemRow 
                      item={item} 
                      onUpdate={(updates) => handleUpdateItem(index, updates)}
                      onRemove={() => handleRemoveItem(index)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              <ProductSelector onSelect={handleAddProduct} />
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <label className="text-sm font-bold text-gray-700 mb-2 block">Order Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes for this order..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Totals & Actions */}
        <div className="space-y-6">
          <OrderTotals items={items} />

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleSubmit('confirmed')}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Confirm & Save Order
            </button>
            <button
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="w-full py-4 bg-white text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
              Save as Draft
            </button>
          </div>

          <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <button disabled className="w-full text-left px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed flex items-center justify-between">
                Convert to Estimate
                <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded">SOON</span>
              </button>
              <button disabled className="w-full text-left px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed flex items-center justify-between">
                Convert to Invoice
                <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded">SOON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
