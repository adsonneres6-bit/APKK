import { ChevronRight, Truck } from 'lucide-react';
import type { FlowState } from '../services/addressFlowService';
import { FrotaCard } from './FrotaCard';

const IN_PROGRESS_STEPS: FlowState['step'][] = [
  'optimized',
  'xlsx_saved',
  'awaiting_pdf',
  'processing_pdf',
  'failed',
];

interface HomeCardsProps {
  flowState: FlowState;
  onOpenPrepareRoute: () => void;
  onError: (message: string) => void;
}

export function HomeCards({ flowState, onOpenPrepareRoute, onError }: HomeCardsProps) {
  const inProgress = IN_PROGRESS_STEPS.includes(flowState.step);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={onOpenPrepareRoute}
        className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
            <Truck className="h-6 w-6 text-white" />
          </div>
          {inProgress && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Em andamento
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preparar Rota</h3>
        <p className="mt-1 mb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Prepare seus endereços e organize suas entregas em poucos passos.
        </p>
        <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
          Abrir
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </button>

      <FrotaCard onError={onError} />
    </div>
  );
}
