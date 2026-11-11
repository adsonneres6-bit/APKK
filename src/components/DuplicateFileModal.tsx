import { AlertTriangle, RotateCcw, Upload } from 'lucide-react';

interface DuplicateFileModalProps {
  fileName: string;
  onResume: () => void;
  onImportAgain: () => void;
  onClose: () => void;
}

export function DuplicateFileModal({
  fileName,
  onResume,
  onImportAgain,
  onClose,
}: DuplicateFileModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Arquivo ja importado
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {fileName}
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
          Este arquivo ja foi importado anteriormente. Deseja retomar a importacao existente ou importar novamente?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onResume}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <RotateCcw className="h-4 w-4" />
            Retomar
          </button>
          <button
            onClick={onImportAgain}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <Upload className="h-4 w-4" />
            Importar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
