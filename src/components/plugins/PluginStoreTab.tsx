import React, { useState, useEffect } from 'react';
import {
  Store,
  Download,
  Trash2,
  Search,
  CheckCircle2,
  Star,
  Sparkles,
  Shield,
  Coins,
  Users,
  Hammer,
  TrendingUp,
  Boxes,
  FlaskConical
} from 'lucide-react';
import { ModFramework } from '../../types';

interface PluginStoreTabProps {
  serverPath: string;
  framework: ModFramework;
  onPluginStateChanged: () => void;
}

interface StorePlugin {
  id: string;
  name: string;
  category: 'admin' | 'economy' | 'clans' | 'rates' | 'protection' | 'utility';
  author: string;
  version: string;
  description: string;
  tags: string[];
  downloadsCount: number;
  isInstalled?: boolean;
}

export const PluginStoreTab: React.FC<PluginStoreTabProps> = ({
  serverPath,
  framework,
  onPluginStateChanged
}) => {
  const [plugins, setPlugins] = useState<StorePlugin[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingPluginId, setLoadingPluginId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadStoreData = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    try {
      const catalog: StorePlugin[] = await api.getPluginCatalog();
      const installed: { name: string; isInstalled: boolean }[] = await api.getInstalledStorePlugins(
        serverPath,
        framework
      );

      const installedMap = new Set(
        (installed || []).filter((i) => i.isInstalled).map((i) => i.name.toLowerCase())
      );

      setPlugins(
        (catalog || []).map((p) => ({
          ...p,
          isInstalled: installedMap.has(p.id.toLowerCase())
        }))
      );
    } catch {}
  };

  useEffect(() => {
    loadStoreData();
  }, [serverPath, framework]);

  const handleInstall = async (pluginId: string) => {
    setLoadingPluginId(pluginId);
    try {
      const res = await (window as any).electronAPI?.installStorePlugin(serverPath, framework, pluginId);
      if (res?.success) {
        setActionNotice(res.message);
        await loadStoreData();
        onPluginStateChanged();
      }
    } catch {}
    setLoadingPluginId(null);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleUninstall = async (pluginId: string) => {
    setLoadingPluginId(pluginId);
    try {
      const res = await (window as any).electronAPI?.uninstallStorePlugin(serverPath, framework, pluginId);
      if (res?.success) {
        setActionNotice(res.message);
        await loadStoreData();
        onPluginStateChanged();
      }
    } catch {}
    setLoadingPluginId(null);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const categories = [
    { id: 'all', label: 'Все плагины', icon: Boxes },
    { id: 'admin', label: 'Администрирование', icon: Shield },
    { id: 'economy', label: 'Экономика & Киты', icon: Coins },
    { id: 'clans', label: 'Кланы & Команды', icon: Users },
    { id: 'rates', label: 'Рейты & Добыча', icon: TrendingUp },
    { id: 'utility', label: 'Утилиты & QoL', icon: Hammer }
  ];

  const filteredPlugins = plugins.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="h-full flex flex-col space-y-4 p-4 select-none bg-[#050811]">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0a1122] p-3 rounded-2xl border border-cyan-500/20">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск плагина по названию или тегу..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {categories.map((c) => {
            const Icon = c.icon;
            const isSel = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSel
                    ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 shadow-md'
                    : 'bg-cyan-500/5 text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {actionNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Plugins Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
        {filteredPlugins.map((plugin) => {
          const isLoading = loadingPluginId === plugin.id;
          return (
            <div
              key={plugin.id}
              className={`p-4 rounded-2xl glass-panel border flex flex-col justify-between transition-all ${
                plugin.isInstalled
                  ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                  : 'border-cyan-500/20 bg-[#0a1122] hover:border-cyan-400/40'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-['Outfit']">{plugin.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-[#00f0ff]">
                        v{plugin.version}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">Автор: {plugin.author}</div>
                  </div>

                  {plugin.isInstalled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      УСТАНОВЛЕН
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-[#00f0ff] border border-cyan-500/20 shrink-0">
                      <Star className="w-3 h-3 text-amber-400" />
                      {plugin.downloadsCount.toLocaleString()} скачиваний
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{plugin.description}</p>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {plugin.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-cyan-500/5 text-[#38bdf8] border border-cyan-500/15"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-2 border-t border-cyan-500/15 flex items-center justify-end">
                {plugin.isInstalled ? (
                  <button
                    onClick={() => handleUninstall(plugin.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isLoading ? 'Удаление...' : 'Удалить плагин'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(plugin.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 border border-cyan-300/30 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isLoading ? 'Установка...' : 'Установить в 1 клик'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
