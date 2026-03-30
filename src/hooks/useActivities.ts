import { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  limit, 
  Timestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Activity, ActivityType } from "../types/activity";

interface UseActivitiesProps {
  merchantId?: string;
  type?: ActivityType;
  searchQuery?: string;
  limitCount?: number;
}

export const useActivities = ({ 
  merchantId, 
  type, 
  searchQuery = "", 
  limitCount = 50 
}: UseActivitiesProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const activitiesRef = collection(db, "merchants", merchantId, "activities");
    
    let q = query(
      activitiesRef, 
      orderBy("createdAt", "desc"), 
      limit(limitCount)
    );

    if (type) {
      q = query(q, where("type", "==", type));
    }

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];
        
        setActivities(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to activities:", err);
        setError("Failed to load activities. Please check your permissions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [merchantId, type, limitCount]);

  // Client-side filtering for search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    
    const lowerQuery = searchQuery.toLowerCase();
    return activities.filter(activity => 
      activity.description.toLowerCase().includes(lowerQuery) ||
      activity.userName.toLowerCase().includes(lowerQuery) ||
      activity.metadata.customerName?.toLowerCase().includes(lowerQuery) ||
      activity.metadata.invoiceNumber?.toLowerCase().includes(lowerQuery)
    );
  }, [activities, searchQuery]);

  return { 
    activities: filteredActivities, 
    loading, 
    error 
  };
};
