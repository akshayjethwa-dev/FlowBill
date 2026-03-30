import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { CustomerCard } from '../components/customers/CustomerCard';
import { CustomerForm } from '../components/customers/CustomerForm';
import { CustomerFilters } from '../components/customers/CustomerFilters';
import { useCustomers } from '../hooks/useCustomers';
import { Plus, UserPlus, AlertCircle, Loader2, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CustomerList: React.FC = () => {
  const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        (customer.businessName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, filterStatus]);

  const handleAddCustomer = async (data: any) => {
    await addCustomer(data);
  };

  const handleUpdateCustomer = async (data: any) => {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, data);
    }
  };

  const openEditForm = (customer: any) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
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
        subtitle="Manage your client database and credit balances."
        actions={
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
        }
      />

      <div className="space-y-8">
        <CustomerFilters 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          filterStatus={filterStatus} 
          setFilterStatus={setFilterStatus} 
        />

        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm text-center px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              {searchQuery ? <SearchX className="w-10 h-10" /> : <UserPlus className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No results found' : 'No customers yet'}
            </h3>
            <p className="text-gray-500 max-w-xs mb-8">
              {searchQuery 
                ? `We couldn't find any customers matching "${searchQuery}". Try a different search.` 
                : "Start building your business by adding your first customer. You can track their orders and outstanding balances."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                Add Your First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.map((customer) => (
                <motion.div
                  key={customer.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <CustomerCard 
                    customer={customer} 
                    onEdit={openEditForm} 
                    onDelete={deleteCustomer} 
                    onViewDetail={(c) => console.log('View detail:', c)} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isFormOpen && (
        <CustomerForm 
          customer={editingCustomer}
          onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
          onClose={closeForm}
        />
      )}
    </PageContainer>
  );
};
