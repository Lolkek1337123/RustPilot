import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Star,
  Terminal,
  Shield,
  FileCode,
  Cpu,
  Boxes,
  Copy,
  Check,
  Zap,
  Activity,
  FolderGit2,
  Globe,
  Radio,
  Clock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { StorePlugin } from '../../../electron/services/PluginStoreService';

interface PluginDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  plugin: StorePlugin | null;
  isInstalled: boolean;
  isLoading: boolean;
  currentFramework: string;
  onInstall: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
}

export const PluginDossierModal: React.FC<PluginDossierModalProps> = ({
  isOpen,
  onClose,
  plugin,
  isInstalled,
  isLoading,
  currentFramework,
  onInstall,
  onUninstall
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'commands' | 'permissions' | 'config' | 'deep' | 'code'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !plugin) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isCarbonServer = currentFramework.startsWith('carbon');
  const isOxideServer = currentFramework === 'oxide';

  // Совместимость с текущим сервером
  const isCompatible =
    plugin.frameworkCompat === 'both' ||
    (isCarbonServer && plugin.frameworkCompat === 'carbon') ||
    (isOxideServer && plugin.frameworkCompat === 'oxide');

  const sourceColors = {
    umod: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      text: 'text-[#00f0ff]',
      label: 'uMod (Официальный)'
    },
    codefling: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      label: 'CodeFling (Community)'
    },
    skyplugins: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      label: 'SkyPlugins (CIS/VIP)'
    }
  };

  const sourceMeta = sourceColors[plugin.source] || sourceColors.umod;

  const tabs = [
    { id: 'overview', label: '📋 Обзор & Фичи', icon: Info },
    { id: 'commands', label: `🎮 Команды (${plugin.commands.length})`, icon: Terminal },
    { id: 'permissions', label: `🛡️ Права (${plugin.permissions.length})`, icon: Shield },
    { id: 'config', label: '📝 Конфиг (.json)', icon: FileCode },
    { id: 'deep', label: '🔬 Потаённые данные (Deep Specs)', icon: Cpu },
    { id: 'code', label: '💻 Исходный C# код', icon: Boxes }
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-5xl h-[90vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#070d19] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-cyan-500/20 bg-[#0a1224] flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {plugin.iconUrl ? (
                <img
                  src={plugin.iconUrl}
                  alt={plugin.name}
                  className="w-16 h-16 rounded-2xl object-cover bg-black/50 border border-cyan-500/30 p-1 shadow-lg shadow-cyan-950/50"
                  onError={(e) => {
                    (e.currentTarget as any).style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.icon-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`icon-fallback p-3.5 rounded-2xl border ${sourceMeta.border} ${sourceMeta.bg} items-center justify-center ${plugin.iconUrl ? 'hidden' : 'flex'}`}
              >
                <Zap className={`w-8 h-8 ${sourceMeta.text}`} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white font-['Outfit']">{plugin.name}</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-cyan-500/15 text-[#00f0ff] border border-cyan-500/30">
                  v{plugin.version}
                </span>

                {/* Source Badge */}
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${sourceMeta.border} ${sourceMeta.bg} ${sourceMeta.text}`}>
                  {sourceMeta.label}
                </span>

                {/* Framework Badge */}
                {plugin.frameworkCompat === 'both' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Универсальный (Oxide + Carbon)
                  </span>
                )}
                {plugin.frameworkCompat === 'carbon' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    Carbon Native
                  </span>
                )}
                {plugin.frameworkCompat === 'oxide' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Oxide (uMod)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1.5">
                  {plugin.authorIconUrl ? (
                    <img src={plugin.authorIconUrl} alt={plugin.author} className="w-4 h-4 rounded-full border border-cyan-500/30 shrink-0" />
                  ) : null}
                  <span>Автор: <strong className="text-slate-200">{plugin.author}</strong></span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <strong>{plugin.rating.toFixed(1)}</strong>
                </span>
                <span>•</span>
                <span>Скачиваний: <strong className="text-cyan-400">{plugin.downloadsCount.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Обновлен: <strong className="text-slate-300">{plugin.lastUpdated}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* External URL */}
            <a
              href={plugin.deepData.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                e.preventDefault();
                (window as any).electronAPI?.openExternal(plugin.deepData.sourceUrl);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Официальная страница</span>
            </a>

            {/* Install / Uninstall */}
            {isInstalled ? (
              <button
                onClick={() => onUninstall(plugin.id)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Удаление...' : 'Удалить с сервера'}</span>
              </button>
            ) : (
              <button
                onClick={() => onInstall(plugin.id)}
                disabled={isLoading || !isCompatible}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                  !isCompatible
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-cyan-950/40 border border-cyan-300/30'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isLoading
                    ? 'Установка...'
                    : !isCompatible
                    ? 'Несовместимо с сервером'
                    : '⚡ Установить в 1 клик'}
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Compatibility Alert if mismatch */}
        {!isCompatible && (
          <div className="px-5 py-2.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Внимание!</strong> Ваш текущий сервер запущен на{' '}
              <strong className="uppercase">{currentFramework}</strong>, а данный плагин требует{' '}
              <strong className="uppercase">{plugin.frameworkCompat}</strong>. Рекомендуется использовать совместимые плагины.
            </span>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-[#09101f] border-b border-cyan-500/15 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSel
                    ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-cyan-500/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-4xl">
              <div className="p-4 rounded-2xl bg-[#0b1426] border border-cyan-500/20 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#00f0ff]" />
                  Описание функционала
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{plugin.description}</p>
              </div>

              {/* Key Features */}
              <div className="p-4 rounded-2xl bg-[#0b1426] border border-cyan-500/20 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Ключевые возможности & Фичи
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {plugin.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-2.5 text-xs text-slate-200"
                    >
                      <Check className="w-4 h-4 text-[#00f0ff] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Specs Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#0a1224] border border-cyan-500/15">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Лицензия</span>
                  <div className="text-xs font-bold text-white mt-1">{plugin.deepData.license}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a1224] border border-cyan-500/15">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Размер исходника</span>
                  <div className="text-xs font-bold text-cyan-300 mt-1">{plugin.deepData.fileSizeApprox}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a1224] border border-cyan-500/15">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Нагрузка на сервер</span>
                  <div className="text-xs font-bold text-emerald-400 mt-1 capitalize">
                    {plugin.deepData.performanceImpact === 'low'
                      ? '🟢 Низкая (<1% CPU)'
                      : plugin.deepData.performanceImpact === 'medium'
                      ? '🟡 Средняя'
                      : '🔴 Высокая'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a1224] border border-cyan-500/15">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Зависимости</span>
                  <div className="text-xs font-bold text-purple-300 mt-1">
                    {plugin.deepData.dependencies?.length ? plugin.deepData.dependencies.join(', ') : 'Нет (Автономный)'}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-xs text-slate-400 font-semibold">Теги:</span>
                {plugin.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/5 text-[#38bdf8] border border-cyan-500/15"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: COMMANDS */}
          {activeTab === 'commands' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00f0ff]" />
                  Игровые и консольные команды
                </h3>
                <span className="text-xs text-slate-400">Всего команд: {plugin.commands.length}</span>
              </div>

              {plugin.commands.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-[#0b1426] border border-cyan-500/10">
                  У данного плагина нет публичных чат-команд (работает в фоновом режиме событий).
                </div>
              ) : (
                <div className="space-y-3">
                  {plugin.commands.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#0b1426] border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-[#00f0ff] border border-cyan-500/30">
                            {cmd.command}
                          </code>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${cmd.type === 'chat' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {cmd.type === 'chat' ? 'Чат' : 'Консоль / RCON'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{cmd.description}</p>
                        {cmd.syntax && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            Синтаксис: <span className="text-cyan-300">{cmd.syntax}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cmd.permission && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Право: {cmd.permission}
                          </span>
                        )}
                        <button
                          onClick={() => handleCopy(cmd.syntax || cmd.command, `cmd-${idx}`)}
                          className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors cursor-pointer"
                          title="Скопировать команду"
                        >
                          {copiedKey === `cmd-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  Система разрешений (Oxide & Carbon Permissions)
                </h3>
                <span className="text-xs text-slate-400">Всего разрешений: {plugin.permissions.length}</span>
              </div>

              {plugin.permissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-[#0b1426] border border-cyan-500/10">
                  Плагин не регистрирует индивидуальных прав (доступен всем или только администраторам AuthLevel 2).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {plugin.permissions.map((perm, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0b1426] border border-cyan-500/20 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            {perm.permission}
                          </code>
                        </div>
                        <p className="text-xs text-slate-300">{perm.description}</p>
                      </div>

                      <button
                        onClick={() => handleCopy(perm.permission, `perm-${idx}`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] text-xs transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === `perm-${idx}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Скопировано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Копировать</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    Конфигурация по умолчанию ({plugin.id}.json)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Файл сохраняется в: <code className="text-cyan-300">{plugin.deepData.targetConfigPath.replace('{framework}', isCarbonServer ? 'carbon' : 'oxide')}</code>
                  </p>
                </div>

                {plugin.deepData.defaultConfigJson && (
                  <button
                    onClick={() => handleCopy(plugin.deepData.defaultConfigJson || '', 'config-json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-[#00f0ff] border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    {copiedKey === 'config-json' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Копировать JSON</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#050912] border border-cyan-500/20 overflow-x-auto font-mono text-xs text-cyan-300 leading-relaxed max-h-[420px]">
                <pre>{plugin.deepData.defaultConfigJson || '// Конфигурация генерируется автоматически при первом запуске плагина на сервере'}</pre>
              </div>
            </div>
          )}

          {/* TAB 5: DEEP TECHNICAL SPECS */}
          {activeTab === 'deep' && (
            <div className="space-y-6 max-w-4xl">
              <div className="p-4 rounded-2xl bg-[#0b1426] border border-cyan-500/20 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  Потаённые технические характеристики & Внутреннее устройство
                </h3>

                {/* Hooks Subscriptions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#00f0ff]" />
                      Перехватываемые хуки Rust/Oxide/Carbon ({plugin.deepData.hookSubscriptions.length}):
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {plugin.deepData.hookSubscriptions.map((hook) => (
                      <span
                        key={hook}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25"
                      >
                        {hook}
                      </span>
                    ))}
                  </div>
                </div>

                {/* RPC & Network */}
                <div className="pt-3 border-t border-cyan-500/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-purple-400" />
                      Сетевой обмен и RPC:
                    </span>
                    <div className="text-xs text-slate-400 mt-1">
                      {plugin.deepData.hasRpc ? (
                        <span className="text-purple-300">
                          Использует RPC ({plugin.deepData.rpcMethods?.join(', ') || 'ClientRPC'})
                        </span>
                      ) : (
                        <span className="text-emerald-400">Чистый серверный бекенд (Без RPC трафика)</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Фоновые таймеры:
                    </span>
                    <div className="text-xs text-slate-300 mt-1">{plugin.deepData.timerCount}</div>
                  </div>
                </div>

                {/* GC & Profiling */}
                <div className="pt-3 border-t border-cyan-500/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Профиль памяти и Garbage Collection:
                    </span>
                    <div className="text-xs text-emerald-300 mt-1 font-semibold">{plugin.deepData.gcImpact}</div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                      Контрольная сумма SHA-256:
                    </span>
                    <div className="text-[11px] font-mono text-slate-400 mt-1 truncate" title={plugin.deepData.checksumSha256}>
                      {plugin.deepData.checksumSha256 || 'Calculated on installation'}
                    </div>
                  </div>
                </div>

                {/* Target Server Paths */}
                <div className="pt-3 border-t border-cyan-500/10 space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Файловая структура на сервере:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-black/40 border border-cyan-500/10">
                      <div className="text-slate-400 text-[10px]">Плагин (.cs):</div>
                      <div className="text-cyan-300 truncate">
                        {plugin.deepData.targetPluginPath.replace('{framework}', isCarbonServer ? 'carbon' : 'oxide')}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-cyan-500/10">
                      <div className="text-slate-400 text-[10px]">Конфиг (.json):</div>
                      <div className="text-purple-300 truncate">
                        {plugin.deepData.targetConfigPath.replace('{framework}', isCarbonServer ? 'carbon' : 'oxide')}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-cyan-500/10">
                      <div className="text-slate-400 text-[10px]">Данные (.json):</div>
                      <div className="text-amber-300 truncate">
                        {plugin.deepData.targetDataPath
                          ? plugin.deepData.targetDataPath.replace('{framework}', isCarbonServer ? 'carbon' : 'oxide')
                          : 'Не требуются'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SOURCE CODE */}
          {activeTab === 'code' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-cyan-400" />
                    Исходный C# код плагина ({plugin.id}.cs)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Чистый компилируемый C# код, готовый к развертыванию на сервере
                  </p>
                </div>

                {plugin.codeContent && (
                  <button
                    onClick={() => handleCopy(plugin.codeContent || '', 'source-code')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-[#00f0ff] border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    {copiedKey === 'source-code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Копировать код</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#050912] border border-cyan-500/20 overflow-x-auto font-mono text-xs text-emerald-300 leading-relaxed max-h-[460px]">
                <pre>{plugin.codeContent || '// Исходный код будет скачан напрямую с официального сервера ' + plugin.source.toUpperCase()}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
