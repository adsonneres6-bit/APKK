import { useState } from 'react';
import { Megaphone, CheckCircle } from 'lucide-react';
import type { GlobalAnnouncement } from '../services/announcementService';

interface GlobalAnnouncementModalProps {
  announcement: GlobalAnnouncement;
  onConfirm: () => void;
}

export function GlobalAnnouncementModal({
  announcement,
  onConfirm,
}: GlobalAnnouncementModalProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    onConfirm();
  };

  const requireConfirmation = announcement.requireConfirmation;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={requireConfirmation ? undefined : undefined}
    >
      <div
        className="animate-slide-up w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Megaphone className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {announcement.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comunicado Oficial
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="px-6 py-5">
          <div className="max-h-[50vh] overflow-y-auto rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {announcement.message}
            </p>
          </div>

          {requireConfirmation && (
            <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              Para continuar utilizando o sistema, confirme a leitura deste comunicado.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5" />
            {confirming ? 'Confirmando...' : 'Entendi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook export for checking announcements
export { getActiveAnnouncements, confirmAnnouncement } from '../services/announcementService';
export type { GlobalAnnouncement } from '../services/announcementService';
