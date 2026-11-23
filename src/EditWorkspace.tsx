import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Workspace } from './types';

interface EditWorkspaceProps {
  workspace: Workspace;
  onBack: () => void;
  onUpdated: () => void;
}

export default function EditWorkspace({
  workspace,
  onBack,
  onUpdated,
}: EditWorkspaceProps) {
  const [name, setName] = useState(workspace.name);
  const [browser, setBrowser] = useState(workspace.webs[0]?.browser || 'default');
  const [apps, setApps] = useState(workspace.apps.join('\n'));
  const [urls, setUrls] = useState(workspace.webs[0]?.urls.join('\n') || '');

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const workspaceId = workspace.id ?? crypto.randomUUID();
    const appsList = apps.split('\n').map((s) => s.trim()).filter(Boolean);
    const urlsList = urls.split('\n').map((s) => s.trim()).filter(Boolean);

    const updatedWorkspace: Workspace = {
      id: workspaceId,
      name: name.trim(),
      apps: appsList,
      webs: urlsList.length > 0 ? [{ browser: browser.trim() || 'default', urls: urlsList }] : [],
    };

    try {
      await invoke('update_workspace', { id: workspaceId, updatedWorkspace });
      onUpdated();
    } catch (err) {
      alert(`Не удалось обновить пространство: ${err}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Редактирование пространства
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Изменение параметров «{workspace.name}»</p>
        </div>
        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          ← Назад
        </button>
      </header>

      <form
        onSubmit={handleUpdateWorkspace}
        className="bg-slate-900/50 border border-slate-900 rounded-xl p-6 space-y-4"
      >
        <div>
          <label className="block text-xs text-slate-400 mb-1">Название пространства</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Браузер для ссылок</label>
          <input
            type="text"
            value={browser}
            onChange={(e) => setBrowser(e.target.value)}
            placeholder="default / chrome / msedge"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Пути к .exe приложениям (каждый с новой строки)
          </label>
          <textarea
            value={apps}
            onChange={(e) => setApps(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            URL-адреса сайтов (каждый с новой строки)
          </label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
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
            Сохранить изменения
          </button>
        </div>
      </form>
    </div>
  );
}