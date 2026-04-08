import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ActivityLog, ActivityType } from '../types/activity';
import { ServiceResult } from '../types/firestore';
import { activityConverter } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';

const col = (merchantId: string) =>
  collection(db, FSPath.activities(merchantId)).withConverter(activityConverter);

// Activities are IMMUTABLE after creation — never update or delete.
export async function logActivity(
  merchantId: string,
  type: ActivityType,
  description: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('[activityService] No authenticated user — skipping log');
      return;
    }
    await addDoc(collection(db, FSPath.activities(merchantId)), {
      merchantId,
      type,
      description,
      metadata,
      userId: user.uid,
      userName: user.displayName ?? 'Unknown User',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Must never crash the caller
    console.error('[activityService] Failed to log activity:', error);
  }
}

export async function getActivities(
  merchantId: string,
  filters: { type?: ActivityType; limitCount?: number } = {},
): Promise<ServiceResult<ActivityLog[]>> {
  try {
    let q = query(
      col(merchantId),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc'),
    );
    if (filters.type) q = query(q, where('type', '==', filters.type));
    if (filters.limitCount) q = query(q, limit(filters.limitCount));
    const snap = await getDocs(q);
    return { ok: true, data: snap.docs.map(d => d.data()) };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path: FSPath.activities(merchantId), operation: 'list', raw: e } };
  }
}

export function subscribeToActivities(
  merchantId: string,
  callback: (items: ActivityLog[]) => void,
  onError?: (error: Error) => void,
  limitCount = 20,
): Unsubscribe {
  const q = query(
    col(merchantId),
    where('merchantId', '==', merchantId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  return onSnapshot(q, snap => callback(snap.docs.map(d => d.data())), onError);
}

export const activityService = {
  getActivityLogsPath: FSPath.activities,
  logActivity,
  getActivities,
  subscribeToActivities,
};