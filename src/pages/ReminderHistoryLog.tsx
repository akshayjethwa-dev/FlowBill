import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useReminderHistory } from '../hooks/useReminders';
import { 
  ArrowLeft, 
  History, 
  Search, 
  Filter, 
  X, 
  Calendar, 
  User, 
  AlertCircle, 
  Loader2, 
  SearchX, 
  MessageSquare,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ReminderHistoryLog: React.FC = () => {
  const { history, loading, error } = useReminderHistory();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState('all');

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch = 
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesChannel = filterChannel === 'all' || item.channel === filterChannel;
      
      return matchesSearch && matchesChannel;
    });
  }, [history, searchQuery, filterChannel]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'sms': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Loading history log...</p>
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
      <div className="mb-6">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'reminders' }))}
          className="flex items-center gap-2 text-gray-500 font-bold hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Reminder Center
        </button>
      </div>

      <PageHeader 
        title="Reminder History" 
        subtitle="Track all sent communications and their delivery status."
      />

      <div className="space-y-8">
        {/* Filters & Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or reminder type..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'whatsapp', 'sms', 'email'].map((channel) => (
              <button
                key={channel}
                onClick={() => setFilterChannel(channel)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  filterChannel === channel 
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                {channel.charAt(0).toUpperCase() + channel.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm text-center px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              {searchQuery ? <SearchX className="w-10 h-10" /> : <History className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No results found' : 'No history yet'}
            </h3>
            <p className="text-gray-500 max-w-xs mb-8">
              {searchQuery 
                ? `We couldn't find any history matching "${searchQuery}". Try a different search.` 
                : "Your sent reminders will appear here. Track delivery status and communication logs."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Channel</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sent At</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{item.customerName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                          {item.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                          {getChannelIcon(item.channel)}
                          {item.channel.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-500 font-medium">
                          {item.sentAt?.toDate?.()?.toLocaleString() || new Date(item.sentAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {item.status === 'delivered' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-xs font-bold text-green-700">Delivered</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-xs font-bold text-red-700">Failed</span>
                            </>
                          )}
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
    </PageContainer>
  );
};
