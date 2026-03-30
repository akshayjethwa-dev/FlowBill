import React from 'react';

interface PaymentStatusBadgeProps {
  status: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'pending':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'refunded':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyles(status)}`}>
      {status.toUpperCase()}
    </span>
  );
};
