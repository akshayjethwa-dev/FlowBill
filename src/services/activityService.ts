import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit, 
  Timestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Activity, ActivityType } from "../types/activity";

const COLLECTION_NAME = "activities";

export const activityService = {
  /**
   * Log a new activity
   */
  async logActivity(
    merchantId: string, 
    type: ActivityType, 
    description: string, 
    metadata: any = {}
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User must be authenticated to log activity");

      const activitiesRef = collection(db, "merchants", merchantId, COLLECTION_NAME);
      
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
      // We don't want to crash the app if logging fails, but we should know about it
    }
  },

  /**
   * Fetch activities for a merchant
   */
  async getActivities(
    merchantId: string, 
    filters: { 
      type?: ActivityType; 
      limitCount?: number;
    } = {}
  ): Promise<Activity[]> {
    try {
      const activitiesRef = collection(db, "merchants", merchantId, COLLECTION_NAME);
      let q = query(activitiesRef, orderBy("createdAt", "desc"));

      if (filters.type) {
        q = query(q, where("type", "==", filters.type));
      }

      if (filters.limitCount) {
        q = query(q, limit(filters.limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
    } catch (error) {
      console.error("Error fetching activities:", error);
      throw error;
    }
  }
};
