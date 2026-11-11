import { useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCcw,
  Truck,
} from 'lucide-react';
import { importPdf } from '../services/importService';
import { findByFileName, type HistoryEntry } from '../services/historyService';
import { optimizeAddressesFile } from '../services/addressOptimizerService';
import type { FlowState } from '../services/addressFlowService';
import { openSavedFile } from '../services/nativeDownload';
import { AddressFlowProgress } from './AddressFlowProgress';
import { DuplicateFileModal } from './DuplicateFileModal';
import { ConfirmModal } from './ConfirmModal';
import type { RawRow } from '../types';

const PHASE_LABELS = ['Planilha', 'Arquivo TSV', 'PDF da rota'];

const PRIMARY_BUTTON =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY_BUTTON =
  'flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700';

interface PrepareRouteScreenProps {
  flowState: FlowState;
  preparedRoute: { blob: Blob; fileName: string } | null;
  onBack: () => void;
  onCancelOperation: () => void;
  onImport: (rows: RawRow[], headers: string[], fileName: string) => void;
  onResumeEntry: (entry: HistoryEntry) => void;
  onError: (message: string) => void;
  onAddressOptimized: (
    blob: Blob,
    outputFileName: string,
    metrics: FlowState['metrics'],
  ) => Promise<boolean>;
  onRetrySave: () => void;
  onDownloadAgain: () => Promise<boolean>;
}

function phaseIndex(step: FlowState['step']): number {
  if (step === 'processing_pdf' || step === 'completed') return 2;
  if (step === 'xlsx_saved' || step === 'awaiting_pdf') return 1;
  return 0;
}

