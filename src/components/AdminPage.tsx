import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  ArrowLeft,
  Save,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Download,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Wrench,
} from 'lucide-react';
import {
  getTutorialInterfaceUrl,
  setTutorialInterfaceUrl,
  getTutorialFlexUrl,
  setTutorialFlexUrl,
  getTutorialFrotaUrl,
  setTutorialFrotaUrl,
  getApkCircuitUrl,
  setApkCircuitUrl,
  validateYouTubeUrl,
} from '../services/settingsService';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type GlobalAnnouncement,
  type DisplayLocation,
} from '../services/announcementService';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { MaintenancePage } from './MaintenancePage';

interface AdminPageProps {
  onBack: () => void;
}

type Tab = 'settings' | 'announcements' | 'maintenance';

export function AdminPage({ onBack }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [alertMessage, setAlertMessage] = useState('');

  const [tutorialsExpanded, setTutorialsExpanded] = useState(false);
  const [, setTutorialInterfaceUrlState] = useState('');
  const [tutorialInterfaceInput, setTutorialInterfaceInput] = useState('');
  const [, setTutorialFlexUrlState] = useState('');
  const [tutorialFlexInput, setTutorialFlexInput] = useState('');
  const [, setTutorialFrotaUrlState] = useState('');
  const [tutorialFrotaInput, setTutorialFrotaInput] = useState('');
  const [tutorialsSaving, setTutorialsSaving] = useState(false);
  const [tutorialsSaved, setTutorialsSaved] = useState(false);

  const [, setApkCircuitUrlState] = useState('');
  const [apkCircuitInput, setApkCircuitInput] = useState('');
  const [apkSaving, setApkSaving] = useState(false);
  const [apkSaved, setApkSaved] = useState(false);

  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [showAnnouncementEditor, setShowAnnouncementEditor] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<GlobalAnnouncement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<GlobalAnnouncement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    displayLocation: 'after_login' as DisplayLocation,
    showOncePerUser: true,
    requireConfirmation: true,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    getTutorialInterfaceUrl().then((url) => {
      setTutorialInterfaceUrlState(url);
      setTutorialInterfaceInput(url);
    });
    getTutorialFlexUrl().then((url) => {
      setTutorialFlexUrlState(url);
      setTutorialFlexInput(url);
    });
    getTutorialFrotaUrl().then((url) => {
      setTutorialFrotaUrlState(url);
      setTutorialFrotaInput(url);
    });
    getApkCircuitUrl().then((url) => {
      setApkCircuitUrlState(url);
      setApkCircuitInput(url);
    });
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    const data = await getAllAnnouncements();
    setAnnouncements(data);
    setLoadingAnnouncements(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'announcements') {
      loadAnnouncements();
    }
  }, [activeTab, loadAnnouncements]);

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
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Administração
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-4xl border-t border-slate-200 px-4 dark:border-slate-800">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <PlayCircle className="h-4 w-4" />
              Configurações
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'announcements'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Megaphone className="h-4 w-4" />
              Comunicados
              {announcements.filter(a => a.isActive).length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {announcements.filter(a => a.isActive).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'maintenance'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Wrench className="h-4 w-4" />
              Manutenção
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {activeTab === 'settings' && (
          <>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={() => setTutorialsExpanded(!tutorialsExpanded)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Tutoriais
                  </span>
                </div>
                {tutorialsExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {tutorialsExpanded && (
                <div className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-700">
                  <div>
                    <div className="mb-1.5">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        Tutorial Interface
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        URL do vídeo tutorial da interface do sistema (opcional).
                      </p>
                    </div>
                    <input
                      type="url"
                      value={tutorialInterfaceInput}
                      onChange={(e) => setTutorialInterfaceInput(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
                    <div className="mb-1.5">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        Tutorial Flex
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      URL do vídeo tutorial do sistema Flex.
                    </p>
                    <input
                      type="url"
                      value={tutorialFlexInput}
                      onChange={(e) => setTutorialFlexInput(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
                    <div className="mb-1.5">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        Tutorial Frota
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        URL do vídeo tutorial do sistema Frota (opcional).
                      </p>
                    </div>
                    <input
                      type="url"
                      value={tutorialFrotaInput}
                      onChange={(e) => setTutorialFrotaInput(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
                    <button
                      onClick={async () => {
                        setTutorialsSaving(true);
                        try {
                          const urls = [
                            { name: 'Interface', url: tutorialInterfaceInput.trim() },
                            { name: 'Flex', url: tutorialFlexInput.trim() },
                            { name: 'Frota', url: tutorialFrotaInput.trim() },
                          ];

                          for (const item of urls) {
                            if (item.url) {
                              const validation = validateYouTubeUrl(item.url);
                              if (!validation.valid) {
                                setAlertMessage(`Tutorial ${item.name}: ${validation.error}`);
                                setTutorialsSaving(false);
                                return;
                              }
                            }
                          }

                          const results = await Promise.all([
                            setTutorialInterfaceUrl(tutorialInterfaceInput.trim()),
                            setTutorialFlexUrl(tutorialFlexInput.trim()),
                            setTutorialFrotaUrl(tutorialFrotaInput.trim()),
                          ]);

                          const errors = results.filter(r => !r.success);
                          if (errors.length > 0) {
                            setAlertMessage('Erro ao salvar tutoriais: ' + errors.map(e => e.error).join(', '));
                          } else {
                            setTutorialInterfaceUrlState(tutorialInterfaceInput.trim());
                            setTutorialFlexUrlState(tutorialFlexInput.trim());
                            setTutorialFrotaUrlState(tutorialFrotaInput.trim());
                            setTutorialsSaved(true);
                            setAlertMessage('Tutoriais salvos com sucesso!');
                            setTimeout(() => setTutorialsSaved(false), 2000);
                          }
                        } catch {
                          setAlertMessage('Erro ao salvar tutoriais');
                        } finally {
                          setTutorialsSaving(false);
                        }
                      }}
                      disabled={tutorialsSaving}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                    >
                      <Save className="h-5 w-5" />
                      {tutorialsSaving ? 'Salvando...' : tutorialsSaved ? 'Salvo!' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-2 flex items-center gap-2">
                <Download className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  URL do APK Circuit
                </span>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                URL de download do aplicativo Circuit (APK). Esta URL será utilizada pelo botão Download Circuit no menu.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={apkCircuitInput}
                  onChange={(e) => setApkCircuitInput(e.target.value)}
                  placeholder="https://exemplo.com/Circuit.apk"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  onClick={async () => {
                    setApkSaving(true);
                    await setApkCircuitUrl(apkCircuitInput.trim());
                    setApkCircuitUrlState(apkCircuitInput.trim());
                    setApkSaving(false);
                    setApkSaved(true);
                    setTimeout(() => setApkSaved(false), 2000);
                  }}
                  disabled={apkSaving}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {apkSaving ? 'Salvando...' : apkSaved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'maintenance' && (
          <MaintenancePage onAlert={setAlertMessage} />
        )}

        {activeTab === 'announcements' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Comunicados Globais
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Crie e gerencie comunicados para todos os usuários do sistema.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadAnnouncements}
                  disabled={loadingAnnouncements}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Plus className="h-4 w-4" />
                  Atualizar
                </button>
                <button
                  onClick={() => {
                    setEditingAnnouncement(null);
                    setAnnouncementForm({
                      title: '',
                      message: '',
                      displayLocation: 'after_login',
                      showOncePerUser: true,
                      requireConfirmation: true,
                      startDate: '',
                      endDate: '',
                    });
                    setShowAnnouncementEditor(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Megaphone className="h-4 w-4" />
                  Novo Comunicado
                </button>
              </div>
            </div>

            {loadingAnnouncements ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
                <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Nenhum comunicado criado
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`rounded-2xl border bg-white p-4 dark:bg-slate-800 ${
                      announcement.isActive
                        ? 'border-slate-200 dark:border-slate-700'
                        : 'border-slate-200 opacity-60 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {announcement.title}
                          </h3>
                          {announcement.isActive ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                              Ativo
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {announcement.message}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          {announcement.showOncePerUser && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              Uma vez por usuário
                            </span>
                          )}
                          {announcement.requireConfirmation && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              Confirmação obrigatória
                            </span>
                          )}
                          {announcement.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Início: {new Date(announcement.startDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {announcement.endDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Fim: {new Date(announcement.endDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => {
                            await updateAnnouncement(announcement.id, {
                              isActive: !announcement.isActive,
                            });
                            await loadAnnouncements();
                          }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                          title={announcement.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {announcement.isActive ? (
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingAnnouncement(announcement);
                            setAnnouncementForm({
                              title: announcement.title,
                              message: announcement.message,
                              displayLocation: announcement.displayLocation,
                              showOncePerUser: announcement.showOncePerUser,
                              requireConfirmation: announcement.requireConfirmation,
                              startDate: announcement.startDate
                                ? new Date(announcement.startDate).toISOString().slice(0, 16)
                                : '',
                              endDate: announcement.endDate
                                ? new Date(announcement.endDate).toISOString().slice(0, 16)
                                : '',
                            });
                            setShowAnnouncementEditor(true);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setAnnouncementToDelete(announcement)}
                          className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAnnouncementEditor && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                <div className="animate-slide-up w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                    {editingAnnouncement ? 'Editar Comunicado' : 'Novo Comunicado'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Título
                      </label>
                      <input
                        type="text"
                        value={announcementForm.title}
                        onChange={(e) =>
                          setAnnouncementForm({ ...announcementForm, title: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        placeholder="Título do comunicado"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Mensagem
                      </label>
                      <textarea
                        value={announcementForm.message}
                        onChange={(e) =>
                          setAnnouncementForm({ ...announcementForm, message: e.target.value })
                        }
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        placeholder="Conteúdo do comunicado..."
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Exibir em
                      </label>
                      <select
                        value={announcementForm.displayLocation}
                        onChange={(e) =>
                          setAnnouncementForm({
                            ...announcementForm,
                            displayLocation: e.target.value as DisplayLocation,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="after_login">Ao abrir o sistema</option>
                        <option value="login">Tela inicial</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          Exibir apenas uma vez por usuário
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={announcementForm.showOncePerUser}
                          onClick={() =>
                            setAnnouncementForm({
                              ...announcementForm,
                              showOncePerUser: !announcementForm.showOncePerUser,
                            })
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            announcementForm.showOncePerUser
                              ? 'bg-blue-600'
                              : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              announcementForm.showOncePerUser ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          Obrigar confirmação de leitura
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={announcementForm.requireConfirmation}
                          onClick={() =>
                            setAnnouncementForm({
                              ...announcementForm,
                              requireConfirmation: !announcementForm.requireConfirmation,
                            })
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            announcementForm.requireConfirmation
                              ? 'bg-blue-600'
                              : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              announcementForm.requireConfirmation ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Data de início (opcional)
                        </label>
                        <input
                          type="datetime-local"
                          value={announcementForm.startDate}
                          onChange={(e) =>
                            setAnnouncementForm({ ...announcementForm, startDate: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Data de término (opcional)
                        </label>
                        <input
                          type="datetime-local"
                          value={announcementForm.endDate}
                          onChange={(e) =>
                            setAnnouncementForm({ ...announcementForm, endDate: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setShowAnnouncementEditor(false);
                        setEditingAnnouncement(null);
                      }}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
                          setAlertMessage('Preencha título e mensagem');
                          return;
                        }

                        const announcementData = {
                          title: announcementForm.title.trim(),
                          message: announcementForm.message.trim(),
                          displayLocation: announcementForm.displayLocation,
                          showOncePerUser: announcementForm.showOncePerUser,
                          requireConfirmation: announcementForm.requireConfirmation,
                          isActive: editingAnnouncement?.isActive ?? true,
                          startDate: announcementForm.startDate
                            ? new Date(announcementForm.startDate).toISOString()
                            : null,
                          endDate: announcementForm.endDate
                            ? new Date(announcementForm.endDate).toISOString()
                            : null,
                        };

                        if (editingAnnouncement) {
                          await updateAnnouncement(editingAnnouncement.id, announcementData);
                        } else {
                          await createAnnouncement(announcementData);
                        }

                        setShowAnnouncementEditor(false);
                        setEditingAnnouncement(null);
                        await loadAnnouncements();
                        setAlertMessage(
                          editingAnnouncement
                            ? 'Comunicado atualizado com sucesso!'
                            : 'Comunicado criado com sucesso!'
                        );
                      }}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      {editingAnnouncement ? 'Salvar' : 'Criar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {alertMessage && (
        <AlertModal message={alertMessage} onClose={() => setAlertMessage('')} />
      )}

      {announcementToDelete && (
        <ConfirmModal
          title="Excluir comunicado?"
          message={`Excluir permanentemente o comunicado "${announcementToDelete.title}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          confirmVariant="danger"
          onConfirm={async () => {
            await deleteAnnouncement(announcementToDelete.id);
            await loadAnnouncements();
            setAnnouncementToDelete(null);
          }}
          onCancel={() => setAnnouncementToDelete(null)}
        />
      )}
    </div>
  );
}
