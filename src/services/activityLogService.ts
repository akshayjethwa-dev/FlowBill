import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  limit, 
  onSnapshot,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { ActivityLog, ActivityType } from "../types/activity";

const COLLECTION_NAME = "activityLogs";

export const activityLogService = {
  getCollectionPath: (merchantId: string) =>
    `merchants/${merchantId}/${COLLECTION_NAME}`,

  /**
   * One-time fetch of activity logs (as requested in spec)
   */
  async listLogs(merchantId: string, limitCount = 50): Promise<ActivityLog[]> {
    try {
      const q = query(
        collection(db, activityLogService.getCollectionPath(merchantId)),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      throw error;
    }
  },

  /**
   * Real-time subscription for the UI feed
   */
  subscribeToLogs(
    merchantId: string,
    callback: (logs: ActivityLog[]) => void,
    options?: { type?: ActivityType; limitCount?: number; onError?: (err: any) => void }
  ) {
    let q = query(
      collection(db, activityLogService.getCollectionPath(merchantId)),
      orderBy("createdAt", "desc"),
      limit(options?.limitCount || 50)
    );

    if (options?.type) {
      q = query(q, where("type", "==", options.type));
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
        callback(logs);
      },
      (error) => {
        console.error("Error subscribing to activity logs:", error);
        if (options?.onError) options.onError(error);
      }
    );
  }
};

// Legacy stub to prevent crashes if other client files attempt to write logs.
// Client writes are now securely blocked by Firestore rules in favor of Cloud Functions.
export const activityService = {
  logActivity: async () => {
    console.warn("Client-side logging is disabled. Activity logs are strictly recorded via backend Cloud Functions.");
  }
};