import { useState } from 'react';
import { Search as SearchIcon, X, ScanLine, CheckCircle2 } from 'lucide-react';
import type { RawRow, DeliveryGroup, SearchResult } from '../types';
import { search as searchFn } from '../services/searchService';

interface SearchProps {
  rows: RawRow[];
  groups: DeliveryGroup[];
  checkState: Record<string, boolean>;
  onScan: (spxTn: string) => void;
}

export function SearchComponent({ rows, groups, checkState, onScan }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setResults(searchFn(q, rows, groups));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por SPX TN ou endereço..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        {query && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto scrollbar-thin">
          {results.map((r, i) => {
            const isChecked = r.row.spxTn ? checkState[r.row.spxTn] : false;
            return (
              <div
                key={i}
                className={`rounded-xl border p-3 ${
                  isChecked
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isChecked && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {r.row.spxTn}
                    </span>
                  </div>
                  {r.group && (
                    <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      {r.group.generatedSequence}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {r.row.destinationAddress}
                </p>
                {!isChecked && (
                  <button
                    onClick={() => onScan(r.row.spxTn)}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
                  >
                    <ScanLine className="h-4 w-4" />
                    Scannear
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {query && results.length === 0 && (
        <p className="mt-3 text-center text-sm text-slate-400">
          Nenhum resultado encontrado.
        </p>
      )}
    </div>
  );
}
