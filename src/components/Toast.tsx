import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const config = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500',
  },
};

export function Toast({ toast, onClose }: ToastProps) {
  const { icon: Icon, bg } = config[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div className="animate-slide-up flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-800 p-4 shadow-2xl backdrop-blur">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <p className="flex-1 pt-1.5 text-sm font-medium text-slate-100">
        {toast.message}
      </p>
      <button
        onClick={() => onClose(toast.id)}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastData[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed inset-x-0 top-4 z-50 mx-auto flex max-w-md flex-col gap-2 px-4">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}
