import { useState, useEffect } from 'react';
import { X, PlayCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { getTutorialUrl, toEmbedUrl } from '../services/settingsService';

const TUTORIAL_HIDDEN_KEY = 'tutorial_hidden';

interface TutorialModalProps {
  onClose: () => void;
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [tutorialUrl, setTutorialUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    getTutorialUrl().then((url) => {
      setTutorialUrl(url);
      setLoaded(true);
    });
  }, []);

  const embedUrl = tutorialUrl ? toEmbedUrl(tutorialUrl) : '';

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(TUTORIAL_HIDDEN_KEY, '1');
    } else {
      localStorage.removeItem(TUTORIAL_HIDDEN_KEY);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="animate-slide-up w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <PlayCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Tutorial de Uso
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Aprenda a usar o Otimizador De Rota
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Iframe / loading / error */}
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          {!loaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
            </div>
          ) : !tutorialUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 p-6 text-center dark:bg-slate-900">
              <PlayCircle className="h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum tutorial configurado.
              </p>
            </div>
          ) : iframeError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center dark:bg-slate-900">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Este conteúdo não pode ser exibido diretamente aqui.
              </p>
              <a
                href={tutorialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir no navegador
              </a>
            </div>
          ) : (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={embedUrl}
              title="Tutorial de Uso"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={() => setIframeError(true)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Não mostrar novamente
            </span>
          </label>

          <button
            onClick={handleClose}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  return localStorage.getItem(TUTORIAL_HIDDEN_KEY) !== '1';
}
