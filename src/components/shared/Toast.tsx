import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  loading: (message: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (type !== 'loading') {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const success = (message: string, duration?: number) => toast(message, 'success', duration);
  const error = (message: string, duration?: number) => toast(message, 'error', duration);
  const info = (message: string, duration?: number) => toast(message, 'info', duration);
  const loading = (message: string) => toast(message, 'loading');

  return (
    <ToastContext.Provider value={{ toast, success, error, info, loading, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-100 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-white ${
                t.type === 'success' ? 'border-green-100 text-green-700' :
                t.type === 'error' ? 'border-red-100 text-red-700' :
                t.type === 'loading' ? 'border-blue-100 text-blue-700' :
                'border-gray-100 text-gray-700'
              }`}
            >
              <div className="shrink-0">
                {t.type === 'success' && <CheckCircle2 size={20} className="text-green-500" />}
                {t.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
                {t.type === 'info' && <Info size={20} className="text-blue-500" />}
                {t.type === 'loading' && <Loader2 size={20} className="text-blue-500 animate-spin" />}
              </div>
              <p className="text-sm font-bold tracking-tight flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-all"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
