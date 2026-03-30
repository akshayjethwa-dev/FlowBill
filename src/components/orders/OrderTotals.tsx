import React from 'react';
import { OrderItem } from '../../types';
import { Calculator, Receipt, Tag } from 'lucide-react';

interface OrderTotalsProps {
  items: OrderItem[];
}

export const OrderTotals: React.FC<OrderTotalsProps> = ({ items }) => {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const gstTotal = items.reduce((sum, item) => sum + (item.amount * item.gstRate / 100), 0);
  const total = subtotal + gstTotal;

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-gray-900">Order Summary</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items</p>
          <p className="text-sm font-bold text-gray-900">{items.length}</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <Receipt className="w-4 h-4" />
            Subtotal
          </div>
          <span className="font-bold text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <Tag className="w-4 h-4" />
            Estimated GST
          </div>
          <span className="font-bold text-gray-900">₹{gstTotal.toLocaleString('en-IN')}</span>
        </div>

        <div className="pt-4 border-t border-dashed border-gray-200 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">Total Amount</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-indigo-600 tracking-tight">₹{total.toLocaleString('en-IN')}</span>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Incl. all taxes</p>
          </div>
        </div>
      </div>
    </div>
  );
};
