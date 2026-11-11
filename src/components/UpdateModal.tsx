import { RefreshCw, Sparkles } from 'lucide-react';

interface UpdateModalProps {
  onConfirm: () => void;
}

export function UpdateModal({ onConfirm }: UpdateModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
          <Sparkles className="h-8 w-8 text-brand-600 dark:text-brand-400" />
        </div>

        <h2 className="text-center text-lg font-bold text-slate-900 dark:text-white">
          Nova versão disponível
        </h2>

        <p className="mt-3 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Uma nova versão do sistema está disponível. Atualize agora para garantir
          o melhor desempenho e os recursos mais recentes.
        </p>

        <button
          onClick={onConfirm}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
        >
          <RefreshCw className="h-5 w-5" />
          Atualizar agora
        </button>
      </div>
    </div>
  );
}
