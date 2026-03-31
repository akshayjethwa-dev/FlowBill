import React, { useState } from "react";
import { Customer } from "../types";
import { useCustomers } from "../hooks/useCustomers";
import { CustomerForm, CustomerFormValues } from "../components/customers/CustomerForm";
import { PageContainer, PageHeader } from "../components/layout/PageContainer";
import { Users, Search, AlertCircle, SearchX, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { AnimatePresence } from "motion/react";

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Customer["status"] }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    inactive: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.active}`}>
      {status || 'Active'}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerList() {
  const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer } = useCustomers();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.businessName?.toLowerCase().includes(q) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleFormSubmit = async (data: CustomerFormValues) => {
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, data);
      } else {
        await addCustomer({
          ...data,
          outstandingAmount: 0,
          status: 'active'
        });
      }
      setIsFormOpen(false);
      setEditingCustomer(null);
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save customer. Please try again.");
    }
  };

  const openAddForm = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Loading your customers...</p>
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
        title="Customers" 
        subtitle="Manage your client directory and track outstanding balances."
        actions={
          <button
            onClick={openAddForm}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
        }
      />

      <div className="space-y-6">
        {/* Search Bar */}
        {(customers.length > 0 || searchQuery) && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>
        )}

        {/* Empty States */}
        {customers.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm text-center px-6">
             <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300 mb-6">
               <Users className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">No customers yet</h3>
             <p className="text-gray-500 max-w-xs mb-8">
               Add your first customer to start creating invoices and tracking payments.
             </p>
             <button 
               onClick={openAddForm}
               className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
             >
               Add Your First Customer
             </button>
           </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-200">
            <SearchX className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No customers found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Name</th>
                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Phone</th>
                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] hidden sm:table-cell">Business</th>
                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] hidden md:table-cell text-right">Outstanding</th>
                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] hidden lg:table-cell text-center">Status</th>
                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}

                  {!loading && filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{customer.name}</div>
                        {customer.gstin && <div className="text-[10px] text-gray-400 font-mono font-bold mt-1">GST: {customer.gstin}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{customer.phone}</td>
                      <td className="px-6 py-4 text-gray-500 font-medium hidden sm:table-cell">{customer.businessName || "—"}</td>
                      <td className="px-6 py-4 hidden md:table-cell text-right">
                        <span className={customer.outstandingAmount > 0 ? "text-red-600 font-bold" : "text-gray-400 font-medium"}>
                          {customer.outstandingAmount > 0 ? `₹${customer.outstandingAmount.toLocaleString("en-IN")}` : "₹0"}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-center">
                        <StatusBadge status={customer.status || 'active'} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            onClick={() => openEditForm(customer)}
                            title="Edit Customer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this customer?")) {
                                deleteCustomer(customer.id);
                              }
                            }}
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <CustomerForm
            customer={editingCustomer}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleFormSubmit}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  );
}