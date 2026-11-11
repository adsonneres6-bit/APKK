import { CheckCircle2, Circle, MapPin } from 'lucide-react';
import type { DeliveryGroup, CheckState } from '../types';

interface DeliveryListProps {
  groups: DeliveryGroup[];
  checkState: CheckState;
}

export function DeliveryList({ groups, checkState }: DeliveryListProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Lista de Entregas
        </h2>
      </div>
      <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
        {groups.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Nenhuma entrega carregada.
          </p>
        )}
        {groups.map((group, i) => {
          const allChecked = group.spxTns.every(
            (spx) => checkState.checked[spx],
          );
          return (
            <div
              key={group.id}
              className={`flex items-start gap-3 border-b border-slate-100 px-4 py-3 transition-colors dark:border-slate-700/50 ${
                allChecked ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
              } ${group.completed ? 'ring-1 ring-inset ring-emerald-300 dark:ring-emerald-700' : ''}`}
            >
              <div className="shrink-0 pt-0.5">
                {allChecked ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {group.generatedSequence || `${i + 1}`}
                  </span>
                </div>
                <div className="mt-0.5 flex items-start gap-1 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{group.officialAddress}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {group.spxTns.map((spx) => {
                    const checked = checkState.checked[spx];
                    return (
                      <span
                        key={spx}
                        className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                          checked
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {spx}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
