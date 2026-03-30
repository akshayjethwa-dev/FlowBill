import React from "react";
import { Search, Filter, X } from "lucide-react";
import { ActivityType } from "../../types/activity";

interface ActivityFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: ActivityType | "";
  setSelectedType: (type: ActivityType | "") => void;
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
}) => {
  const activityTypes: { value: ActivityType; label: string }[] = [
    { value: "invoice_created", label: "Invoice Created" },
    { value: "invoice_updated", label: "Invoice Updated" },
    { value: "reminder_sent", label: "Reminder Sent" },
    { value: "payment_marked", label: "Payment Marked" },
    { value: "customer_added", label: "Customer Added" },
  ];

  return (
    <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search activities, users, customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-600 shrink-0">
          <Filter className="w-3 h-3" />
          <span>Filters</span>
        </div>
        
        <button
          onClick={() => setSelectedType("")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
            selectedType === ""
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}
        >
          All
        </button>
        
        {activityTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedType(type.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
              selectedType === type.value
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
};
