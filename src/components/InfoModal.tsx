import { Lightbulb } from 'lucide-react';

interface InfoModalProps {
  onConfirm: () => void;
}

export function InfoModal({ onConfirm }: InfoModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="animate-slide-up w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500">
            <Lightbulb className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Message */}
        <div className="px-6 py-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Informativo!
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Sempre que precisar de ajuda ou quiser revisar alguma funcionalidade, acesse{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">Menu</span>{' '}
            {'→'}{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">Tutoriais</span>.
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Os vídeos estarão disponíveis para consulta a qualquer momento.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
