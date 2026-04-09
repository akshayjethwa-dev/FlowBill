import { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, functions } from '../firebase';
import { Reminder, ReminderHistory } from '../types';
import { reminderService } from '../services/reminderService';
import { FSPath } from '../lib/models/paths';
import { useAuth } from '../context/AuthContext';

// ─── useReminders ─────────────────────────────────────────────────────────────

export const useReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = reminderService.subscribeToReminders(
      user.uid,
      (data: Reminder[]) => {
        setReminders(data);
        setLoading(false);
      },
      (_err: Error) => {
        setError('Failed to load reminders. Please check your permissions.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const createReminder = async (
    reminderData: Omit<Reminder, 'id' | 'merchantId' | 'createdAt'>,
  ) => {
    if (!user) return;
    return await reminderService.createReminder(user.uid, reminderData);
  };

  const updateReminder = async (
    reminderId: string,
    reminderData: Partial<Reminder>,
  ) => {
    if (!user) return;
    return await reminderService.updateReminder(user.uid, reminderId, reminderData);
  };

  // cancelReminder = soft-delete + archive (actual service export name)
  const deleteReminder = async (reminderId: string) => {
    if (!user) return;
    return await reminderService.cancelReminder(user.uid, reminderId);
  };

  // sendReminder delegates to Cloud Function — not in reminderService
  const sendReminder = async (
    reminder: Reminder,
    channel: 'whatsapp' | 'sms' | 'email' = 'whatsapp',
  ) => {
    if (!user) return;
    try {
      const fn = httpsCallable<
        { reminderId: string; channel: string; merchantId: string },
        { success: boolean; messageId?: string }
      >(functions, 'sendReminder');
      const result = await fn({
        reminderId: reminder.id,
        channel,
        merchantId: user.uid,
      });
      return result.data;
    } catch (err: any) {
      console.error('sendReminder error:', err);
      throw err;
    }
  };

  return {
    reminders,
    loading,
    error,
    createReminder,
    updateReminder,
    deleteReminder,
    sendReminder,
  };
};

// ─── useReminderHistory ───────────────────────────────────────────────────────
// FIX: reminderHistoryService.ts does not exist — subscribe to the history
// sub-collection inline using Firestore directly (same pattern as all other hooks).

export const useReminderHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<ReminderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // ReminderHistory lives at: /merchants/{merchantId}/reminderHistory
    // Adjust the FSPath key below if your path constant is named differently.
    const historyPath = `merchants/${user.uid}/reminderHistory`;

    const q = query(
      collection(db, historyPath),
      where('merchantId', '==', user.uid),
      orderBy('sentAt', 'desc'),
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        })) as ReminderHistory[];
        setHistory(items);
        setLoading(false);
      },
      (_err: Error) => {
        setError('Failed to load reminder history.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  return { history, loading, error };
};