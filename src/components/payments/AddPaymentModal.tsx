import React, { useState } from 'react';
import { 
  XCircle, 
  CreditCard, 
  User, 
  Receipt, 
  Calendar, 
  Tag, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePayments } from '../../hooks/usePayments';
import { useCustomers } from '../../hooks/useCustomers';
import { useInvoices } from '../../hooks/useInvoices';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvoiceId?: string;
  initialCustomerId?: string;
  initialAmount?: number;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  initialInvoiceId, 
  initialCustomerId,
  initialAmount 
}) => {
  const { recordPayment } = usePayments();
  const { customers } = useCustomers();
  const { invoices } = useInvoices();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    customerId: initialCustomerId || '',
    invoiceId: initialInvoiceId || '',
    amount: initialAmount || 0,
    method: 'upi' as const,
    referenceNumber: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const customerInvoices = invoices.filter(i => i.customerId === formData.customerId && i.status !== 'paid');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.amount <= 0) {
      setError('Please select a customer and enter a valid amount.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedInvoice = invoices.find(i => i.id === formData.invoiceId);
      
      await recordPayment({
        customerId: formData.customerId,
        customerName: selectedCustomer?.name || 'Unknown',
        invoiceId: formData.invoiceId || undefined,
        invoiceNumber: selectedInvoice?.invoiceNumber,
        amount: Number(formData.amount),
        method: formData.method,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
        status: 'completed',
        paymentDate: new Date(formData.paymentDate)
      });
      
      onClose();
    } catch (err) {
      setError('Failed to record payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Customer
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value, invoiceId: '' })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Invoice Selection (Optional) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-3 h-3" />
                    Link to Invoice
                  </label>
                  <select
                    value={formData.invoiceId}
                    onChange={(e) => {
                      const inv = invoices.find(i => i.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        invoiceId: e.target.value,
                        amount: inv ? (inv.totalAmount - (inv.paidAmount || 0)) : formData.amount
                      });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    disabled={!formData.customerId}
                  >
                    <option value="">General Payment (No Invoice)</option>
                    {customerInvoices.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.invoiceNumber} (Due: ₹{(i.totalAmount - (i.paidAmount || 0)).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    ₹ Amount
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    placeholder="0.00"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    Method
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    required
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    required
                  />
                </div>

                {/* Reference Number */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-3 h-3" />
                    Ref # (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    placeholder="Transaction ID, Cheque #"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold resize-none"
                  rows={3}
                  placeholder="Additional details..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Record Payment
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
