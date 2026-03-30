import React from "react";
import { 
  FilePlus, 
  FileEdit, 
  Bell, 
  CreditCard, 
  UserPlus, 
  HelpCircle 
} from "lucide-react";
import { ActivityType } from "../../types/activity";

interface ActivityIconProps {
  type: ActivityType;
  className?: string;
}

export const ActivityIcon: React.FC<ActivityIconProps> = ({ type, className = "w-5 h-5" }) => {
  switch (type) {
    case "invoice_created":
      return <FilePlus className={`${className} text-blue-500`} />;
    case "invoice_updated":
      return <FileEdit className={`${className} text-indigo-500`} />;
    case "reminder_sent":
      return <Bell className={`${className} text-amber-500`} />;
    case "payment_marked":
      return <CreditCard className={`${className} text-emerald-500`} />;
    case "customer_added":
      return <UserPlus className={`${className} text-purple-500`} />;
    default:
      return <HelpCircle className={`${className} text-gray-500`} />;
  }
};
