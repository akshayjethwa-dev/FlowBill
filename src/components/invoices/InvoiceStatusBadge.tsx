import React from 'react';

interface InvoiceStatusBadgeProps {
  status: string;
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'partial':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'unpaid':
      case 'sent':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'draft':
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
