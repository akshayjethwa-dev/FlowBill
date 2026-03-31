import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Customer } from '../../types';
import { X, Loader2, Save } from 'lucide-react';
import { motion } from 'motion/react';

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string()
    .min(10, "Phone must be at least 10 characters")
    .max(15, "Phone must be at most 15 characters")
    .regex(/^[0-9+\-\s()]*$/, "Invalid phone number format"),
  businessName: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  gstin: z.string().max(15, "GSTIN must be at most 15 characters").optional().or(z.literal('')),
  address: z.string().optional(),
  // ✅ FIXED: Removed the invalid_type_error object completely. 
  // React Hook Form's valueAsNumber will handle the conversion safely.
  creditDays: z.number().min(0, "Credit days cannot be negative"),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (data: CustomerFormValues) => Promise<void>;
  onClose: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSubmit, onClose }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name || '',
      phone: customer?.phone || '',
      businessName: customer?.businessName || '',
      email: customer?.email || '',
      gstin: customer?.gstin || '',
      address: customer?.address || '',
      creditDays: customer?.creditDays || 0,
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
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input
                  {...register("name")}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="Ravi Kumar"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <input
                  {...register("phone")}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Business & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Business Name</label>
                <input
                  {...register("businessName")}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ravi Traders"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                <input
                  {...register("email")}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="ravi@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
              </div>
            </div>

            {/* GSTIN & Credit Days */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">GSTIN</label>
                <input
                  {...register("gstin")}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.gstin ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all font-mono uppercase`}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                {errors.gstin && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.gstin.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Credit Days</label>
                <input
                  type="number"
                  {...register("creditDays", { valueAsNumber: true })} // valueAsNumber handles the string->number conversion natively
                  className={`w-full px-4 py-3 rounded-xl border ${errors.creditDays ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'} focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="30"
                />
                {errors.creditDays && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.creditDays.message}</p>}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Address</label>
              <textarea
                {...register("address")}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Complete business address..."
              />
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
            form="customer-form"
            disabled={isSubmitting}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {customer ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};