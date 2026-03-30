import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useLedger } from '../hooks/useLedger';
import { 
  Search, 
  Filter, 
  Download, 
  AlertCircle, 
  Loader2, 
  SearchX, 
  TrendingUp,
  ArrowRight,
  User,
  Receipt,
  Calendar,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AgingSummaryCards } from '../components/ledger/AgingSummaryCards';
import { LedgerTable, LedgerCard } from '../components/ledger/LedgerTable';

export const LedgerPage: React.FC = () => {
  const { summary, customerLedger, loading, error } = useLedger();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  const filteredLedger = useMemo(() => {
    return customerLedger.filter((entry) => {
      const matchesSearch = entry.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOverdue = !filterOverdue || entry.overdueAmount > 0;
      return matchesSearch && matchesOverdue;
    });
  }, [customerLedger, searchQuery, filterOverdue]);

  const handleViewCustomer = (customerId: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: `customer-detail:${customerId}` }));
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Calculating ledger and aging...</p>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
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
        title="Outstanding Ledger" 
        subtitle="Track customer-wise outstanding balances and aging analysis."
        actions={
          <button 
            onClick={() => {}} // Placeholder for export
            className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-gray-200"
            title="Export Ledger"
          >
            <Download className="w-5 h-5" />
          </button>
        }
      />

      <div className="space-y-8">
        {/* Aging Summary */}
        <AgingSummaryCards 
          buckets={summary.agingBuckets} 
          totalOutstanding={summary.totalOutstanding} 
          overdueAmount={summary.overdueAmount} 
        />

        {/* Filters & Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setFilterOverdue(false)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                !filterOverdue 
                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              All Outstanding
            </button>
            <button
              onClick={() => setFilterOverdue(true)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                filterOverdue 
                  ? 'bg-red-600 border-red-700 text-white shadow-lg shadow-red-100' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600'
              }`}
            >
              Overdue Only
            </button>
          </div>
        </div>

        {/* Ledger List */}
        {filteredLedger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm text-center px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              {searchQuery ? <SearchX className="w-10 h-10" /> : <TrendingUp className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No results found' : 'No outstanding balances'}
            </h3>
            <p className="text-gray-500 max-w-xs mb-8">
              {searchQuery 
                ? `We couldn't find any customers matching "${searchQuery}". Try a different search.` 
                : "Great job! All your customers have cleared their dues. Your cash flow looks healthy."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <LedgerTable data={filteredLedger} onViewCustomer={handleViewCustomer} />
            
            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredLedger.map((entry) => (
                <LedgerCard 
                  key={entry.customerId} 
                  entry={entry} 
                  onClick={() => handleViewCustomer(entry.customerId)} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
