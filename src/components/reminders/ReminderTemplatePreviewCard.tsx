import React from 'react';
import { MessageSquare, Send, Copy, Edit2 } from 'lucide-react';

interface ReminderTemplatePreviewCardProps {
  title: string;
  message: string;
  type: string;
}

export const ReminderTemplatePreviewCard: React.FC<ReminderTemplatePreviewCardProps> = ({ title, message, type }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">{title}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{type.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Copy Template">
            <Copy className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit Template">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
        <p className="text-xs text-gray-600 leading-relaxed italic">
          "{message}"
        </p>
      </div>

      <button className="w-full py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
        <Send className="w-3.5 h-3.5" />
        Use This Template
      </button>
    </div>
  );
};
