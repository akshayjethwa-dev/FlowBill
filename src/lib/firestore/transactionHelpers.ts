// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION & BATCH HELPERS
//
// Thin wrappers that expose a clean API and return ServiceResult<T>.
// ─────────────────────────────────────────────────────────────────────────────

import {
  runTransaction, writeBatch,
  doc, Transaction, WriteBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { buildServiceError } from './errorHelpers';
import { ServiceResult, FirestoreDoc } from '../../types/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION — run an atomic multi-doc operation
// Usage:
//   const result = await fsTransaction(async (tx) => {
//     const snap = await tx.get(doc(db, 'merchants/x/invoices/y'));
//     tx.update(doc(db, '...'), { status: 'paid' });
//     return snap.data();
//   });
// ─────────────────────────────────────────────────────────────────────────────

export async function fsTransaction<T>(
  fn: (tx: Transaction) => Promise<T>
): Promise<ServiceResult<T>> {
  try {
    const result = await runTransaction(db, fn);
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, 'transaction', null, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH SET — write multiple docs at once (max 500 per Firestore limit)
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchSetItem<T extends FirestoreDoc> {
  collectionPath: string;
  id: string;
  data: Partial<T>;
  merge?: boolean;
}

export async function fsBatchSet<T extends FirestoreDoc>(
  items: BatchSetItem<T>[]
): Promise<ServiceResult<void>> {
  if (items.length > 500) {
    return {
      ok: false,
      error: buildServiceError('out-of-range', 'batch', null, 'Batch size cannot exceed 500 documents'),
    };
  }
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const ref = doc(db, item.collectionPath, item.id);
      if (item.merge) {
        batch.set(ref, { ...item.data, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        batch.set(ref, { ...item.data, updatedAt: serverTimestamp() });
      }
    }
    await batch.commit();
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, 'batch', null, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH DELETE — delete multiple docs atomically
// ─────────────────────────────────────────────────────────────────────────────

export async function fsBatchDelete(
  items: Array<{ collectionPath: string; id: string }>
): Promise<ServiceResult<void>> {
  if (items.length > 500) {
    return {
      ok: false,
      error: buildServiceError('out-of-range', 'batch', null, 'Batch delete cannot exceed 500 documents'),
    };
  }
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      batch.delete(doc(db, item.collectionPath, item.id));
    }
    await batch.commit();
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, 'batch', null, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTER INCREMENT — atomic counter via transaction
// Used for invoice number sequencing, order counts, etc.
// ─────────────────────────────────────────────────────────────────────────────

export async function fsIncrementCounter(
  counterDocPath: string,
  field: string,
  by = 1
): Promise<ServiceResult<number>> {
  try {
    const ref = doc(db, counterDocPath);
    let newValue = 0;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists() ? (snap.data()[field] as number ?? 0) : 0;
      newValue = current + by;
      tx.set(ref, { [field]: newValue, updatedAt: serverTimestamp() }, { merge: true });
    });
    return { ok: true, data: newValue };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, 'transaction', counterDocPath, e) };
  }
}