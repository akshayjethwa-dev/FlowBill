import React from 'react';
import { Customer } from '../../types';
import { Phone, MapPin, Calendar, MoreVertical, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onViewDetail: (customer: Customer) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onEdit, onDelete, onViewDetail }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'inactive': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-100';
      case 'overdue': return 'bg-red-50 text-red-700 border-red-100';
      case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-100">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                {customer.name}
              </h3>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{customer.businessName || 'Individual'}</p>
            </div>
          </div>
          
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${getStatusColor(customer.status)}`}>
            {getStatusIcon(customer.status)}
            {customer.status.toUpperCase()}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{customer.phone}</span>
          </div>
          
          {customer.address && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="line-clamp-1">{customer.address}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Credit: {customer.creditDays} Days</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outstanding</p>
          <p className={`text-sm font-bold ${customer.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹ {customer.outstandingAmount.toLocaleString('en-IN')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => onViewDetail(customer)}
            className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Details
          </button>
          <button 
            onClick={() => onEdit(customer)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
