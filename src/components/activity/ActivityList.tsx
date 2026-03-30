import React from "react";
import { Activity } from "../../types/activity";
import { ActivityItem } from "./ActivityItem";
import { Loader2, SearchX, AlertCircle } from "lucide-react";

interface ActivityListProps {
  activities: Activity[];
  loading: boolean;
  error: string | null;
}

export const ActivityList: React.FC<ActivityListProps> = ({ activities, loading, error }) => {
  if (loading && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-10 h-10 mb-4 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Loading activity feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertCircle className="w-10 h-10 mb-4" />
        <p className="text-sm font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <SearchX className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">No activities found</p>
        <p className="text-xs mt-1">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-100">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-4 bg-gray-50/50 border-t">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
          <span className="text-xs font-medium text-gray-500">Updating...</span>
        </div>
      )}
    </div>
  );
};
