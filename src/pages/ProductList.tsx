import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { ProductCard } from '../components/products/ProductCard';
import { ProductForm } from '../components/products/ProductForm';
import { ProductFilters } from '../components/products/ProductFilters';
import { useProducts } from '../hooks/useProducts';
import { Plus, PackagePlus, AlertCircle, Loader2, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ProductList: React.FC = () => {
  const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'active' && product.isActive) || 
        (filterStatus === 'inactive' && !product.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, filterStatus]);

  const handleAddProduct = async (data: any) => {
    await addProduct(data);
  };

  const handleUpdateProduct = async (data: any) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    }
  };

  const openEditForm = (product: any) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Loading your catalog...</p>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Product Catalog" 
        subtitle="Manage your inventory, pricing, and GST details."
        actions={
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        }
      />

      <div className="space-y-8">
        <ProductFilters 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          filterStatus={filterStatus} 
          setFilterStatus={setFilterStatus} 
        />

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm text-center px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              {searchQuery ? <SearchX className="w-10 h-10" /> : <PackagePlus className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No results found' : 'No products yet'}
            </h3>
            <p className="text-gray-500 max-w-xs mb-8">
              {searchQuery 
                ? `We couldn't find any products matching "${searchQuery}". Try a different search.` 
                : "Start building your catalog by adding your first product. You can use these products to create orders and invoices."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProductCard 
                    product={product} 
                    onEdit={openEditForm} 
                    onDelete={deleteProduct} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isFormOpen && (
        <ProductForm 
          product={editingProduct}
          onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
          onClose={closeForm}
        />
      )}
    </PageContainer>
  );
};
