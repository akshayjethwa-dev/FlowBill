import React, { useState, useMemo } from 'react';
import { PageContainer, PageHeader } from '../components/layout/PageContainer';
import { useReminders } from '../hooks/useReminders';
import { auth } from '../firebase';
import { reminderService } from '../services/reminderService';
import { 
  Plus, 
  Bell, 
  Search, 
  Filter, 
  X, 
  Calendar, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  SearchX, 
  History,
  Send,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReminderTemplatePreviewCard } from '../components/reminders/ReminderTemplatePreviewCard';
import { Reminder } from '../types';

export const ReminderCenter: React.FC = () => {
  const { reminders, loading, error, sendReminder, deleteReminder } = useReminders();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder) => {
      const matchesSearch = 
        reminder.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reminder.message.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || reminder.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [reminders, searchQuery, filterStatus]);

  const queuedReminders = useMemo(() => 
    filteredReminders.filter(r => r.status === 'queued').sort((a, b) => 
      (a.scheduledAt?.toDate?.()?.getTime() || 0) - (b.scheduledAt?.toDate?.()?.getTime() || 0)
    ), [filteredReminders]);

  const sentReminders = useMemo(() => 
    filteredReminders.filter(r => r.status === 'sent').sort((a, b) => 
      (b.scheduledAt?.toDate?.()?.getTime() || 0) - (a.scheduledAt?.toDate?.()?.getTime() || 0)
    ), [filteredReminders]);

  const failedReminders = useMemo(() => 
    filteredReminders.filter(r => r.status === 'failed'),
    [filteredReminders]);

  const handleSendNow = async (reminder: Reminder) => {
    setSendingId(reminder.id);
    try {
      await sendReminder(reminder, 'whatsapp');
    } catch (err) {
      console.error('Failed to send reminder:', err);
      alert('Failed to send reminder. Please try again.');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await deleteReminder(reminderId);
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  // MVP Queue Reminder Setup
  const handleQueueManual = async () => {
    const merchantId = auth.currentUser?.uid;
    if (!merchantId) {
      alert("Please log in to queue a reminder.");
      return;
    }

    try {
      await reminderService.createReminder(merchantId, {
        customerId: 'mvp-customer-123',
        customerName: 'MVP Test Customer',
        type: 'manual',
        status: 'queued',
        scheduledAt: new Date(),
        message: 'This is a manually queued reminder for MVP testing.'
      });
      alert('Reminder queued successfully!');
    } catch (err) {
      console.error('Failed to queue reminder:', err);
      alert('Failed to queue reminder.');
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Loading reminder center...</p>
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
        title="Reminder Center" 
        subtitle="Automate customer follow-ups and payment reminders."
        actions={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'reminder-history' }))}
              className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-gray-200"
              title="View History"
            >
              <History className="w-5 h-5" />
            </button>
            <button 
              onClick={handleQueueManual}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Queue reminder now</span>
            </button>
          </div>
        }
      />

      <div className="space-y-10">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or message content..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'queued', 'sent', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  filterStatus === status 
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Quick Templates
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReminderTemplatePreviewCard 
              title="Payment Follow-up"
              type="payment"
              message="Hi [Customer Name], this is a friendly reminder that invoice [Invoice Number] for ₹[Amount] is due on [Due Date]. Please ignore if already paid."
            />
            <ReminderTemplatePreviewCard 
              title="Order Confirmation"
              type="follow_up"
              message="Hi [Customer Name], your order [Order ID] has been confirmed. We will notify you once it's shipped. Thank you for choosing us!"
            />
            <ReminderTemplatePreviewCard 
              title="Feedback Request"
              type="custom"
              message="Hi [Customer Name], how was your experience with us? We'd love to hear your feedback on your recent purchase."
            />
          </div>
        </section>

        <div className="space-y-8">
          {failedReminders.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Failed Reminders
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {failedReminders.map(reminder => (
                  <ReminderCard 
                    key={reminder.id} 
                    reminder={reminder} 
                    onSend={() => handleSendNow(reminder)}
                    onDelete={() => handleDelete(reminder.id)}
                    isSending={sendingId === reminder.id}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Queued Reminders
            </h3>
            {queuedReminders.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No queued reminders scheduled.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {queuedReminders.map(reminder => (
                  <ReminderCard 
                    key={reminder.id} 
                    reminder={reminder} 
                    onSend={() => handleSendNow(reminder)}
                    onDelete={() => handleDelete(reminder.id)}
                    isSending={sendingId === reminder.id}
                  />
                ))}
              </div>
            )}
          </section>

          {sentReminders.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-base font-bold text-gray-500 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Sent Activity
              </h3>
              <div className="grid grid-cols-1 gap-4 opacity-75">
                {sentReminders.map(reminder => (
                  <ReminderCard 
                    key={reminder.id} 
                    reminder={reminder} 
                    onSend={() => handleSendNow(reminder)}
                    onDelete={() => handleDelete(reminder.id)}
                    isSending={sendingId === reminder.id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

interface ReminderCardProps {
  reminder: Reminder;
  onSend: () => void;
  onDelete: () => void;
  isSending: boolean;
}

const ReminderCard: React.FC<ReminderCardProps> = ({ reminder, onSend, onDelete, isSending }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${
            reminder.status === 'failed' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
          }`}>
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {reminder.customerName}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                reminder.status === 'queued' ? 'bg-amber-100 text-amber-700' :
                reminder.status === 'sent' ? 'bg-green-100 text-green-700' :
                reminder.status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {reminder.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-2 line-clamp-1 italic">
              "{reminder.message}"
            </p>
            <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Scheduled: {reminder.scheduledAt?.toDate?.()?.toLocaleString() || new Date(reminder.scheduledAt).toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                {reminder.type.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-4 sm:pt-0">
          <button 
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Delete Reminder"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {reminder.status !== 'sent' && reminder.status !== 'cancelled' && (
            <button 
              onClick={onSend}
              disabled={isSending}
              className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Now
            </button>
          )}
          <button 
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="View Details"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Tag = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/><path d="M7 7h.01"/>
  </svg>
);