import React, { useState } from 'react';
import { Product } from '../../types';
import { useProducts } from '../../hooks/useProducts';
import { Search, Package, Check, Plus } from 'lucide-react';

interface ProductSelectorProps {
  onSelect: (product: Product) => void;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({ onSelect }) => {
  const { products, loading } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const activeProducts = products.filter(p => p.isActive);
  const filteredProducts = activeProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-indigo-50 text-indigo-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all active:scale-95 border-2 border-dashed border-indigo-200"
      >
        <Plus className="w-5 h-5" />
        Add Product to Order
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full pl-9 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:border-indigo-500/30"
              />
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No active products found</div>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-gray-50">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onSelect(product);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-indigo-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-indigo-600 transition-all border border-transparent group-hover:border-indigo-100">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{product.name}</p>
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          {product.sku ? `SKU: ${product.sku}` : 'No SKU'} • ₹{product.price}/{product.unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-600">₹{product.price}</p>
                      <p className="text-[10px] text-gray-400">GST: {product.gstRate}%</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
