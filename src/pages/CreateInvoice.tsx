import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useInvoices } from '../hooks/useInvoices';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import { Customer, OrderItem, Product } from '../types';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Trash2, 
  Calculator, 
  Save, 
  User, 
  Package, 
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CreateInvoice: React.FC = () => {
  const { createInvoice } = useInvoices();    
  const { customers } = useCustomers();
  const { products } = useProducts();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showProductList, setShowProductList] = useState(false);

  const filteredCustomers = useMemo(() => 
    customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch]
  );

  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.isActive),
    [products, productSearch]
  );

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items]);
  const gstTotal = useMemo(() => items.reduce((sum, item) => sum + (item.amount * item.gstRate / 100), 0), [items]);
  const totalAmount = subtotal + gstTotal;

  const addItem = (product: Product) => {
    const existingItem = items.find(item => item.productId === product.id);
    if (existingItem) {
      setItems(items.map(item => 
        item.productId === product.id 
          ? { ...item, qty: item.qty + 1, amount: (item.qty + 1) * item.rate }
          : item
      ));
    } else {
      setItems([...items, {
        productId: product.id,
        name: product.name,
        qty: 1,
        rate: product.price,
        gstRate: product.gstRate || 0, // Fallback to 0 if gstRate is missing
        amount: product.price
      }]);
    }
    setShowProductList(false);
    setProductSearch('');
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty < 1) return;
    setItems(items.map(item => 
      item.productId === productId 
        ? { ...item, qty, amount: qty * item.rate }
        : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const handleSave = async (status: 'draft' | 'sent' | 'unpaid' | 'partial' | 'paid' = 'unpaid') => {
    if (!selectedCustomer || items.length === 0) return;

    setIsSaving(true);
    try {
      // ✅ Removed local invoice generation! 
      // DueDate converted to ISOString so it can safely pass through the network call to Cloud Function
      const result = await createInvoice({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        items,
        totalAmount,
        paidAmount: 0,
        status,
        dueDate: new Date(dueDate).toISOString() as any, 
        notes,
      });

      setShowSuccess(true);
      setTimeout(() => {
        // ✅ Uses backend response to navigate directly to the detailed view of the new invoice!
        window.dispatchEvent(new CustomEvent('navigate', { detail: `invoice-detail:${result?.invoiceId || ''}` }));
      }, 1500);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert("Failed to create invoice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md w-full border border-green-100"
        >
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Created!</h2>
          <p className="text-gray-500 font-medium">Your invoice has been generated successfully. Redirecting to your invoice details...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoices' }))}
          className="flex items-center gap-2 text-gray-500 font-bold hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Invoices
        </button>
      </div>

      <PageHeader 
        title="Create New Invoice" 
        subtitle="Generate a formal invoice for your customer."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Selection */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900">Customer Details</h3>
            </div>
            
            {!selectedCustomer ? (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerList(true);
                  }}
                  onFocus={() => setShowCustomerList(true)}
                  placeholder="Search customer by name..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                />
                
                <AnimatePresence>
                  {showCustomerList && customerSearch && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl max-h-60 overflow-y-auto"
                    >
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No customers found</div>
                      ) : (
                        filteredCustomers.map(customer => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowCustomerList(false);
                              setCustomerSearch(''); // Clear search for next time
                            }}
                            className="w-full p-4 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                          >
                            <div>
                              <p className="font-bold text-gray-900">{customer.name}</p>
                              <p className="text-xs text-gray-500">{customer.phone}</p>
                            </div>
                            <Plus className="w-4 h-4 text-indigo-600" />
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm font-bold text-xl">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedCustomer.name}</p>
                    <p className="text-xs text-indigo-600 font-medium">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Remove Customer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Product Selection & Items */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Line Items</h3>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowProductList(!showProductList)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
                
                <AnimatePresence>
                  {showProductList && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-50 right-0 mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            autoFocus
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">No products found</div>
                        ) : (
                          filteredProducts.map(product => (
                            <button
                              key={product.id}
                              onClick={() => addItem(product)}
                              className="w-full p-3 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                            >
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{product.name}</p>
                                <p className="text-xs text-gray-500">₹{product.price} / {product.unit}</p>
                              </div>
                              <Plus className="w-4 h-4 text-indigo-600" />
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No items added yet. Click 'Add Product' to begin.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500 font-medium">Rate: ₹{item.rate} • GST: {item.gstRate}%</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      <div className="flex items-center bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <button 
                          onClick={() => updateItemQty(item.productId, item.qty - 1)}
                          className="px-3 py-1.5 hover:bg-gray-50 text-gray-500 transition-colors"
                        >
                          -
                        </button>
                        <span className="px-3 py-1.5 font-bold text-gray-900 text-sm border-x border-gray-100 min-w-10 text-center">
                          {item.qty}
                        </span>
                        <button 
                          onClick={() => updateItemQty(item.productId, item.qty + 1)}
                          className="px-3 py-1.5 hover:bg-gray-50 text-gray-500 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right min-w-20">
                        <p className="font-bold text-indigo-600 text-sm">₹{item.amount.toLocaleString('en-IN')}</p>
                      </div>
                      <button 
                        onClick={() => removeItem(item.productId)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Additional Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add terms, bank details, or special instructions..."
              className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none min-h-[120px] text-sm resize-y"
            />
          </div>
        </div>

        {/* Sidebar: Summary & Actions */}
        <div className="space-y-6">
          {/* Due Date Selection */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900">Due Date</h3>
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-700 cursor-pointer"
            />
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Summary</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Subtotal</span>
                <span className="font-bold text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">GST Total</span>
                <span className="font-bold text-gray-900">₹{gstTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-4 border-t border-dashed border-gray-200 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-indigo-600">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleSave('unpaid')}
              disabled={isSaving || !selectedCustomer || items.length === 0}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Generate Invoice
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={isSaving || !selectedCustomer || items.length === 0}
              className="w-full py-4 bg-white text-gray-600 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
          </div>

          {(!selectedCustomer || items.length === 0) && (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3 text-orange-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="font-medium">Please select a customer and add at least one item to generate an invoice.</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};