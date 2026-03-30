import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useActivities } from "../hooks/useActivities";
import { ActivityFilters } from "../components/activity/ActivityFilters";
import { ActivityList } from "../components/activity/ActivityList";
import { ActivityType } from "../types/activity";
import { 
  History, 
  RefreshCw, 
  LayoutDashboard, 
  ChevronRight 
} from "lucide-react";
import { motion } from "motion/react";

const ActivityLog: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ActivityType | "">("");
  const [refreshKey, setRefreshKey] = useState(0);

  const { activities, loading, error } = useActivities({
    merchantId: user?.uid,
    type: selectedType || undefined,
    searchQuery,
    limitCount: 100,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <LayoutDashboard className="w-3 h-3" />
              <span>Dashboard</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-900">Activity Log</span>
            </div>
            
            <button 
              onClick={handleRefresh}
              className={`p-2 hover:bg-gray-100 rounded-full transition-all ${loading ? 'animate-spin text-blue-500' : 'text-gray-400'}`}
              title="Refresh feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <History className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Activity Feed</h1>
              <p className="text-xs text-gray-500">Track all actions performed across your business</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Filters */}
          <ActivityFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
          />

          {/* List */}
          <ActivityList 
            activities={activities} 
            loading={loading} 
            error={error} 
          />
          
          {/* Footer Info */}
          {!loading && !error && activities.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                Showing {activities.length} recent activities. 
                Real-time updates are enabled.
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ActivityLog;
