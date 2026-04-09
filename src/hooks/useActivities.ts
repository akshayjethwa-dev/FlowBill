import { useState, useEffect, useMemo } from "react";
import { activityLogService } from "../services/activityLogService";
import { ActivityItem, ActivityType, ActivityLog } from "../types/activity";

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
  limitCount = 50,
}: UseActivitiesProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = activityLogService.subscribeToLogs(
      merchantId,
      (logs: ActivityLog[]) => {
        const mappedData: ActivityItem[] = logs.map(log => {
          // Build linked entity description
          let linkedEntity = "";
          if (log.metadata?.invoiceNumber)
            linkedEntity += `Invoice #${log.metadata.invoiceNumber} `;
          if (log.metadata?.customerName)
            linkedEntity += `(${log.metadata.customerName})`;

          const subtitleParts: string[] = [];
          if (log.userName) subtitleParts.push(`By ${log.userName}`);
          if (linkedEntity) subtitleParts.push(linkedEntity.trim());

          return {
            id:          log.id,
            type:        log.type,
            title:       log.description ?? log.type.replace("_", " ").toUpperCase(),
            subtitle:    subtitleParts.join(" • ") || "System Action",
            // FIX Error1: createdAt is optional — fall back to empty string so
            // timestamp is always string | FieldValue | Timestamp (never undefined)
            timestamp:   log.createdAt ?? "",
            description: log.description,
            userName:    log.userName,
            metadata:    log.metadata ?? {},
          };
        });

        setActivities(mappedData);
        setLoading(false);
      },
      {
        type,
        limitCount,
        onError: () => {
          setError("Failed to load activities. Please check your permissions.");
          setLoading(false);
        },
      },
    );

    return () => unsubscribe();
  }, [merchantId, type, limitCount]);

  // Client-side filtering for search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;

    const lowerQuery = searchQuery.toLowerCase();

    return activities.filter(activity => {
      // FIX Error2 & Error3: metadata values are typed as `unknown`.
      // Safely coerce to string before calling .toLowerCase()
      const customerName =
        typeof activity.metadata?.customerName === "string"
          ? activity.metadata.customerName
          : "";
      const invoiceNumber =
        typeof activity.metadata?.invoiceNumber === "string"
          ? activity.metadata.invoiceNumber
          : "";

      return (
        activity.title.toLowerCase().includes(lowerQuery) ||
        (activity.userName?.toLowerCase() ?? "").includes(lowerQuery) ||
        customerName.toLowerCase().includes(lowerQuery) ||
        invoiceNumber.toLowerCase().includes(lowerQuery)
      );
    });
  }, [activities, searchQuery]);

  return { activities: filteredActivities, loading, error };
};