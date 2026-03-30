import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { useCustomers } from '../../hooks/useCustomers';
import { Search, User, Check } from 'lucide-react';

interface CustomerSelectorProps {
  selectedCustomerId?: string;
  onSelect: (customer: Customer) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({ selectedCustomerId, onSelect }) => {
  const { customers, loading } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    (c.businessName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="relative">
      <label className="text-sm font-bold text-gray-700 mb-1.5 block">Select Customer *</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-left flex items-center justify-between hover:border-indigo-300 transition-all outline-none"
      >
        {selectedCustomer ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
              {selectedCustomer.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{selectedCustomer.name}</p>
              <p className="text-[10px] text-gray-500">{selectedCustomer.phone}</p>
            </div>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">Choose a customer...</span>
        )}
        <Search className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No customers found</div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onSelect(customer);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-indigo-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-xs">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{customer.name}</p>
                      <p className="text-[10px] text-gray-500">{customer.businessName || customer.phone}</p>
                    </div>
                  </div>
                  {selectedCustomerId === customer.id && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
