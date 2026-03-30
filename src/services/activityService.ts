import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit, 
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { ActivityItem } from "../types/activity";  // ✅ correct export name

// SEC-01: canonical path -> /merchants/{merchantId}/activityLogs/{logId}
const COLLECTION_NAME = "activityLogs";

// Derive ActivityType from the existing ActivityItem interface
type ActivityType = ActivityItem["type"];

// Extended type that includes Firestore metadata not in ActivityItem
type ActivityLog = ActivityItem & {
  merchantId: string;
  description: string;
  metadata: Record<string, any>;
  userId: string;
  userName: string;
  createdAt: any;
};

export const activityService = {
  getActivityLogsPath: (merchantId: string) =>
    `merchants/${merchantId}/${COLLECTION_NAME}`,

  async logActivity(
    merchantId: string,
    type: ActivityType,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User must be authenticated to log activity");

      const activitiesRef = collection(
        db,
        activityService.getActivityLogsPath(merchantId)
      );

      await addDoc(activitiesRef, {
        merchantId,
        type,
        description,
        metadata,
        userId: user.uid,
        userName: user.displayName || "Unknown User",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error logging activity:", error);
      // Don't crash the app if logging fails
    }
  },

  async getActivities(
    merchantId: string,
    filters: {
      type?: ActivityType;
      limitCount?: number;
    } = {}
  ): Promise<ActivityLog[]> {
    try {
      const activitiesRef = collection(
        db,
        activityService.getActivityLogsPath(merchantId)
      );
      let q = query(activitiesRef, orderBy("createdAt", "desc"));

      if (filters.type) {
        q = query(q, where("type", "==", filters.type));
      }
      if (filters.limitCount) {
        q = query(q, limit(filters.limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ActivityLog[];
    } catch (error) {
      console.error("Error fetching activities:", error);
      throw error;
    }
  },
};