import { useEffect, useRef, useState } from 'react';
import type { DeliveryGroup, CheckState } from '../types';

interface ScanPopupProps {
  group: DeliveryGroup;
  checkedSpxTns: CheckState['checked'];
  alreadyRead: boolean;
  lastReadSequence: string;
  onDismiss: () => void;
}

const DURATION_MS = 3500;

export function ScanPopup({ group, checkedSpxTns, alreadyRead, lastReadSequence, onDismiss }: ScanPopupProps) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const rafRef = useRef(0);

  const isGrouped = group.spxTns.length > 1;
  const allChecked = group.spxTns.every((spx) => checkedSpxTns[spx]);

  useEffect(() => {
    if (alreadyRead) return;

    startRef.current = Date.now();
    setProgress(100);

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        onDismiss();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [onDismiss, alreadyRead]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={`animate-slide-up mx-4 w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl ${
          alreadyRead
            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950'
            : 'border-brand-200 bg-white dark:border-slate-700 dark:bg-slate-800'
        }`}
      >
        <div className="px-6 pt-8 pb-6 text-center">
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${
              alreadyRead
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {alreadyRead ? 'Já Lido' : 'Conferido'}
          </p>

          {isGrouped ? (
            /* Grupo: exibe [35] + [36] com status individual */
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              {group.spxTns.map((spx, idx) => {
                const seq = group.sequences[idx] ?? String(group.sequenceBase);
                const checked = !!checkedSpxTns[spx];
                return (
                  <div key={spx} className="flex items-center gap-2">
                    {idx > 0 && (
                      <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">
                        +
                      </span>
                    )}
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-2xl border-2 transition-colors ${
                        checked
                          ? alreadyRead
                            ? 'border-amber-400 bg-amber-100 dark:border-amber-600 dark:bg-amber-900'
                            : 'border-green-400 bg-green-100 dark:border-green-500 dark:bg-green-900'
                          : 'border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`text-3xl font-extrabold tabular-nums ${
                          checked
                            ? alreadyRead
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-green-600 dark:text-green-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {seq}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Pedido único: exibe número grande */
            <p
              className={`mt-2 text-6xl font-extrabold tabular-nums ${
                alreadyRead
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {group.sequences[0] ?? String(group.sequenceBase)}
            </p>
          )}

          {isGrouped && !alreadyRead && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {allChecked
                ? 'Todos os pedidos conferidos'
                : `${group.spxTns.filter((s) => checkedSpxTns[s]).length} de ${group.spxTns.length} conferidos`}
            </p>
          )}

          {/* Último lido - destaque do último QR Code escaneado */}
          {isGrouped && (
            <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 ${
              alreadyRead
                ? 'bg-amber-100 dark:bg-amber-900/40'
                : 'bg-brand-50 dark:bg-brand-900/20'
            }`}>
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                alreadyRead
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-brand-600 dark:text-brand-400'
              }`}>
                Último lido
              </span>
              <span className={`text-2xl font-extrabold tabular-nums ${
                alreadyRead
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-brand-700 dark:text-brand-300'
              }`}>
                {lastReadSequence}
              </span>
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full transition-none ${
              alreadyRead ? 'bg-amber-500' : 'bg-brand-600'
            }`}
            style={{ width: `${alreadyRead ? 100 : progress}%` }}
          />
        </div>

        {/* Botão Entendido */}
        <div className="p-4">
          <button
            onClick={onDismiss}
            className={`w-full rounded-2xl py-3.5 text-base font-bold text-white transition-colors active:scale-[0.98] ${
              alreadyRead
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
