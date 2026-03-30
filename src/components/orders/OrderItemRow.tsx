import React from 'react';
import { OrderItem } from '../../types';
import { Trash2, Minus, Plus } from 'lucide-react';

interface OrderItemRowProps {
  item: OrderItem;
  onUpdate: (updates: Partial<OrderItem>) => void;
  onRemove: () => void;
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({ item, onUpdate, onRemove }) => {
  const handleQtyChange = (newQty: number) => {
    if (newQty < 1) return;
    const amount = newQty * item.rate;
    onUpdate({ qty: newQty, amount });
  };

  const handleRateChange = (newRate: number) => {
    if (newRate < 0) return;
    const amount = item.qty * newRate;
    onUpdate({ rate: newRate, amount });
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-gray-900 leading-tight">{item.name}</h4>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-1">
            GST: {item.gstRate}% • Rate: ₹{item.rate}
          </p>
        </div>
        <button 
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
          <button 
            onClick={() => handleQtyChange(item.qty - 1)}
            className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-500 hover:text-indigo-600"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input 
            type="number" 
            value={item.qty}
            onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
            className="w-12 text-center bg-transparent text-sm font-bold text-gray-900 outline-none"
          />
          <button 
            onClick={() => handleQtyChange(item.qty + 1)}
            className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-500 hover:text-indigo-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-end gap-2">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</p>
            <p className="text-sm font-bold text-indigo-600">₹{item.amount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
