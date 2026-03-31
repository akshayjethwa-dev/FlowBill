import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Product } from '../../types';
import { X, Loader2, Save } from 'lucide-react';
import { motion } from 'motion/react';

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  unit: z.string().min(1, "Unit of measurement is required"),
  price: z.number().min(0, "Price cannot be negative"),
  gstRate: z.number().min(0, "GST Rate cannot be negative").max(100, "Invalid GST Rate"),
  isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: ProductFormValues) => Promise<void>;
  onClose: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmit, onClose }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      sku: product?.sku || '',
      unit: product?.unit || 'Nos',
      price: product?.price || 0,
      gstRate: product?.gstRate || 0,
      isActive: product ? product.isActive : true,
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
              <input
                {...register("name")}
                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all`}
                placeholder="E.g. Premium Basmati Rice"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
            </div>

            {/* SKU & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">SKU Code</label>
                <input
                  {...register("sku")}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono uppercase"
                  placeholder="PRD-001"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Unit <span className="text-red-500">*</span></label>
                <input
                  {...register("unit")}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.unit ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="Kg, Ltr, Box, Nos"
                />
                {errors.unit && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.unit.message}</p>}
              </div>
            </div>

            {/* Price & GST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Price (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  {...register("price", { valueAsNumber: true })}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.price ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="0.00"
                />
                {errors.price && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.price.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">GST Rate (%) <span className="text-red-500">*</span></label>
                <select
                  {...register("gstRate", { valueAsNumber: true })}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.gstRate ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all bg-white`}
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
                {errors.gstRate && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.gstRate.message}</p>}
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <input 
                type="checkbox" 
                id="isActive"
                {...register("isActive")}
                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm font-bold text-gray-900 cursor-pointer select-none">
                Product is Active
              </label>
              <p className="text-xs text-gray-500 ml-auto">Uncheck to hide from new invoices</p>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={isSubmitting}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {product ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};