import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { clearImportHistory } from '../services/historyService';
import { ConfirmModal } from './ConfirmModal';

interface MaintenancePageProps {
  onAlert: (message: string) => void;
}

export function MaintenancePage({ onAlert }: MaintenancePageProps) {
  const [clearingHistory, setClearingHistory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearHistory = async () => {
    setShowClearConfirm(false);
    setClearingHistory(true);
    try {
      const result = await clearImportHistory();
      if (result.success) {
        onAlert('Histórico de importações removido com sucesso.');
      } else {
        onAlert(result.error || 'Erro ao limpar histórico.');
      }
    } catch {
      onAlert('Erro de conexão ao limpar histórico.');
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Manutenção
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Operações administrativas de limpeza do sistema.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900/40 dark:bg-slate-800">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Apagar Histórico de Importações
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Remove permanentemente todo o histórico de importações desta instalação.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="text-xs text-red-700 dark:text-red-300">
              Esta ação não poderá ser desfeita. Todos os registros de importação e sessões ativas serão removidos.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowClearConfirm(true)}
          disabled={clearingHistory}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
        >
          {clearingHistory ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Limpando...
            </>
          ) : (
            <>
              <Trash2 className="h-5 w-5" />
              Apagar Histórico
            </>
          )}
        </button>
      </div>

      {showClearConfirm && (
        <ConfirmModal
          title="Apagar Histórico de Importações?"
          message="Esta ação removerá permanentemente todo o histórico de importações. Esta operação não poderá ser desfeita. Deseja continuar?"
          confirmLabel="Apagar Histórico"
          cancelLabel="Cancelar"
          confirmVariant="danger"
          onConfirm={handleClearHistory}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}
