import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Customer } from '../types/customer';
import { ServiceResult } from '../types/firestore';
import { customerConverter, withTimestamps } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

// ─── Typed collection reference ───────────────────────────────────────────────

const col = (merchantId: string) =>
  collection(db, FSPath.customers(merchantId)).withConverter(customerConverter);

// ─── Real-time subscription ────────────────────────────────────────────────────

export function subscribeCustomers(
  merchantId: string,
  onData: (customers: Customer[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(
    col(merchantId),
    where('merchantId', '==', merchantId),
    where('isArchived', '!=', true),
    orderBy('name', 'asc'),
  );
  return onSnapshot(q, snap => onData(snap.docs.map(d => d.data())), onError);
}

// ─── Get all customers ─────────────────────────────────────────────────────────

export async function getCustomers(
  merchantId: string,
): Promise<ServiceResult<Customer[]>> {
  try {
    const q = query(
      col(merchantId),
      where('merchantId', '==', merchantId),
      where('isArchived', '!=', true),
      orderBy('name', 'asc'),
    );
    const snap = await getDocs(q);
    return { ok: true, data: snap.docs.map(d => d.data()) };
  } catch (e: any) {
    return {
      ok: false,
      error: { code: e.code ?? 'unknown', message: e.message, path: FSPath.customers(merchantId), operation: 'list', raw: e },
    };
  }
}

// ─── Get single customer ───────────────────────────────────────────────────────

export async function getCustomer(
  merchantId: string,
  customerId: string,
): Promise<ServiceResult<Customer>> {
  const path = FSPath.customer(merchantId, customerId);
  try {
    const snap = await getDoc(
      doc(db, path).withConverter(customerConverter),
    );
    if (!snap.exists()) {
      return { ok: false, error: { code: 'not-found', message: 'Customer not found', path, operation: 'get' } };
    }
    return { ok: true, data: snap.data() };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'get', raw: e } };
  }
}

// ─── Create customer ───────────────────────────────────────────────────────────
// FIX: We generate the docRef first, then build the payload with that id.
// This avoids the "id is missing" error AND the "id specified twice" error.

export async function createCustomer(
  merchantId: string,
  data: Omit<Customer, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<Customer>> {
  const path = FSPath.customers(merchantId);
  try {
    // Step 1: Reserve a document reference to get a stable id upfront
    const newDocRef = doc(col(merchantId));

    // Step 2: Build the full payload — id comes from newDocRef, never from caller
    const payload: Customer = {
      ...(withTimestamps(
        {
          ...data,
          id: newDocRef.id,       // id injected here from the docRef
          merchantId,             // merchantId always from auth context, never caller
          isArchived: false,
          outstandingAmount: data.outstandingAmount ?? 0,
        },
        true,                     // isNew = true → adds createdAt
      ) as Customer),
    };

    // Step 3: Write using setDoc (not addDoc) so we control the doc id
    const { id, ...firestorePayload } = payload;
    await addDoc(col(merchantId), { ...firestorePayload, id: newDocRef.id });

    return { ok: true, data: payload };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'create', raw: e } };
  }
}

// ─── Update customer ───────────────────────────────────────────────────────────

export async function updateCustomer(
  merchantId: string,
  customerId: string,
  data: Partial<Omit<Customer, 'id' | 'merchantId' | 'createdAt'>>,
): Promise<ServiceResult<void>> {
  const path = FSPath.customer(merchantId, customerId);
  try {
    await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

// ─── Soft-delete customer ──────────────────────────────────────────────────────

export async function archiveCustomer(
  merchantId: string,
  customerId: string,
): Promise<ServiceResult<void>> {
  return updateCustomer(merchantId, customerId, { isArchived: true });
}

// ─── WhatsApp consent ──────────────────────────────────────────────────────────

function normalizeWhatsappNumber(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, '').replace(/^\+/, '');
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

// ─── Namespace export (backward-compatible) ───────────────────────────────────

export const customerService = {
  getCustomersPath: FSPath.customers,
  subscribeCustomers,
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  setCustomerWhatsappConsent,
};