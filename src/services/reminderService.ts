import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Reminder, ReminderHistory } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';
import { activityService } from './activityService';

const REMINDERS_COLLECTION = 'reminders';
const HISTORY_COLLECTION = 'reminderHistory';

export const reminderService = {
  getRemindersPath: (merchantId: string) => `merchants/${merchantId}/${REMINDERS_COLLECTION}`,
  getHistoryPath: (merchantId: string) => `merchants/${merchantId}/${HISTORY_COLLECTION}`,

  subscribeToReminders: (
    merchantId: string, 
    callback: (reminders: Reminder[]) => void,
    onError: (error: any) => void
  ) => {
    const path = reminderService.getRemindersPath(merchantId);
    const q = query(collection(db, path), orderBy('scheduledDate', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const reminders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reminder[];
      callback(reminders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    });
  },

  createReminder: async (merchantId: string, reminderData: Omit<Reminder, 'id' | 'merchantId' | 'createdAt'>) => {
    const path = reminderService.getRemindersPath(merchantId);
    const reminderRef = doc(collection(db, path));
    const newReminder: Reminder = {
      ...reminderData,
      id: reminderRef.id,
      merchantId,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(reminderRef, newReminder);
      return newReminder;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  updateReminder: async (merchantId: string, reminderId: string, reminderData: Partial<Reminder>) => {
    const path = reminderService.getRemindersPath(merchantId);
    const reminderRef = doc(db, path, reminderId);

    try {
      await updateDoc(reminderRef, reminderData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  deleteReminder: async (merchantId: string, reminderId: string) => {
    const path = reminderService.getRemindersPath(merchantId);
    const reminderRef = doc(db, path, reminderId);

    try {
      await deleteDoc(reminderRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  sendReminder: async (merchantId: string, reminder: Reminder, channel: 'whatsapp' | 'sms' | 'email' = 'whatsapp') => {
    // In a real app, this would call a backend function or a 3rd party API
    // For now, we simulate the send and log it in history
    const historyPath = reminderService.getHistoryPath(merchantId);
    
    try {
      const historyEntry: Omit<ReminderHistory, 'id'> = {
        merchantId,
        reminderId: reminder.id,
        customerId: reminder.customerId,
        customerName: reminder.customerName,
        type: reminder.type,
        sentAt: serverTimestamp(),
        channel,
        status: 'delivered'
      };

      await addDoc(collection(db, historyPath), historyEntry);
      
      // Log activity
      await activityService.logActivity(
        merchantId,
        "reminder_sent",
        `Sent ${reminder.type} reminder to ${reminder.customerName} via ${channel}`,
        {
          reminderId: reminder.id,
          customerId: reminder.customerId,
          customerName: reminder.customerName,
          type: reminder.type,
          channel
        }
      );
      
      // Update reminder status
      await reminderService.updateReminder(merchantId, reminder.id, { status: 'sent' });
      
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, historyPath);
      throw error;
    }
  },

  subscribeToHistory: (
    merchantId: string, 
    callback: (history: ReminderHistory[]) => void,
    onError: (error: any) => void
  ) => {
    const path = reminderService.getHistoryPath(merchantId);
    const q = query(collection(db, path), orderBy('sentAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReminderHistory[];
      callback(history);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    });
  }
};
