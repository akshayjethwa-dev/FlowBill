import React from 'react';

interface ReminderStatusBadgeProps {
  status: string;
}

export const ReminderStatusBadge: React.FC<ReminderStatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'sent':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyles(status)}`}>
      {status.toUpperCase()}
    </span>
  );
};
