import { CheckCircle, Clock, Loader2, Lock, XCircle } from 'lucide-react';
import type { FlowState, FlowStep } from '../services/addressFlowService';
import { STEP_ORDER, STEP_LABELS } from '../services/addressFlowService';

interface AddressFlowProgressProps {
  state: FlowState;
}

function stepStatus(step: FlowStep, current: FlowStep): 'done' | 'active' | 'pending' {
  if (current === 'failed') return step === 'failed' ? 'active' : 'pending';
  const currentIdx = STEP_ORDER.indexOf(current);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (currentIdx === -1) return 'pending';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

function StepIcon({ step, status }: { step: FlowStep; status: 'done' | 'active' | 'pending' }) {
  if (status === 'done') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === 'pending') return <Lock className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />;
  if (step === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
  if (step === 'awaiting_pdf') return <Clock className="h-4 w-4 animate-pulse text-amber-500" />;
  return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
}

export function AddressFlowProgress({ state }: AddressFlowProgressProps) {
  const visibleSteps: FlowStep[] =
    state.step === 'failed' ? ['failed'] : [...STEP_ORDER];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Histórico da operação
      </p>
      <ol className="space-y-2">
        {visibleSteps.map((step) => {
          const status = stepStatus(step, state.step);
          return (
            <li key={step} className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <StepIcon step={step} status={status} />
              </span>
              <span
                className={
                  status === 'done'
                    ? 'text-xs text-slate-400 line-through dark:text-slate-500'
                    : status === 'active'
                      ? 'text-xs font-semibold text-slate-900 dark:text-white'
                      : 'text-xs text-slate-400 dark:text-slate-500'
                }
              >
                {STEP_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
