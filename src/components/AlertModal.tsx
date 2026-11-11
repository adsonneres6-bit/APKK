import { AlertCircle } from 'lucide-react';

interface AlertModalProps {
  message: string;
  onClose: () => void;
}

export function AlertModal({ message, onClose }: AlertModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-5 dark:bg-slate-800 sm:rounded-3xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-base font-medium text-slate-900 dark:text-white">
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
        >
          OK
        </button>
      </div>
    </div>
  );
}
