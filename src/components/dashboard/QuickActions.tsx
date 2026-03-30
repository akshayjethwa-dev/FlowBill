import React from 'react';
import { Plus, Send, UserPlus, FileText, Smartphone } from 'lucide-react';

interface QuickActionProps {
  onAction: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionProps> = ({ onAction }) => {
  const actions = [
    { id: 'new-order', label: 'New Order', icon: Plus, color: 'bg-indigo-600' },
    { id: 'send-invoice', label: 'Send Invoice', icon: Send, color: 'bg-green-600' },
    { id: 'add-customer', label: 'Add Client', icon: UserPlus, color: 'bg-orange-600' },
    { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone, color: 'bg-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-${action.color.split('-')[1]}-100 group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-gray-700">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};