function RouteProgress({ step }: { step: FlowState['step'] }) {
  const current = phaseIndex(step);
  const failed = step === 'failed';
  return (
    <ol className="flex items-center gap-2" aria-label="Progresso da preparação">
      {PHASE_LABELS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span
              className={`h-1 w-full rounded-full transition-colors ${
                done || active
                  ? failed && active
                    ? 'bg-red-500'
                    : 'bg-brand-600 dark:bg-brand-400'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
            <span
              className={`truncate text-[11px] font-medium ${
                active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StatusPanel({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/30">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
      {children && <div className="mt-6 flex w-full flex-col gap-2.5">{children}</div>}
    </div>
  );
}

export function PrepareRouteScreen({
  flowState,
  preparedRoute,
  onBack,
  onCancelOperation,
  onImport,
  onResumeEntry,
  onError,
  onAddressOptimized,
  onRetrySave,
  onDownloadAgain,
}: PrepareRouteScreenProps) {
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pendingAddressFile, setPendingAddressFile] = useState<File | null>(null);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [existingEntry, setExistingEntry] = useState<HistoryEntry | null>(null);

  const step = flowState.step;
  const hasOperation = step !== 'idle' && step !== 'completed';

  const handleOpenFile = async () => {
    if (!preparedRoute) return;
    const opened = await openSavedFile(preparedRoute.fileName);
    if (!opened) {
      const saved = await onDownloadAgain();
      if (!saved) onError('Não foi possível abrir o arquivo. Baixe-o novamente.');
    }
  };

  const readPdf = async (file: File) => {
    const { rows, headers } = await importPdf(file);
    if (rows.length === 0) onError('Nenhum pedido encontrado no arquivo.');
    else onImport(rows, headers, file.name);
  };

  const handlePdfSelected = async (file: File) => {
    setPdfLoading(true);
    try {
      const existing = await findByFileName(file.name);
      if (existing) {
        setPendingPdf(file);
        setExistingEntry(existing);
        return;
      }
      await readPdf(file);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao importar arquivo.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleImportAnyway = async () => {
    if (!pendingPdf) return;
    const file = pendingPdf;
    setExistingEntry(null);
    setPendingPdf(null);
    setPdfLoading(true);
    try {
      await readPdf(file);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao importar arquivo.');
    } finally {
      setPdfLoading(false);
    }
  };

  const runAddressFlow = async (file: File) => {
    setAddressLoading(true);
    try {
      const { blob, outputFileName, totalOrders, totalStops } = await optimizeAddressesFile(file);
      if (!outputFileName) {
        onError('Nenhum endereço encontrado no arquivo.');
        return;
      }
      await onAddressOptimized(blob, outputFileName, {
        totalOrders,
        savedStops: Math.max(0, totalOrders - totalStops),
        totalStops,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao processar endereços.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleXlsxSelected = (file: File) => {
    if (step === 'awaiting_pdf') {
      setPendingAddressFile(file);
      return;
    }
    runAddressFlow(file);
  };

  const renderPanel = () => {
    if (addressLoading) {
      return (
        <StatusPanel
          icon={<Loader2 className="h-7 w-7 animate-spin text-brand-600 dark:text-brand-400" />}
          title="Otimizando endereços..."
          text="Estamos padronizando os endereços da sua planilha."
        />
      );
    }

    if (pdfLoading) {
      return (
        <StatusPanel
          icon={<Loader2 className="h-7 w-7 animate-spin text-brand-600 dark:text-brand-400" />}
          title="Lendo o PDF da rota..."
          text="Isso leva apenas alguns instantes."
        />
      );
    }

    if (step === 'optimized') {
      return (
        <StatusPanel
          icon={<Loader2 className="h-7 w-7 animate-spin text-brand-600 dark:text-brand-400" />}
          title="Salvando arquivo TSV..."
          text="Confirme o salvamento para continuar."
        />
      );
    }

    if (step === 'processing_pdf') {
      return (
        <StatusPanel
          icon={<Loader2 className="h-7 w-7 animate-spin text-brand-600 dark:text-brand-400" />}
          title="Processando o PDF da rota..."
          text="Aguarde enquanto preparamos a sua rota."
        />
      );
    }

    if (step === 'failed') {
      return (
        <StatusPanel
          icon={<RotateCcw className="h-7 w-7 text-red-600 dark:text-red-400" />}
          title="Não foi possível concluir"
          text={flowState.error ?? 'Ocorreu um erro ao preparar a rota.'}
        >
          <button
            onClick={() => (preparedRoute ? onRetrySave() : xlsxInputRef.current?.click())}
            className={PRIMARY_BUTTON}
          >
            <RotateCcw className="h-4 w-4" />
            Tentar novamente
          </button>
          <button onClick={onCancelOperation} className={SECONDARY_BUTTON}>
            Cancelar operação
          </button>
        </StatusPanel>
      );
    }

    if (step === 'awaiting_pdf') {
      return (
        <div className="space-y-5">
          {preparedRoute && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {preparedRoute.fileName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Download concluído
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleOpenFile}
                  className={SECONDARY_BUTTON + ' flex-1'}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir arquivo
                </button>
                <button
                  onClick={() => onDownloadAgain()}
                  className={SECONDARY_BUTTON + ' flex-1'}
                >
                  <Download className="h-4 w-4" />
                  Baixar novamente
                </button>
              </div>
            </div>
          )}

          <StatusPanel
            icon={<Clock className="h-7 w-7 text-amber-500" />}
            title="Agora é com o Circuit!"
            text="Abra o arquivo no Circuit, organize suas paradas e selecione Imprimir rota."
          >
            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
              ⏳ Aguardando sua rota...
            </p>
            <button
              onClick={() => pdfInputRef.current?.click()}
              className={SECONDARY_BUTTON}
            >
              <FileText className="h-4 w-4" />
              Já tenho o PDF
            </button>
            <button
              onClick={onCancelOperation}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              Cancelar operação
            </button>
          </StatusPanel>
        </div>
      );
    }

    return (
      <StatusPanel
        icon={<Truck className="h-7 w-7 text-brand-600 dark:text-brand-400" />}
        title="Vamos preparar sua rota?"
        text="Selecione sua planilha do SPX."
      >
        <button onClick={() => xlsxInputRef.current?.click()} className={PRIMARY_BUTTON}>
          <FileSpreadsheet className="h-4 w-4" />
          Selecionar XLSX
        </button>
        <div className="my-1 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">ou</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
        <button onClick={() => pdfInputRef.current?.click()} className={SECONDARY_BUTTON}>
          <FileText className="h-4 w-4" />
          Já tenho o PDF
        </button>
      </StatusPanel>
    );
  };

  return (
    <section className="animate-fade-in space-y-5">
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          aria-label="Voltar para a página inicial"
          className="mt-0.5 rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">Preparar Rota</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Sua rota, do arquivo à bipagem.</p>
        </div>
      </div>

      <RouteProgress step={step} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {renderPanel()}
        {flowState.error && step !== 'failed' && (
          <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {flowState.error}
          </p>
        )}
      </div>

      {hasOperation && <AddressFlowProgress state={flowState} />}

      <input
        ref={xlsxInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        disabled={addressLoading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleXlsxSelected(file);
          e.target.value = '';
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        disabled={pdfLoading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePdfSelected(file);
          e.target.value = '';
        }}
      />

      {existingEntry && (
        <DuplicateFileModal
          fileName={existingEntry.fileName}
          onResume={() => {
            onResumeEntry(existingEntry);
            setExistingEntry(null);
            setPendingPdf(null);
          }}
          onImportAgain={handleImportAnyway}
          onClose={() => {
            setExistingEntry(null);
            setPendingPdf(null);
          }}
        />
      )}

      {pendingAddressFile && (
        <ConfirmModal
          title="Substituir a rota em andamento?"
          message="Já existe uma rota aguardando o PDF do Circuit. Ao iniciar uma nova planilha, a operação atual será cancelada."
          confirmLabel="Substituir"
          confirmVariant="danger"
          onConfirm={() => {
            const file = pendingAddressFile;
            setPendingAddressFile(null);
            runAddressFlow(file);
          }}
          onCancel={() => setPendingAddressFile(null)}
        />
      )}
    </section>
  );
}
