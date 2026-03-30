import React, { useState } from 'react';
import { Product } from '../../types';
import { X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: Omit<Product, 'id' | 'merchantId' | 'createdAt'>) => Promise<void>;
  onClose: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmit, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    unit: product?.unit || 'Pcs',
    price: product?.price || 0,
    gstRate: product?.gstRate || 18,
    isActive: product?.isActive ?? true,
  });

  const units = ['Pcs', 'Kg', 'Box', 'Ltr', 'Mtr', 'Set', 'Unit'];
  const gstRates = [0, 5, 12, 18, 28];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price < 0) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Product Name *</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="e.g. Wireless Mouse"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">SKU (Optional)</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="e.g. WM-001"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white"
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Price (₹) *</label>
              <input
                required
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">GST Rate (%)</label>
              <select
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white"
              >
                {gstRates.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`w-12 h-6 rounded-full transition-all relative ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
            </button>
            <span className="text-sm font-bold text-gray-700">Active Status</span>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (product ? 'Update' : 'Save')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
