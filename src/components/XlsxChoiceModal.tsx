import { MapPin, Users, X, FileSpreadsheet } from 'lucide-react';
import type { SharedFileData } from '../hooks/useSharedFile';

interface XlsxChoiceModalProps {
  sharedFile: SharedFileData;
  onChooseAddress: () => void;
  onChooseFrota: () => void;
  onCancel: () => void;
}

export function XlsxChoiceModal({
  sharedFile,
  onChooseAddress,
  onChooseFrota,
  onCancel,
}: XlsxChoiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-5 dark:bg-slate-800 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Escolha a funcionalidade
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 rounded-xl bg-slate-100 p-3 dark:bg-slate-700/50">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Arquivo recebido:
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {sharedFile.fileName}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onChooseAddress}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-emerald-400 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Otimizar Endereços
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Padronize e limpe os endereços do arquivo.
              </p>
            </div>
          </button>

          <button
            onClick={onChooseFrota}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-orange-400 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-orange-500"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-blue-700">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Otimizar Frota
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Padronize endereços, una duplicatas e consolide sequências.
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
