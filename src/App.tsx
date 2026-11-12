import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Workspace, ConfigData } from './types';
import CreateWorkspace from './CreateWorkspace';



function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'home' | 'create'>('home');

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await invoke<string>('get_workspaces');
      const parsed: ConfigData = JSON.parse(res);
      setWorkspaces(parsed.workspaces || []);
    } catch (err) {
      console.error("Ошибка при загрузке конфига:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async(ws: Workspace) => {
    try {
      const allUrls= ws.webs.flatMap(group  => group.urls);

      await invoke('launch_workspace', {
        apps: ws.apps,
        urls: allUrls,
      });

      console.log(`Workspace "${ws.name}" launched successfully`);
    } catch(err) {
      console.error("Error during workspace launching: ", err);
      alert(`Cannot be launched: ${err}`);
    }
  }

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans selection:bg-indigo-500/30">
      
      {currentView === 'home' ? (
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
                <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors font-medium">Новое пространство</span>
              </button>

              {/* Карточки пространств */}
              {workspaces.map((ws, index) => {
                const totalUrls = ws.webs.reduce((acc, w) => acc + w.urls.length, 0);

                return (
                  <div 
                    key={index} 
                    className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded-xl p-5 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      <h2 className="text-base font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">
                        {ws.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {ws.apps.length} прил. / {totalUrls} вкл.
                      </p>
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
      ) : (
        <CreateWorkspace 
          onBack={() => setCurrentView('home')} 
          onCreated={() => {
            fetchWorkspaces();
            setCurrentView('home');
          }} 
        />
      )}

    </div>
  );
}

export default App;
