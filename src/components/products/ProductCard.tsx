import React from 'react';
import { Product } from '../../types';
import { Package, Tag, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete, onToggleActive }) => {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden ${!product.isActive ? 'opacity-75 grayscale-[0.2]' : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${product.isActive ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                {product.name}
              </h3>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                {product.sku ? `SKU: ${product.sku}` : 'No SKU'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => onToggleActive(product.id, product.isActive)}
            title={`Click to mark as ${product.isActive ? 'Inactive' : 'Active'}`}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors cursor-pointer hover:shadow-sm ${
              product.isActive 
                ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' 
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {product.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {product.isActive ? 'ACTIVE' : 'INACTIVE'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</p>
            <p className="text-lg font-bold text-gray-900">₹ {product.price.toLocaleString('en-IN')}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit</p>
            <p className="text-sm font-bold text-gray-700">{product.unit}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold text-gray-500">GST: {product.gstRate}%</span>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(product)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Edit Product"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to completely delete this product? (Marking it inactive is recommended if it has been used in past invoices).')) {
                onDelete(product.id);
              }
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete Product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};