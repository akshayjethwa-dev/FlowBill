import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { Estimate } from '../types/estimate';
import { ServiceResult } from '../types/firestore';
import { estimateConverter, withTimestamps } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const col = (merchantId: string) =>
  collection(db, FSPath.estimates(merchantId)).withConverter(estimateConverter);

export function subscribeToEstimates(
  merchantId: string,
  callback: (estimates: Estimate[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    col(merchantId),
    where('merchantId', '==', merchantId),
    where('isArchived', '!=', true),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => d.data())),
    error => {
      handleFirestoreError(error, OperationType.LIST, FSPath.estimates(merchantId));
      onError(error);
    },
  );
}

export async function getEstimate(
  merchantId: string,
  estimateId: string,
): Promise<ServiceResult<Estimate>> {
  const path = FSPath.estimate(merchantId, estimateId);
  try {
    const snap = await getDoc(doc(db, path).withConverter(estimateConverter));
    if (!snap.exists()) {
      return { ok: false, error: { code: 'not-found', message: 'Estimate not found', path, operation: 'get' } };
    }
    return { ok: true, data: snap.data() };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'get', raw: e } };
  }
}

export async function createEstimate(
  merchantId: string,
  estimateData: Omit<Estimate, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<Estimate>> {
  const path = FSPath.estimates(merchantId);
  try {
    const estimateRef = doc(col(merchantId));
    const newEstimate = withTimestamps<Estimate>(
      { ...estimateData, id: estimateRef.id, merchantId, isArchived: false },
      true,
    ) as Estimate;
    await setDoc(estimateRef, newEstimate);
    return { ok: true, data: newEstimate };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'create', raw: e } };
  }
}

export async function updateEstimate(
  merchantId: string,
  estimateId: string,
  data: Partial<Omit<Estimate, 'id' | 'merchantId' | 'createdAt' | 'estimateNumber'>>,
): Promise<ServiceResult<void>> {
  const path = FSPath.estimate(merchantId, estimateId);
  try {
    await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

export async function deleteEstimate(
  merchantId: string,
  estimateId: string,
): Promise<ServiceResult<void>> {
  return updateEstimate(merchantId, estimateId, { isArchived: true });
}

// Conversion is backend-only to generate invoiceNumber atomically.
export async function convertToInvoice(
  merchantId: string,
  estimateId: string,
): Promise<ServiceResult<{ invoiceId: string }>> {
  try {
    const fn = httpsCallable(functions, 'convertEstimateToInvoice');
    const response = await fn({ sourceId: estimateId, merchantId });
    const data = response.data as { invoiceId: string; message?: string };
    if (data.message === 'Already converted') console.warn('Idempotency: Estimate already converted.');
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: FSPath.estimates(merchantId), operation: 'update', raw: e } };
  }
}

export const estimateService = {
  getEstimatesPath: FSPath.estimates,
  subscribeToEstimates,
  getEstimate,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  convertToInvoice,
};