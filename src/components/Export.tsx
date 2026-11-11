import { X, FileCheck2, FileSpreadsheet, CheckCircle2, FileText } from 'lucide-react';
import type { RawRow, DeliveryGroup, CheckState } from '../types';
import { exportXlsx, type ExportMode } from '../services/exportService';

interface ExportModalProps {
  rows: RawRow[];
  groups: DeliveryGroup[];
  headers: string[];
  checkState: CheckState;
  onClose: () => void;
}

export function ExportModal({
  rows,
  groups,
  headers,
  checkState,
  onClose,
}: ExportModalProps) {
  const handleExport = (mode: ExportMode) => {
    exportXlsx(rows, groups, headers, checkState, mode);
    onClose();
  };

  const checkedCount = groups.filter((g) =>
    g.spxTns.every((spx) => checkState.checked[spx]),
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full max-w-lg rounded-t-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Exportar planilha
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Opção 1: somente conferidos */}
        <button
          onClick={() => handleExport('checked')}
          className="w-full rounded-2xl border-2 border-slate-200 p-4 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <FileCheck2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Somente pedidos conferidos
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Exporta apenas os pedidos que receberam sequência. Remove
                completamente os pedidos não conferidos.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {checkedCount} grupo(s) conferido(s)
              </div>
            </div>
          </div>
        </button>

        {/* Opção 2: planilha completa */}
        <button
          onClick={() => handleExport('full')}
          className="mt-3 w-full rounded-2xl border-2 border-slate-200 p-4 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/10"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
              <FileSpreadsheet className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Planilha completa
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Exporta toda a planilha original. Os pedidos conferidos recebem
                a sequência na coluna B. Os não conferidos permanecem exatamente
                como estavam, mantendo o valor original na coluna B.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                <FileText className="h-3.5 w-3.5" />
                {groups.length} grupo(s) no total
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
