import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Workspace, ConfigData } from './types';
import CreateWorkspace from './CreateWorkspace';
import EditWorkspace from './EditWorkspace';

interface DeleteTarget {
  id: string;
  name: string;
}

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'edit'>('home');
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await invoke<string>('get_workspaces');
      const parsed: ConfigData = JSON.parse(res);

      const normalized = (parsed.workspaces || []).map((ws) => ({
        ...ws,
        id: ws.id ?? crypto.randomUUID(),
      }));

      setWorkspaces(normalized);
    } catch (err) {
      console.error('Ошибка при загрузке конфига:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (ws: Workspace) => {
    try {
      const allUrls = ws.webs.flatMap((group) => group.urls);

      await invoke('launch_workspace', {
        apps: ws.apps,
        urls: allUrls,
      });

      console.log(`Workspace "${ws.name}" launched successfully`);
    } catch (err) {
      console.error('Error during workspace launching: ', err);
      alert(`Cannot be launched: ${err}`);
    }
  };

  const handleOpenEdit = (ws: Workspace) => {
    const wsWithId: Workspace = { ...ws, id: ws.id ?? crypto.randomUUID() };
    setEditingWorkspace(wsWithId);
    setCurrentView('edit');
  };

  const handleReturnHome = () => {
    setEditingWorkspace(null);
    setCurrentView('home');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await invoke('delete_workspace', { id: deleteTarget.id });
      setDeleteTarget(null);
      await fetchWorkspaces();
    } catch (err) {
      console.error('Error during workspace deletion:', err);
      alert(`Не удалось удалить пространство: ${err}`);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans selection:bg-indigo-500/30">
      {currentView === 'home' && (
        <>
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Workspaces</h1>
            <p className="text-xs text-slate-500 mt-0.5">Выберите рабочее пространство для запуска</p>
          </header>

          {loading ? (
            <div className="text-xs text-slate-500 animate-pulse">Загрузка...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Карточка добавления нового пространства */}
              <button
                onClick={() => setCurrentView('create')}
                className="group bg-slate-900/30 hover:bg-slate-900/70 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px] cursor-pointer"
              >
                <span className="text-xl text-slate-500 group-hover:text-indigo-400 transition-colors font-light">+</span>
                <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors font-medium">
                  Новое пространство
                </span>
              </button>

              {/* Карточки пространств */}
              {workspaces.map((ws, index) => {
                const totalUrls = ws.webs.reduce((acc, w) => acc + w.urls.length, 0);
                const wsId = ws.id ?? String(index);

                return (
                  <div
                    key={wsId}
                    className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded-xl p-5 transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">
                          {ws.name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          {ws.apps.length} прил. / {totalUrls} вкл.
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(ws)}
                          title="Редактировать"
                          aria-label={`Редактировать ${ws.name}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3.5 h-3.5"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: wsId, name: ws.name })}
                          title="Удалить"
                          aria-label={`Удалить ${ws.name}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3.5 h-3.5"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunch(ws)}
                      className="w-full py-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      Запустить
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {currentView === 'create' && (
        <CreateWorkspace
          onBack={handleReturnHome}
          onCreated={() => {
            fetchWorkspaces();
            handleReturnHome();
          }}
        />
      )}

      {currentView === 'edit' && editingWorkspace && (
        <EditWorkspace
          workspace={editingWorkspace}
          onBack={handleReturnHome}
          onUpdated={() => {
            fetchWorkspaces();
            handleReturnHome();
          }}
        />
      )}

      {/* Модальное окно подтверждения удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-medium text-slate-100">Удалить пространство?</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Пространство <span className="text-slate-200 font-medium">«{deleteTarget.name}»</span> будет удалено из конфигурации. Это действие нельзя отменить.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;