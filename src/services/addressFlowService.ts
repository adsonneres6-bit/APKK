/**
 * Persists the state of the "Otimizar Endereços → Circuit → PDF" operation
 * so it survives app restarts and backgrounding. Stored in localStorage to
 * keep it lightweight and available before any async DB init.
 */

export type FlowStep =
  | 'idle'
  | 'imported'
  | 'optimized'
  | 'xlsx_saved'
  | 'awaiting_pdf'
  | 'processing_pdf'
  | 'completed'
  | 'failed';

export interface RouteMetricsData {
  totalOrders: number;
  savedStops: number;
  totalStops: number;
}

export interface FlowState {
  step: FlowStep;
  fileName: string | null;
  outputFileName: string | null;
  metrics: RouteMetricsData | null;
  startedAt: number;
  updatedAt: number;
  error: string | null;
}

const STORAGE_KEY = 'rota123_address_flow';

function emptyState(): FlowState {
  return {
    step: 'idle',
    fileName: null,
    outputFileName: null,
    metrics: null,
    startedAt: 0,
    updatedAt: 0,
    error: null,
  };
}

export function getFlowState(): FlowState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as FlowState;
    if (!parsed.step) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

export function saveFlowState(partial: Partial<FlowState>): FlowState {
  const current = getFlowState();
  const next: FlowState = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
    startedAt: current.startedAt || Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
  return next;
}

export function clearFlowState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const STEP_ORDER: FlowStep[] = [
  'imported',
  'optimized',
  'xlsx_saved',
  'awaiting_pdf',
  'processing_pdf',
  'completed',
];

export const STEP_LABELS: Record<FlowStep, string> = {
  idle: 'Iniciando...',
  imported: 'Planilha importada',
  optimized: 'Endereços otimizados',
  xlsx_saved: 'TSV salvo',
  awaiting_pdf: 'Aguardando PDF da rota',
  processing_pdf: 'Processando PDF da rota',
  completed: 'Processamento final',
  failed: 'Falha no processamento',
};
