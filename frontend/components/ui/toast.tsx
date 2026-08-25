'use client';

import { useEffect } from 'react';
import { useToastStore, ToastItem } from '@/hooks/useToast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styleMap = {
  success: {
    bg: 'bg-white border-green-200',
    iconColor: 'text-green-600',
    bar: 'bg-green-500',
  },
  error: {
    bg: 'bg-white border-red-200',
    iconColor: 'text-red-600',
    bar: 'bg-red-500',
  },
  info: {
    bg: 'bg-white border-blue-200',
    iconColor: 'text-blue-600',
    bar: 'bg-blue-500',
  },
  warning: {
    bg: 'bg-white border-amber-200',
    iconColor: 'text-amber-600',
    bar: 'bg-amber-500',
  },
};

function ToastElement({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const Icon = iconMap[toast.type];
  const styles = styleMap[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, removeToast]);

  return (
    <div
      className={cn(
        'group relative flex w-80 sm:w-96 items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-top-4',
        styles.bg
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', styles.iconColor)} />
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-gray-600 leading-relaxed break-words">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="rounded-lg p-1 text-gray-400 opacity-80 hover:bg-gray-100 hover:text-gray-600 transition-opacity"
        title="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-full pointer-events-auto">
      {toasts.map((t) => (
        <ToastElement key={t.id} toast={t} />
      ))}
    </div>
  );
}
