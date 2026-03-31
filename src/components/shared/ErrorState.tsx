import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-red-50 rounded-3xl border border-red-100 shadow-sm">
      <div className="p-4 bg-red-100 text-red-500 rounded-full mb-6">
        <AlertCircle size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-red-900">{title}</h3>
      <p className="text-red-700 mt-2 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-8 inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all shadow-sm"
        >
          <RefreshCw size={18} className="mr-2" />
          Retry
        </button>
      )}
    </div>
  );
}
