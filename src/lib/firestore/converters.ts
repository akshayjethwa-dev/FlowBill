// ─────────────────────────────────────────────────────────────────────────────
// TYPED FIRESTORE CONVERTERS
// ─────────────────────────────────────────────────────────────────────────────

import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  serverTimestamp,
} from 'firebase/firestore';
import { Invoice, Customer, Order, Estimate } from '../../types';
import { FirestoreDoc } from '../../types/firestore';

// ── FIX: safe cast through `unknown` ─────────────────────────────────────────
// TypeScript won't let you cast a typed interface (no index signature) directly
// to Record<string, unknown>. Routing through `unknown` first is the correct
// and type-safe solution — it's explicit about the intent.

function toRecord(data: unknown): Record<string, unknown> {
  return data as Record<string, unknown>;
}

// ── Utility: strip undefined fields before writing ────────────────────────────

export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// ── Utility: strip `id` and return clean write payload ───────────────────────

function toWritePayload(data: unknown): Record<string, unknown> {
  const record = toRecord(data);
  const { id, ...rest } = record;   // id lives in the document key, not the data
  void id;
  return stripUndefined(rest as Record<string, unknown>);
}

// ── Utility: normalise Firestore Timestamp → ISO string ───────────────────────

import { Timestamp } from 'firebase/firestore';

export function tsToIso(ts: Timestamp | string | undefined | null): string | undefined {
  if (!ts) return undefined;
  if (typeof ts === 'string') return ts;
  return ts.toDate().toISOString();
}

// ── Utility: inject `id` from snapshot into data object ──────────────────────

export function withId<T extends object>(
  snap: QueryDocumentSnapshot,
  data: T
): T & { id: string } {
  return { ...data, id: snap.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC PASS-THROUGH CONVERTER
// Use for any entity where you just want `id` injected automatically.
// ─────────────────────────────────────────────────────────────────────────────

export function makeConverter<T extends FirestoreDoc>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): Record<string, unknown> {
      return toWritePayload(data);
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options?: SnapshotOptions
    ): T {
      const data = snapshot.data(options);
      return { 
        ...data, 
        id: snapshot.id,
        createdAt: tsToIso(data.createdAt),
        updatedAt: tsToIso(data.updatedAt)
      } as unknown as T;
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY-SPECIFIC CONVERTERS
// ─────────────────────────────────────────────────────────────────────────────

export const invoiceConverter: FirestoreDataConverter<Invoice> = {
  toFirestore(invoice: Invoice): Record<string, unknown> {
    return {
      ...toWritePayload(invoice),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot): Invoice {
    const data = snap.data();
    return { 
      ...data, 
      id: snap.id,
      // Normalize Timestamps to ISO Strings for the frontend
      createdAt: tsToIso(data.createdAt),
      updatedAt: tsToIso(data.updatedAt),
      dueDate: tsToIso(data.dueDate) 
    } as unknown as Invoice;
  },
};

export const customerConverter: FirestoreDataConverter<Customer> = {
  toFirestore(customer: Customer): Record<string, unknown> {
    return {
      ...toWritePayload(customer),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot): Customer {
    const data = snap.data();
    return { 
      ...data, 
      id: snap.id,
      createdAt: tsToIso(data.createdAt),
      updatedAt: tsToIso(data.updatedAt)
    } as unknown as Customer;
  },
};

export const orderConverter: FirestoreDataConverter<Order> = {
  toFirestore(order: Order): Record<string, unknown> {
    return {
      ...toWritePayload(order),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot): Order {
    const data = snap.data();
    return { 
      ...data, 
      id: snap.id,
      createdAt: tsToIso(data.createdAt),
      updatedAt: tsToIso(data.updatedAt),
      dueDate: tsToIso(data.dueDate)
    } as unknown as Order;
  },
};

export const estimateConverter: FirestoreDataConverter<Estimate> = {
  toFirestore(estimate: Estimate): Record<string, unknown> {
    return {
      ...toWritePayload(estimate),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot): Estimate {
    const data = snap.data();
    return { 
      ...data, 
      id: snap.id,
      createdAt: tsToIso(data.createdAt),
      updatedAt: tsToIso(data.updatedAt),
      dueDate: tsToIso(data.dueDate) // Often used interchangeably as expiry date
    } as unknown as Estimate;
  },
};

// ── Converter registry ────────────────────────────────────────────────────────

export const CONVERTERS = {
  invoices:  invoiceConverter,
  customers: customerConverter,
  orders:    orderConverter,
  estimates: estimateConverter,
} as const;