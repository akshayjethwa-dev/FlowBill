import React, { useState } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useInvoice, useInvoices } from '../hooks/useInvoices';
import { usePayments } from '../hooks/usePayments'; // ✅ Added Payments Hook
import { invoiceService } from '../services/invoiceService'; // ✅ Added invoiceService import
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  User, 
  Receipt, 
  Tag, 
  Calculator, 
  Share2, 
  Download, 
  AlertCircle, 
  Loader2, 
  Trash2,
  CheckCircle2,
  Send,
  CreditCard,
  Edit2
} from 'lucide-react';
import { InvoiceStatusBadge } from '../components/invoices/InvoiceStatusBadge';
import { AddPaymentModal } from '../components/payments/AddPaymentModal';

interface InvoiceDetailProps {
  invoiceId: string;
}

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId }) => {
  const { invoice, loading, error } = useInvoice(invoiceId);
  const { updateInvoice, deleteInvoice } = useInvoices();
  const { payments } = usePayments(); // ✅ Fetch Payments

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false); // ✅ Added PDF loading state

  const handleStatusUpdate = async (newStatus: any) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await updateInvoice(invoiceId, { status: newStatus });
    } catch (err) {
      setActionError('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    setActionLoading(true);
    try {
      await deleteInvoice(invoiceId);
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoices' }));
    } catch (err) {
      setActionError('Failed to delete invoice.');
      setActionLoading(false);
    }
  };

  // ✅ Added PDF Download Handler
  const handleDownloadPdf = async () => {
    if (!invoice) return;
    
    setPdfLoading(true);
    setActionError(null);
    try {
      // 1. Generate if it doesn't exist or needs regeneration
      if (!invoice.pdfStoragePath) {
        await invoiceService.generatePdf(invoiceId);
      }
      
      // 2. Fetch secure Signed URL
      const { url } = await invoiceService.getPdfUrl(invoiceId);
      
      // 3. Open in new tab to download/view
      window.open(url, '_blank');
    } catch (err) {
      console.error("PDF Download Error:", err);
      setActionError('Failed to prepare PDF document.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading invoice details...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !invoice) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice not found</h2>
          <p className="text-gray-500 mb-6">{error || 'The invoice you are looking for does not exist.'}</p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoices' }))}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl"
          >
            Back to Invoices
          </button>
        </div>
      </PageContainer>
    );
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  const gstTotal = invoice.items.reduce((sum, item) => sum + (item.amount * item.gstRate / 100), 0);
  const balanceDue = invoice.totalAmount - (invoice.paidAmount || 0);

  // Filter payments specifically for this invoice
  const invoicePayments = payments.filter(p => p.invoiceId === invoiceId);

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
        title={invoice.invoiceNumber} 
        subtitle={`Invoice for ${invoice.customerName}`}
        actions={
          <div className="flex items-center gap-2">
            <button 
              className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-gray-200"
              title="Share Invoice"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-gray-200 disabled:opacity-50"
              title="Download PDF"
            >
              {pdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleDelete}
              className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-gray-200"
              title="Delete Invoice"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Status & Info Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due Date</p>
                  <p className={`text-sm font-bold ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                    {invoice.dueDate?.toDate?.()?.toLocaleDateString() || new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Created On</p>
                  <p className="text-sm font-bold text-gray-900">
                    {invoice.createdAt?.toDate?.()?.toLocaleDateString() || new Date(invoice.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                  <p className="text-sm font-bold text-gray-900">{invoice.customerName}</p>
                </div>
              </div>
              {invoice.orderId && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Reference</p>
                    <p className="text-sm font-bold text-gray-900">#{invoice.orderId.slice(-6).toUpperCase()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-gray-900">Invoice Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Qty</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Rate</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        <p className="text-[10px] text-gray-400">GST: {item.gstRate}%</p>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">{item.qty}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-700">₹{item.rate.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-indigo-600">₹{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notes</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{invoice.notes}</p>
            </div>
          )}

          {/* Linked Payments Table */}
          {invoicePayments.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">Payments Received</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ref</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoicePayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {payment.paymentDate?.toDate?.()?.toLocaleDateString() || new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-600 uppercase">
                          {payment.method.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {payment.referenceNumber || '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-green-600">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Actions & Totals */}
        <div className="space-y-6">
          {/* Payment Status Card */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Payment Status</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Total Amount</span>
                <span className="font-bold text-gray-900">₹{invoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Paid Amount</span>
                <span className="font-bold text-green-600">₹{(invoice.paidAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-4 border-t border-dashed border-gray-200 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Balance Due</span>
                <span className={`text-2xl font-bold ${balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  ₹{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {actionError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="font-medium">{actionError}</p>
              </div>
            )}

            {invoice.status === 'draft' && (
              <>
                <button
                  onClick={() => handleStatusUpdate('sent')}
                  disabled={actionLoading}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Mark as Sent
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: `edit-invoice:${invoice.id}` }))}
                  className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Edit2 className="w-5 h-5" />
                  Edit Draft
                </button>
              </>
            )}

            {balanceDue > 0 && invoice.status !== 'draft' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={actionLoading}
                className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                Record Payment
              </button>
            )}

            {invoice.status === 'paid' && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm font-bold text-green-700">Fully Paid</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddPaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        initialInvoiceId={invoice.id}
        initialCustomerId={invoice.customerId}
        initialAmount={balanceDue}
      />
    </PageContainer>
  );
};