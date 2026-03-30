import React, { useState } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useEstimate, useEstimates } from '../hooks/useEstimates';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  User, 
  Receipt, 
  Tag, 
  Calculator, 
  Share2, 
  FileCheck, 
  AlertCircle, 
  Loader2, 
  Trash2,
  CheckCircle2,
  XCircle,
  Send
} from 'lucide-react';
import { motion } from 'motion/react';

interface EstimateDetailProps {
  estimateId: string;
}

export const EstimateDetail: React.FC<EstimateDetailProps> = ({ estimateId }) => {
  const { estimate, loading, error } = useEstimate(estimateId);
  const { updateEstimate, deleteEstimate, convertToInvoice } = useEstimates();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleStatusUpdate = async (newStatus: any) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await updateEstimate(estimateId, { status: newStatus });
    } catch (err) {
      setActionError('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this estimate?')) return;
    setActionLoading(true);
    try {
      await deleteEstimate(estimateId);
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'estimates' }));
    } catch (err) {
      setActionError('Failed to delete estimate.');
      setActionLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!estimate) return;
    setActionLoading(true);
    try {
      await convertToInvoice(estimate);
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoices' }));
    } catch (err) {
      setActionError('Failed to convert to invoice.');
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'sent': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'accepted': return 'bg-green-50 text-green-700 border-green-100';
      case 'declined': return 'bg-red-50 text-red-700 border-red-100';
      case 'converted_to_invoice': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading estimate details...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !estimate) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Estimate not found</h2>
          <p className="text-gray-500 mb-6">{error || 'The estimate you are looking for does not exist.'}</p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'estimates' }))}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl"
          >
            Back to Estimates
          </button>
        </div>
      </PageContainer>
    );
  }

  const subtotal = estimate.items.reduce((sum, item) => sum + item.amount, 0);
  const gstTotal = estimate.items.reduce((sum, item) => sum + (item.amount * item.gstRate / 100), 0);

  return (
    <PageContainer>
      <div className="mb-6">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'estimates' }))}
          className="flex items-center gap-2 text-gray-500 font-bold hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Estimates
        </button>
      </div>

      <PageHeader 
        title={estimate.estimateNumber} 
        subtitle={`Estimate for ${estimate.customerName}`}
        actions={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {}} // Placeholder for share
              className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-gray-200"
              title="Share Estimate"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleDelete}
              className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-gray-200"
              title="Delete Estimate"
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
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(estimate.status)}`}>
                    {estimate.status.toUpperCase().replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valid Until</p>
                  <p className="text-sm font-bold text-gray-900">
                    {estimate.validUntil?.toDate?.()?.toLocaleDateString() || new Date(estimate.validUntil).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Created On</p>
                  <p className="text-sm font-bold text-gray-900">
                    {estimate.createdAt?.toDate?.()?.toLocaleDateString() || new Date(estimate.createdAt).toLocaleDateString()}
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
                  <p className="text-sm font-bold text-gray-900">{estimate.customerName}</p>
                </div>
              </div>
              {estimate.orderId && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Source Order</p>
                    <p className="text-sm font-bold text-gray-900">#{estimate.orderId.slice(-6).toUpperCase()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-gray-900">Estimate Items</h3>
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
                  {estimate.items.map((item, index) => (
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
          {estimate.notes && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notes</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{estimate.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar Actions & Totals */}
        <div className="space-y-6">
          {/* Totals Card */}
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
                <span className="text-gray-500 font-medium">GST</span>
                <span className="font-bold text-gray-900">₹{gstTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-4 border-t border-dashed border-gray-200 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-indigo-600">₹{estimate.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {actionError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="font-medium">{actionError}</p>
              </div>
            )}

            {estimate.status === 'draft' && (
              <button
                onClick={() => handleStatusUpdate('sent')}
                disabled={actionLoading}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Mark as Sent
              </button>
            )}

            {estimate.status === 'sent' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleStatusUpdate('accepted')}
                  disabled={actionLoading}
                  className="py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Accept
                </button>
                <button
                  onClick={() => handleStatusUpdate('declined')}
                  disabled={actionLoading}
                  className="py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  Decline
                </button>
              </div>
            )}

            {estimate.status === 'accepted' && (
              <button
                onClick={handleConvertToInvoice}
                disabled={actionLoading}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
                Convert to Invoice
              </button>
            )}

            {estimate.status === 'converted_to_invoice' && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
                <p className="text-sm font-bold text-indigo-700">Converted to Invoice</p>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoices' }))}
                  className="text-xs font-bold text-indigo-500 mt-1 hover:underline"
                >
                  View Invoices
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
