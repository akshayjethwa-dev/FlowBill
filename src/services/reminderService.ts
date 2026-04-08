import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Reminder } from '../types/reminder';
import { Customer } from '../types/customer';
import { ServiceResult } from '../types/firestore';
import { reminderConverter, withTimestamps } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const col = (merchantId: string) =>
  collection(db, FSPath.reminders(merchantId)).withConverter(reminderConverter);

export function subscribeToReminders(
  merchantId: string,
  callback: (reminders: Reminder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    col(merchantId),
    where('merchantId', '==', merchantId),
    where('isArchived', '!=', true),
    orderBy('scheduledAt', 'asc'),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => d.data())),
    error => {
      handleFirestoreError(error, OperationType.LIST, FSPath.reminders(merchantId));
      onError(error);
    },
  );
}

export async function createReminder(
  merchantId: string,
  reminderData: Omit<Reminder, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<Reminder>> {
  const path = FSPath.reminders(merchantId);
  try {
    const reminderRef = doc(col(merchantId));
    const newReminder = withTimestamps<Reminder>(
      { ...reminderData, id: reminderRef.id, merchantId, isArchived: false },
      true,
    ) as Reminder;
    await setDoc(reminderRef, newReminder);
    return { ok: true, data: newReminder };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'create', raw: e } };
  }
}

export async function updateReminder(
  merchantId: string,
  reminderId: string,
  data: Partial<Omit<Reminder, 'id' | 'merchantId' | 'createdAt'>>,
): Promise<ServiceResult<void>> {
  const path = FSPath.reminder(merchantId, reminderId);
  try {
    await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

export async function cancelReminder(
  merchantId: string,
  reminderId: string,
): Promise<ServiceResult<void>> {
  return updateReminder(merchantId, reminderId, { status: 'cancelled', isArchived: true });
}

// ─── Customer WhatsApp consent helpers ────────────────────────────────────────

function normalizeWhatsappNumber(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, '').replace(/^\+/, '');
}

type UpsertCustomerInput = Partial<Customer> & { merchantId: string; name: string };

function buildCustomerPayload(input: UpsertCustomerInput) {
  return {
    merchantId: input.merchantId,
    name: input.name.trim(),
    phone: input.phone?.trim() ?? '',
    email: input.email?.trim() ?? '',
    address: input.address?.trim() ?? '',
    whatsappNumber: normalizeWhatsappNumber(input.whatsappNumber ?? input.phone ?? null),
    whatsappOptIn: input.whatsappOptIn ?? false,
    whatsappOptedOutAt: input.whatsappOptedOutAt ?? null,
    updatedAt: serverTimestamp(),
  };
}

export async function createCustomerWithConsent(
  input: UpsertCustomerInput,
): Promise<ServiceResult<string>> {
  try {
    const ref = await addDoc(
      collection(db, FSPath.customers(input.merchantId)),
      { ...buildCustomerPayload(input), createdAt: serverTimestamp() },
    );
    return { ok: true, data: ref.id };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: FSPath.customers(input.merchantId), operation: 'create', raw: e } };
  }
}

export async function updateCustomerConsent(
  customerId: string,
  input: UpsertCustomerInput,
): Promise<ServiceResult<void>> {
  const path = FSPath.customer(input.merchantId, customerId);
  try {
    await updateDoc(doc(db, path), buildCustomerPayload(input));
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

export async function setCustomerWhatsappConsent(params: {
  merchantId: string;
  customerId: string;
  whatsappOptIn: boolean;
  whatsappNumber?: string | null;
}): Promise<ServiceResult<void>> {
  const path = FSPath.customer(params.merchantId, params.customerId);
  try {
    await updateDoc(doc(db, path), {
      whatsappOptIn: params.whatsappOptIn,
      whatsappNumber: normalizeWhatsappNumber(params.whatsappNumber ?? null),
      whatsappOptedOutAt: params.whatsappOptIn ? null : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

export const reminderService = {
  getRemindersPath: FSPath.reminders,
  subscribeToReminders,
  createReminder,
  updateReminder,
  cancelReminder,
  createCustomerWithConsent,
  updateCustomerConsent,
  setCustomerWhatsappConsent,
};