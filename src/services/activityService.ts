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
import { ActivityItem } from "../types/activity";

const COLLECTION_NAME = "activityLogs";

type ActivityType = ActivityItem["type"];

type ActivityLog = ActivityItem & {
  merchantId: string;
  description: string;
  metadata: Record<string, any>;
  userId: string;
  userName: string;
  createdAt: any;
  isArchived?: boolean; // ✅ Add typed support
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
        isArchived: false, // ✅ Default to active
      });
    } catch (error) {
      console.error("Error logging activity:", error);
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
      
      // ✅ Base query ignores archived logs
      let q = query(
        activitiesRef, 
        where("isArchived", "==", false),
        orderBy("createdAt", "desc")
      );

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