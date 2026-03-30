import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface CustomerFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
}

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({ searchQuery, setSearchQuery, filterStatus, setFilterStatus }) => {
  const statuses = [
    { id: 'all', label: 'All Customers' },
    { id: 'active', label: 'Active' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'inactive', label: 'Inactive' },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone or business..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 shrink-0 mr-2 border-r border-gray-200 pr-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter</span>
        </div>
        
        {statuses.map((status) => (
          <button
            key={status.id}
            onClick={() => setFilterStatus(status.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
              filterStatus === status.id 
                ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100' 
                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>
    </div>
  );
};
