import React, { useState, useEffect, useRef } from 'react';
import {
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
  Cpu,
  Layers,
  Zap,
  Terminal,
  FileCode,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { ModFramework } from '../../types';
import { StorePlugin, PluginSource } from '../../../electron/services/PluginStoreService';
import { PluginDossierModal } from './PluginDossierModal';

interface PluginStoreTabProps {
  serverPath: string;
  framework: ModFramework;
  initialSource?: PluginSource | 'all';
  onPluginStateChanged: () => void;
}

export const PluginStoreTab: React.FC<PluginStoreTabProps> = ({
  serverPath,
  framework,
  initialSource = 'all',
  onPluginStateChanged
}) => {
  const [plugins, setPlugins] = useState<StorePlugin[]>([]);
  const [selectedSource, setSelectedSource] = useState<PluginSource | 'all'>(initialSource);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<'auto' | 'oxide' | 'carbon' | 'all'>('auto');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(12);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  const [loadingPluginId, setLoadingPluginId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [installedMap, setInstalledMap] = useState<Set<string>>(new Set());

  // Modal for deep plugin dossier
  const [dossierPlugin, setDossierPlugin] = useState<StorePlugin | null>(null);

  const isCarbonServer = framework.startsWith('carbon');
  const isOxideServer = framework === 'oxide';
  const debounceTimeout = useRef<any>(null);

  useEffect(() => {
    if (initialSource) {
      setSelectedSource(initialSource);
      setCurrentPage(1);
    }
  }, [initialSource]);

  // Загрузка списка установленных плагинов
  const loadInstalledPlugins = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    try {
      const installed: { name: string; isInstalled: boolean }[] = await api.getInstalledStorePlugins(
        serverPath,
        framework
      );

      const installedSet = new Set(
        (installed || []).filter((i) => i.isInstalled).map((i) => i.name.toLowerCase())
      );
      setInstalledMap(installedSet);
    } catch {}
  };

  // Запрос каталога с сервера (с поддержкой живого API uMod и пагинации)
  const fetchCatalogData = async (pageToLoad = currentPage) => {
    const api = (window as any).electronAPI;
    if (!api) return;

    setIsLoadingData(true);
    try {
      let result;
      if (api.searchPluginCatalog) {
        result = await api.searchPluginCatalog({
          source: selectedSource,
          query: searchQuery,
          category: selectedCategory,
          frameworkCompat: frameworkFilter,
          page: pageToLoad,
          perPage,
          sort: 'downloads'
        });
      } else {
        // Fallback
        const all: StorePlugin[] = await api.getPluginCatalog();
        result = {
          plugins: all,
          total: all.length,
          page: 1,
          lastPage: 1,
          perPage: 12
        };
      }

      if (result) {
        setPlugins(result.plugins || []);
        setTotalCount(result.total || 0);
        setCurrentPage(result.page || 1);
        setTotalPages(Math.max(1, result.lastPage || 1));
      }
    } catch (err: any) {
      console.error('Failed to load plugins:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadInstalledPlugins();
  }, [serverPath, framework]);

  // Триггер поиска при смене фильтров
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchCatalogData(currentPage);
    }, 250);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [selectedSource, selectedCategory, frameworkFilter, searchQuery, currentPage, perPage]);

  const handleInstall = async (pluginId: string) => {
    setLoadingPluginId(pluginId);
    try {
      const res = await (window as any).electronAPI?.installStorePlugin(serverPath, framework, pluginId);
      if (res?.success) {
        setActionNotice({ type: 'success', text: res.message });
        await loadInstalledPlugins();
        onPluginStateChanged();
      } else {
        setActionNotice({ type: 'error', text: res?.message || 'Ошибка установки плагина' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message });
    }
    setLoadingPluginId(null);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleUninstall = async (pluginId: string) => {
    setLoadingPluginId(pluginId);
    try {
      const res = await (window as any).electronAPI?.uninstallStorePlugin(serverPath, framework, pluginId);
      if (res?.success) {
        setActionNotice({ type: 'success', text: res.message });
        await loadInstalledPlugins();
        onPluginStateChanged();
      } else {
        setActionNotice({ type: 'error', text: res?.message || 'Ошибка удаления плагина' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message });
    }
    setLoadingPluginId(null);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const sourcesList: { id: PluginSource | 'all'; label: string; color: string; border: string; bg: string; icon: string }[] = [
    {
      id: 'all',
      label: 'Все источники',
      color: 'text-[#00f0ff]',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      icon: '🌐'
    },
    {
      id: 'umod',
      label: 'uMod (1700+ плагинов)',
      color: 'text-[#00f0ff]',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      icon: '📦'
    },
    {
      id: 'codefling',
      label: 'CodeFling (Community)',
      color: 'text-purple-400',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10',
      icon: '⚡'
    },
    {
      id: 'skyplugins',
      label: 'SkyPlugins (CIS/VIP)',
      color: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      icon: '💎'
    }
  ];

  const categories = [
    { id: 'all', label: 'Все категории', icon: Boxes },
    { id: 'admin', label: 'Администрирование', icon: Shield },
    { id: 'economy', label: 'Экономика & Киты', icon: Coins },
    { id: 'clans', label: 'Кланы & Команды', icon: Users },
    { id: 'rates', label: 'Рейты & Добыча', icon: TrendingUp },
    { id: 'protection', label: 'Защита & Безопасность', icon: Zap },
    { id: 'utility', label: 'Утилиты & QoL', icon: Hammer },
    { id: 'custom_ui', label: 'Кастомный UI & Монументы', icon: Cpu }
  ];

  return (
    <div className="h-full flex flex-col space-y-3.5 p-4 select-none bg-[#050811]">
      {/* SOURCE SWITCHER BUTTONS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a1122] p-3 rounded-2xl border border-cyan-500/20">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {sourcesList.map((src) => {
            const isSel = selectedSource === src.id;
            return (
              <button
                key={src.id}
                onClick={() => {
                  setSelectedSource(src.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSel
                    ? `${src.bg} ${src.color} border ${src.border} shadow-md`
                    : 'bg-cyan-500/5 text-slate-400 hover:text-white hover:bg-cyan-500/10'
                }`}
              >
                <span>{src.icon}</span>
                <span>{src.label}</span>
              </button>
            );
          })}
        </div>

        {/* FRAMEWORK SMART FILTER TOGGLE */}
        <div className="flex items-center gap-1.5 bg-[#050811] p-1 rounded-xl border border-cyan-500/20 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-[#00f0ff]" />
            Фреймворк:
          </span>

          <button
            onClick={() => { setFrameworkFilter('auto'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              frameworkFilter === 'auto'
                ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Автоматический показ плагинов, совместимых с текущим сервером"
          >
            🎯 Авто ({isCarbonServer ? 'Carbon' : isOxideServer ? 'Oxide' : 'Любой'})
          </button>

          <button
            onClick={() => { setFrameworkFilter('oxide'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              frameworkFilter === 'oxide'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🟢 Только Oxide
          </button>

          <button
            onClick={() => { setFrameworkFilter('carbon'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              frameworkFilter === 'carbon'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🟣 Только Carbon
          </button>

          <button
            onClick={() => { setFrameworkFilter('all'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              frameworkFilter === 'all'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Все
          </button>
        </div>
      </div>

      {/* SEARCH AND CATEGORIES ROW */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0a1122] p-3 rounded-2xl border border-cyan-500/20">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Поиск по 1700+ плагинам, командам /kit..."
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
                onClick={() => {
                  setSelectedCategory(c.id);
                  setCurrentPage(1);
                }}
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

      {/* Action Notice (Success or Error) */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* PLUGINS GRID WITH LOADING OVERLAY */}
      <div className="flex-1 overflow-y-auto relative pr-1">
        {isLoadingData && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-10 rounded-2xl">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#0a1122] border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin text-[#00f0ff]" />
              <span>Загрузка каталога с серверов...</span>
            </div>
          </div>
        )}

        {plugins.length === 0 && !isLoadingData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-[#0a1122] border border-cyan-500/15 space-y-2">
            <Boxes className="w-10 h-10 text-slate-500" />
            <span className="text-sm font-bold text-slate-300">Плагины не найдены</span>
            <p className="text-xs text-slate-400 max-w-sm">
              Попробуйте изменить поисковый запрос, сбросить фильтр категорий или переключить фреймворк.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map((plugin) => {
              const isInstalled = installedMap.has(plugin.id.toLowerCase());
              const isLoading = loadingPluginId === plugin.id;

              const isCompatible =
                plugin.frameworkCompat === 'both' ||
                (isCarbonServer && plugin.frameworkCompat === 'carbon') ||
                (isOxideServer && plugin.frameworkCompat === 'oxide');

              const sourceTag =
                plugin.source === 'umod'
                  ? { label: 'uMod', color: 'bg-cyan-500/15 text-[#00f0ff] border-cyan-500/30' }
                  : plugin.source === 'codefling'
                  ? { label: 'CodeFling', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
                  : { label: 'SkyPlugins', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };

              return (
                <div
                  key={plugin.id}
                  className={`p-4 rounded-2xl glass-panel border flex flex-col justify-between transition-all hover:border-cyan-400/40 ${
                    isInstalled
                      ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                      : !isCompatible
                      ? 'border-zinc-800 bg-[#070b14]/70 opacity-90'
                      : 'border-cyan-500/20 bg-[#0a1122]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Source + Framework + Downloads */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sourceTag.color}`}>
                          {sourceTag.label}
                        </span>

                        {plugin.frameworkCompat === 'both' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ⚡ Универсальный
                          </span>
                        )}
                        {plugin.frameworkCompat === 'carbon' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            🟣 Carbon
                          </span>
                        )}
                        {plugin.frameworkCompat === 'oxide' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            🟢 Oxide
                          </span>
                        )}
                      </div>

                      {isInstalled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          УСТАНОВЛЕН
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold shrink-0">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {plugin.rating ? plugin.rating.toFixed(1) : '5.0'}
                        </span>
                      )}
                    </div>

                    {/* Visual Title Block with Real Plugin Icon */}
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        {plugin.iconUrl ? (
                          <img
                            src={plugin.iconUrl}
                            alt={plugin.name}
                            loading="lazy"
                            className="w-12 h-12 rounded-xl object-cover bg-black/40 border border-cyan-500/30 p-0.5 shadow-md shrink-0"
                            onError={(e) => {
                              (e.currentTarget as any).style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.card-icon-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`card-icon-fallback w-12 h-12 rounded-xl border border-cyan-500/20 bg-cyan-500/10 items-center justify-center shrink-0 ${plugin.iconUrl ? 'hidden' : 'flex'}`}
                        >
                          <Zap className="w-5 h-5 text-[#00f0ff]" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-white font-['Outfit'] truncate" title={plugin.name}>
                            {plugin.name}
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-[#00f0ff] shrink-0">
                            v{plugin.version}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#94a3b8] mt-0.5 flex items-center gap-1.5 truncate">
                          {plugin.authorIconUrl ? (
                            <img src={plugin.authorIconUrl} alt={plugin.author} className="w-3.5 h-3.5 rounded-full border border-cyan-500/30 shrink-0" />
                          ) : null}
                          <span className="truncate">{plugin.author}</span>
                          <span>•</span>
                          <span className="text-cyan-300/80 shrink-0">{plugin.downloadsCount.toLocaleString()} скач.</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{plugin.description}</p>

                    {/* Metadata Badges: Commands, Perms, Hooks */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-[#050811] text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                        <Terminal className="w-2.5 h-2.5" />
                        {plugin.commands?.length || 1} ком.
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#050811] text-purple-300 border border-purple-500/20 flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        {plugin.permissions?.length || 1} прав
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#050811] text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        {plugin.deepData?.hookSubscriptions?.length || 3} хуков
                      </span>
                    </div>

                    {/* Incompatibility Warning */}
                    {!isCompatible && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Требуется {plugin.frameworkCompat.toUpperCase()}! Не для текущего сервера.</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 mt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setDossierPlugin(plugin)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
                      title="Открыть полный технический паспорт плагина (хуки, RPC, команды, права, конфиг)"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Досье</span>
                    </button>

                    {isInstalled ? (
                      <button
                        onClick={() => handleUninstall(plugin.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isLoading ? '...' : 'Удалить'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(plugin.id)}
                        disabled={isLoading || !isCompatible}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                          !isCompatible
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-cyan-950/40 border border-cyan-300/30'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'Установка...' : 'Установить'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAGINATION CONTROLS BAR */}
      <div className="p-3 bg-[#0a1122] rounded-2xl border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
        <div className="text-slate-400">
          Показано{' '}
          <strong className="text-white">{plugins.length > 0 ? (currentPage - 1) * perPage + 1 : 0}</strong> -{' '}
          <strong className="text-white">{Math.min(currentPage * perPage, totalCount)}</strong> из{' '}
          <strong className="text-cyan-400">{totalCount.toLocaleString()}</strong> плагинов
          {selectedSource === 'umod' && (
            <span className="text-[10px] text-emerald-400 ml-2 font-mono">⚡ Live uMod.org API (1700+)</span>
          )}
        </div>

        {/* Page Switcher Buttons */}
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage <= 1 || isLoadingData}
            onClick={() => setCurrentPage(1)}
            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 disabled:opacity-30 disabled:hover:bg-cyan-500/10 cursor-pointer"
            title="Первая страница"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            disabled={currentPage <= 1 || isLoadingData}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 disabled:opacity-30 disabled:hover:bg-cyan-500/10 cursor-pointer font-semibold text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Назад</span>
          </button>

          <div className="px-3 py-1 rounded-lg bg-[#050811] border border-cyan-500/30 text-xs font-mono font-bold text-white">
            Стр. <span className="text-[#00f0ff]">{currentPage}</span> / {totalPages}
          </div>

          <button
            disabled={currentPage >= totalPages || isLoadingData}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 disabled:opacity-30 disabled:hover:bg-cyan-500/10 cursor-pointer font-semibold text-xs"
          >
            <span>Вперед</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            disabled={currentPage >= totalPages || isLoadingData}
            onClick={() => setCurrentPage(totalPages)}
            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 disabled:opacity-30 disabled:hover:bg-cyan-500/10 cursor-pointer"
            title="Последняя страница"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Per page selector */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Показывать:</span>
          {[12, 24, 48].map((num) => (
            <button
              key={num}
              onClick={() => {
                setPerPage(num);
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                perPage === num
                  ? 'bg-cyan-500/25 text-[#00f0ff] font-bold border border-cyan-500/40'
                  : 'hover:text-white bg-black/20'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* DEEP PLUGIN DOSSIER MODAL */}
      <PluginDossierModal
        isOpen={Boolean(dossierPlugin)}
        onClose={() => setDossierPlugin(null)}
        plugin={dossierPlugin}
        isInstalled={dossierPlugin ? installedMap.has(dossierPlugin.id.toLowerCase()) : false}
        isLoading={dossierPlugin ? loadingPluginId === dossierPlugin.id : false}
        currentFramework={framework}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
      />
    </div>
  );
};
