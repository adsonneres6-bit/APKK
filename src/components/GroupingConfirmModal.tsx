import { MapPin, Layers, Check, X } from 'lucide-react';
import type { PotentialGroup } from '../services/groupingService';

interface GroupingConfirmModalProps {
  potentialGroups: PotentialGroup[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function GroupingConfirmModal({
  potentialGroups,
  onConfirm,
  onCancel,
}: GroupingConfirmModalProps) {
  const totalOrders = potentialGroups.reduce(
    (sum, g) => sum + g.count,
    0,
  );
  const savedStops = potentialGroups.reduce(
    (sum, g) => sum + (g.count - 1),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="animate-slide-up w-full max-w-lg rounded-t-3xl bg-white p-5 dark:bg-slate-800 sm:rounded-3xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900/30">
            <Layers className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Deseja Agrupar Endereço?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {potentialGroups.length}{' '}
              {potentialGroups.length === 1
                ? 'endereço com pedidos repetidos'
                : 'endereços com pedidos repetidos'}{' '}
              · {totalOrders} pedidos
            </p>
          </div>
        </div>

        <div className="mb-4 max-h-[40vh] space-y-2 overflow-y-auto scrollbar-thin">
          {potentialGroups.map((group, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/40"
            >
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {group.officialAddress}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {group.count} pedidos
                    </span>
                    {group.sequences.slice(0, 4).map((seq, j) => (
                      <span
                        key={j}
                        className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-300"
                      >
                        #{seq}
                      </span>
                    ))}
                    {group.sequences.length > 4 && (
                      <span className="text-xs text-slate-400">
                        +{group.sequences.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          Agrupando: {savedStops}{' '}
          {savedStops === 1 ? 'parada será economizada' : 'paradas serão economizadas'}{' '}
          mantendo as sequências originais na mesma linha.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Check className="h-5 w-5" />
            SIM
          </button>
          <button
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <X className="h-5 w-5" />
            NÃO
          </button>
        </div>
      </div>
    </div>
  );
}
