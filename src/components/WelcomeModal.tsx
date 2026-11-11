import { PlayCircle } from 'lucide-react';

interface WelcomeModalProps {
  onGoToTutorials: () => void;
  onAlreadyKnow: () => void;
}

export function WelcomeModal({ onGoToTutorials, onAlreadyKnow }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="animate-slide-up w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
            <PlayCircle className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Message */}
        <div className="px-6 py-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Bem-vindo!
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Para utilizar o sistema corretamente e aproveitar todos os recursos disponíveis, recomendamos visualizar nossos tutoriais de uso.
          </p>
          <p className="mt-2 text-sm font-medium text-orange-600 dark:text-blue-400">
            O Tutorial Flex apresenta o funcionamento principal do sistema e é altamente recomendado para novos usuários.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <button
            onClick={onGoToTutorials}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            <PlayCircle className="h-5 w-5" />
            Ir para os Tutoriais
          </button>
          <button
            onClick={onAlreadyKnow}
            className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Já sei usar o sistema
          </button>
        </div>
      </div>
    </div>
  );
}
