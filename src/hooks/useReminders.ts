import { useState, useEffect } from 'react';
import { Reminder, ReminderHistory } from '../types';
import { reminderService } from '../services/reminderService';
import { useAuth } from '../context/AuthContext';

export const useReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = reminderService.subscribeToReminders(
      user.uid,
      (data) => {
        setReminders(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load reminders. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const createReminder = async (reminderData: Omit<Reminder, 'id' | 'merchantId' | 'createdAt'>) => {
    if (!user) return;
    return await reminderService.createReminder(user.uid, reminderData);
  };

  const updateReminder = async (reminderId: string, reminderData: Partial<Reminder>) => {
    if (!user) return;
    return await reminderService.updateReminder(user.uid, reminderId, reminderData);
  };

  const deleteReminder = async (reminderId: string) => {
    if (!user) return;
    return await reminderService.deleteReminder(user.uid, reminderId);
  };

  const sendReminder = async (reminder: Reminder, channel: 'whatsapp' | 'sms' | 'email' = 'whatsapp') => {
    if (!user) return;
    return await reminderService.sendReminder(user.uid, reminder, channel);
  };

  return { 
    reminders, 
    loading, 
    error, 
    createReminder, 
    updateReminder, 
    deleteReminder,
    sendReminder
  };
};

export const useReminderHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<ReminderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = reminderService.subscribeToHistory(
      user.uid,
      (data) => {
        setHistory(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load reminder history.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { history, loading, error };
};
