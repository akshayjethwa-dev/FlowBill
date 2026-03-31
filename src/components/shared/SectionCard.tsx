import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, icon: Icon, children, actions, footer, className }: SectionCardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Icon size={20} strokeWidth={2} />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-6 flex-1">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          {footer}
        </div>
      )}
    </div>
  );
}
