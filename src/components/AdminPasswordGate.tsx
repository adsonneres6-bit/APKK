import { useState, useRef, useEffect } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

interface AdminPasswordGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ADMIN_PASSWORD = '061026';

export function AdminPasswordGate({ onSuccess, onCancel }: AdminPasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div
        className={`w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800 ${
          shake ? 'animate-shake' : ''
        }`}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Acesso Restrito
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Digite a senha para acessar a administração.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Senha"
            className={`w-full rounded-xl border px-4 py-3 text-center text-lg font-semibold tracking-widest text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-white ${
              error
                ? 'border-red-400 focus:border-red-500 dark:border-red-500'
                : 'border-slate-200 focus:border-blue-500 dark:border-slate-700'
            }`}
          />

          {error && (
            <p className="mt-2 text-center text-xs font-medium text-red-500">
              Senha incorreta. Tente novamente.
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 active:scale-[0.98]"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
