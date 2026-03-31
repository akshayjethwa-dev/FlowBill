import React from 'react';
import { LucideIcon, AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  error?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
  hint?: string;
}

export function FormField({ label, error, icon: Icon, children, required, className, hint }: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{hint}</span>}
      </div>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <div className={`${Icon ? 'pl-10' : ''}`}>
          {children}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 mt-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all shadow-sm ${className}`}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all shadow-sm appearance-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all shadow-sm min-h-[100px] resize-none ${className}`}
      {...props}
    />
  );
}
