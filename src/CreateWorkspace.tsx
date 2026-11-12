import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Workspace } from './types';



interface CreateWorkspaceProps {
  onBack: () => void;
  onCreated: () => void;
}



export default function CreateWorkspace({ onBack, onCreated }: CreateWorkspaceProps) {
  const [newName, setNewName] = useState('');
  const [newBrowser, setNewBrowser] = useState('default');
  const [newApps, setNewApps] = useState('');
  const [newUrls, setNewUrls] = useState('');

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const appsList = newApps.split('\n').map(s => s.trim()).filter(Boolean);
    const urlsList = newUrls.split('\n').map(s => s.trim()).filter(Boolean);

    const newWorkspace: Workspace = {
      name: newName.trim(),
      apps: appsList,
      webs: urlsList.length > 0 ? [{ browser: newBrowser.trim() || "default", urls: urlsList }] : []
    };

    try {
      await invoke('create_workspace', { newWorkspace });
      onCreated();
    } catch (err) {
      alert(`Не удалось создать пространство: ${err}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">Создание пространства</h1>
          <p className="text-xs text-slate-500 mt-0.5">Заполните данные для нового рабочего окружения</p>
        </div>
        <button 
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          ← Назад
        </button>
      </header>

      <form onSubmit={handleSaveWorkspace} className="bg-slate-900/50 border border-slate-900 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Название пространства</label>
          <input 
            type="text" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Например: Рабочий день" 
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Браузер для ссылок</label>
          <input 
            type="text" 
            value={newBrowser} 
            onChange={(e) => setNewBrowser(e.target.value)}
            placeholder="default / chrome / msedge" 
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Пути к .exe приложениям (каждый с новой строки)</label>
          <textarea 
            value={newApps} 
            onChange={(e) => setNewApps(e.target.value)}
            placeholder="C:\Program Files\App\app.exe"
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">URL-адреса сайтов (каждый с новой строки)</label>
          <textarea 
            value={newUrls} 
            onChange={(e) => setNewUrls(e.target.value)}
            placeholder="https://github.com"
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button 
            type="button" 
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button 
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Создать пространство
          </button>
        </div>
      </form>
    </div>
  );
}
