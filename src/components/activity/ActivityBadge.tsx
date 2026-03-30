import React from "react";
import { ActivityType } from "../../types/activity";

interface ActivityBadgeProps {
  type: ActivityType;
}

export const ActivityBadge: React.FC<ActivityBadgeProps> = ({ type }) => {
  const getBadgeStyles = (type: ActivityType) => {
    switch (type) {
      case "invoice_created":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "invoice_updated":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "reminder_sent":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "payment_marked":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "customer_added":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getLabel = (type: ActivityType) => {
    return type.replace("_", " ").toUpperCase();
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full uppercase tracking-wider ${getBadgeStyles(type)}`}>
      {getLabel(type)}
    </span>
  );
};
