import React from 'react';
import { LucideIcon } from 'lucide-react';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  type?: StatusType;
  icon?: LucideIcon;
  className?: string;
}

const styles: Record<StatusType, string> = {
  success: 'bg-green-50 text-green-700 border-green-100',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  error: 'bg-red-50 text-red-700 border-red-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  neutral: 'bg-gray-50 text-gray-700 border-gray-100',
};

export function StatusBadge({ label, type = 'neutral', icon: Icon, className }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[type]} ${className}`}>
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {label}
    </span>
  );
}
