import { useState } from 'react';
import { X, Calendar, Clock, Download, Trash2, Package, FileSpreadsheet, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import {
  type HistoryEntry,
  reexportXlsx,
  deleteHistoryEntry,
} from '../services/historyService';

interface HistoryModalProps {
  entries: HistoryEntry[];
  onClose: () => void;
  onRefresh: () => void;
  onResume: (entry: HistoryEntry) => void;
}

export function HistoryModal({ entries, onClose, onRefresh, onResume }: HistoryModalProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Agrupar por data
  const byDate = entries.reduce<Record<string, HistoryEntry[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteHistoryEntry(id);
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-slide-up flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Histórico
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4">
          {dates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                Nenhum histórico ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dates.map((date) => {
                const dayEntries = byDate[date];
                const expanded = expandedDate === date;
                return (
                  <div
                    key={date}
                    className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
                  >
                    {/* Cabeçalho da data */}
                    <button
                      onClick={() => setExpandedDate(expanded ? null : date)}
                      className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
                          <Calendar className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {date}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {dayEntries.length} importação(ões)
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      >
                        ▼
                      </span>
                    </button>

                    {/* Detalhes */}
                    {expanded && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {dayEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="space-y-3 p-4"
                          >
                            {/* Nome do arquivo */}
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-500" />
                              <span className="truncate">{entry.fileName}</span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-xl bg-slate-100 p-2.5 text-center dark:bg-slate-700/50">
                                <Package className="mx-auto h-4 w-4 text-slate-400" />
                                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                  {entry.totalOrders}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Pedidos
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-100 p-2.5 text-center dark:bg-slate-700/50">
                                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                  {entry.checkedOrders}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Conferidos
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-100 p-2.5 text-center dark:bg-slate-700/50">
                                <FileSpreadsheet className="mx-auto h-4 w-4 text-brand-500" />
                                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                  {entry.totalGroups}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Grupos
                                </p>
                              </div>
                            </div>

                            {/* Horários */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Importado: {entry.importTime}</span>
                              </div>
                              {entry.exportTime && (
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Exportado: {entry.exportTime}</span>
                                </div>
                              )}
                            </div>

                            {/* Acoes */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  onResume(entry);
                                  onClose();
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Retomar
                              </button>
                              <button
                                onClick={() => reexportXlsx(entry)}
                                className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                                title="Baixar XLSX"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                disabled={deletingId === entry.id}
                                className="flex items-center justify-center rounded-xl border border-red-200 px-3 py-2.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                title="Excluir"
                              >
                                {deletingId === entry.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
