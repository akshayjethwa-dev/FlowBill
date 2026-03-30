import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "../../types/activity";
import { ActivityIcon } from "./ActivityIcon";
import { ActivityBadge } from "./ActivityBadge";

interface ActivityItemProps {
  activity: Activity;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const timeAgo = activity.createdAt 
    ? formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true })
    : "just now";

  return (
    <div className="flex items-start gap-4 p-4 transition-colors border-b last:border-b-0 hover:bg-gray-50/50">
      <div className="p-2 bg-white border rounded-lg shadow-sm shrink-0">
        <ActivityIcon type={activity.type} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {activity.userName}
          </span>
          <ActivityBadge type={activity.type} />
          <span className="text-xs text-gray-400">
            {timeAgo}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-2">
          {activity.description}
        </p>
        
        {/* Metadata section (optional) */}
        {Object.keys(activity.metadata).length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {activity.metadata.customerName && (
              <span className="text-xs font-medium text-gray-500">
                Customer: <span className="text-gray-700">{activity.metadata.customerName}</span>
              </span>
            )}
            {activity.metadata.invoiceNumber && (
              <span className="text-xs font-medium text-gray-500">
                Invoice: <span className="text-gray-700">#{activity.metadata.invoiceNumber}</span>
              </span>
            )}
            {activity.metadata.amount !== undefined && (
              <span className="text-xs font-medium text-gray-500">
                Amount: <span className="text-emerald-600 font-semibold">₹{activity.metadata.amount.toLocaleString()}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
