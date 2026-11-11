import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, PlayCircle, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  getTutorialInterfaceUrl,
  getTutorialFlexUrl,
  getTutorialFrotaUrl,
  toEmbedUrl,
  extractYouTubeVideoId,
} from '../services/settingsService';
import {
  completeTutorial,
  hasCompletedTutorial,
  type TutorialType,
} from '../services/tutorialService';

interface TutorialItem {
  type: TutorialType;
  title: string;
  description: string;
}

const TUTORIALS: TutorialItem[] = [
  {
    type: 'flex',
    title: 'Tutorial Flex',
    description: 'Conheça o funcionamento principal do sistema',
  },
  {
    type: 'interface',
    title: 'Tutorial Interface',
    description: 'Aprenda a navegar pela interface',
  },
  {
    type: 'frota',
    title: 'Tutorial Frota',
    description: 'Gerencie sua frota de entregas',
  },
];

interface TutorialsPageProps {
  userId: string;
  onBack: () => void;
}

export function TutorialsPage({
  userId,
  onBack,
}: TutorialsPageProps) {
  const [activeTutorial, setActiveTutorial] = useState<TutorialType | null>(null);
  const [tutorialUrls, setTutorialUrls] = useState({
    interface: '',
    flex: '',
    frota: '',
  });
  const [loaded, setLoaded] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<Set<TutorialType>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Load tutorial URLs
  useEffect(() => {
    const loadUrls = async () => {
      const [interfaceUrl, flexUrl, frotaUrl] = await Promise.all([
        getTutorialInterfaceUrl(),
        getTutorialFlexUrl(),
        getTutorialFrotaUrl(),
      ]);
      setTutorialUrls({
        interface: interfaceUrl,
        flex: flexUrl,
        frota: frotaUrl,
      });
      setLoaded(true);
    };
    loadUrls();
  }, []);

  // Load completed tutorials
  useEffect(() => {
    const loadCompleted = async () => {
      const completed = new Set<TutorialType>();
      for (const t of TUTORIALS) {
        if (await hasCompletedTutorial(userId, t.type)) {
          completed.add(t.type);
        }
      }
      setCompletedTutorials(completed);
    };
    loadCompleted();
  }, [userId]);

  // Get available tutorials (only those with URLs configured)
  const availableTutorials = TUTORIALS.filter(t => tutorialUrls[t.type]);

  const currentTutorial = TUTORIALS.find(t => t.type === activeTutorial);
  const currentUrl = currentTutorial ? tutorialUrls[currentTutorial.type] : '';
  const embedUrl = currentUrl ? toEmbedUrl(currentUrl) : '';
  const videoId = currentUrl ? extractYouTubeVideoId(currentUrl) : null;
  const isCompleted = currentTutorial ? completedTutorials.has(currentTutorial.type) : false;

  const handleSelectTutorial = (type: TutorialType) => {
    setActiveTutorial(type);
    setIframeError(false);
  };

  const handleOpenInYouTube = () => {
    if (videoId) {
      window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    }
  };

  const handleConfirmCompletion = useCallback(async () => {
    if (!activeTutorial || !currentTutorial) return;

    setConfirming(true);
    const success = await completeTutorial(userId, activeTutorial);

    if (success) {
      setCompletedTutorials(prev => new Set([...prev, activeTutorial]));
    }

    setConfirming(false);
  }, [activeTutorial, currentTutorial, userId]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <button
            onClick={onBack}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <PlayCircle className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Tutoriais
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {!loaded ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : availableTutorials.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
            <PlayCircle className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nenhum tutorial disponível
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Os tutoriais serão exibidos aqui quando configurados pelo administrador.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            {/* Tutorial list */}
            <div className="space-y-2">
              {availableTutorials.map(tutorial => {
                const isTutorialCompleted = completedTutorials.has(tutorial.type);
                const isActive = activeTutorial === tutorial.type;

                return (
                  <button
                    key={tutorial.type}
                    onClick={() => handleSelectTutorial(tutorial.type)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isTutorialCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-slate-100 dark:bg-slate-700'
                      }`}
                    >
                      {isTutorialCompleted ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <PlayCircle className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {tutorial.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tutorial.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Video player */}
            {activeTutorial && currentTutorial && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {currentTutorial.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Assista quando quiser
                  </p>
                </div>

                {/* Video iframe */}
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                  {!embedUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 p-6 text-center dark:bg-slate-900">
                      <PlayCircle className="h-8 w-8 text-slate-400" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tutorial não configurado.
                      </p>
                    </div>
                  ) : iframeError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center dark:bg-slate-900">
                      <AlertTriangle className="h-8 w-8 text-amber-500" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nao foi possivel exibir o video
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                        O video pode ter a incorporacao desabilitada ou ser restrito pelo proprietario.
                      </p>
                      {videoId && (
                        <button
                          onClick={handleOpenInYouTube}
                          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Assistir no YouTube
                        </button>
                      )}
                    </div>
                  ) : (
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={embedUrl}
                      title={currentTutorial.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onError={() => setIframeError(true)}
                    />
                  )}
                </div>

                {/* Completion section */}
                <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
                  {isCompleted ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
                      <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Tutorial concluido!
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleConfirmCompletion}
                      disabled={confirming}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-600 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-5 w-5" />
                      {confirming ? 'Confirmando...' : 'Marcar como Concluido'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
