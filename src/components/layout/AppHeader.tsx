import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Users,
  Code2,
  RefreshCw,
  Sliders,
  Plus,
  Settings,
  Minus,
  Square,
  X,
  ChevronDown,
  Server,
  BookOpen,
  ArrowDownToLine,
  History as HistoryIcon,
  FlaskConical,
  FileCode,
  Clock,
  Archive,
  Globe,
  Zap,
  Layers,
  Wrench,
  ShieldAlert,
  Terminal,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { sound } from '../../services/soundService';
import { ModalType, ServerConfig, ServerStatus } from '../../types';

interface AppHeaderProps {
  servers: ServerConfig[];
  activeServer: ServerConfig;
  serverStatuses: Record<string, ServerStatus>;
  onSelectServer: (server: ServerConfig) => void;
  onOpenModal: (modal: ModalType) => void;
  onCloseApp: () => void;
}

type DropdownCategory = 'community' | 'plugins' | 'automation' | 'ecosystem' | 'serverSelect' | null;

export const AppHeader: React.FC<AppHeaderProps> = ({
  servers,
  activeServer,
  serverStatuses,
  onSelectServer,
  onOpenModal,
  onCloseApp
}) => {
  const [activeDropdown, setActiveDropdown] = useState<DropdownCategory>(null);
  const [soundActive, setSoundActive] = useState(() => sound.isSoundEnabled());
  const headerRef = useRef<HTMLDivElement>(null);

  const handleToggleSound = () => {
    const next = sound.toggleSound();
    setSoundActive(next);
  };

  const currentStatus = serverStatuses[activeServer.serverPath] || 'stopped';
  const runningCount = Object.values(serverStatuses).filter((s) => s === 'running' || s === 'starting').length;

  // Close dropdown on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDropdown = (category: DropdownCategory) => {
    sound.playClick(1.1);
    setActiveDropdown((prev) => (prev === category ? null : category));
  };

  const handleAction = (modal: ModalType) => {
    sound.playClick();
    setActiveDropdown(null);
    onOpenModal(modal);
  };

  const getStatusBadge = (status: ServerStatus) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ОНЛАЙН
          </span>
        );
      case 'starting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> СТАРТ
          </span>
        );
      case 'updating':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-spin" /> АПДЕЙТ
          </span>
        );
      case 'restarting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-spin" /> РЕСТАРТ
          </span>
        );
      case 'wiping':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" /> ВАЙП
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30 whitespace-nowrap">
            ВЫКЛ
          </span>
        );
    }
  };

  return (
    <header
      ref={headerRef}
      className="h-12 bg-[#050811]/95 backdrop-blur-lg border-b border-cyan-500/20 flex items-center justify-between px-3 gap-2 select-none [-webkit-app-region:drag] z-50 relative"
    >
      {/* ── LEFT SECTION: Brand & Dropdown Category Menus ── */}
      <div className="flex items-center gap-2 shrink-0 [-webkit-app-region:no-drag]">
        {/* Brand Icon & Label */}
        <div className="flex items-center gap-2 mr-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/30">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-xs tracking-wider bg-gradient-to-r from-[#00f0ff] via-white to-cyan-200 bg-clip-text text-transparent font-['Outfit'] hidden sm:inline">
              TRP LABS
            </span>
            <span className="text-[9px] font-bold text-cyan-400/80 tracking-widest hidden sm:inline font-mono">
              RUSTPILOT
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-purple-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)] animate-pulse">
            <Zap className="w-2.5 h-2.5 text-cyan-300 fill-cyan-300 animate-pulse" /> v1.0.6 PRO
          </span>
        </div>

        <div className="h-4 w-px bg-cyan-500/20 hidden md:block" />

        {/* ── 4 COMPACT DROPDOWN GROUPS ── */}
        <div className="flex items-center gap-1">
          {/* 1. СООБЩЕСТВО / УПРАВЛЕНИЕ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('community')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                activeDropdown === 'community'
                  ? 'bg-cyan-500/20 text-[#00f0ff] border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/30'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span className="hidden sm:inline">Управление</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeDropdown === 'community' ? 'rotate-180 text-[#00f0ff]' : 'text-slate-400'}`} />
            </button>

            {activeDropdown === 'community' && (
              <div className="absolute top-full left-0 mt-1.5 w-72 rounded-2xl border border-cyan-500/30 bg-[#060b17]/95 backdrop-blur-xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-400/80 font-mono">
                  Игроки и Модерация
                </div>
                <button
                  onClick={() => handleAction('players')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-cyan-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00f0ff] group-hover:bg-cyan-500/25 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#00f0ff]">Список игроков</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Баны, кик, муты, телепорт и SteamID</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('commandLib')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-cyan-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38bdf8] group-hover:bg-cyan-500/25 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#00f0ff]">Справочник команд</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Библиотека RCON команд и подсказки</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 2. ПЛАГИНЫ И КОНФИГИ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('plugins')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                activeDropdown === 'plugins'
                  ? 'bg-blue-500/20 text-[#38bdf8] border-blue-400/50 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-blue-500/10 border-transparent hover:border-blue-500/30'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="hidden sm:inline">Плагины</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeDropdown === 'plugins' ? 'rotate-180 text-[#38bdf8]' : 'text-slate-400'}`} />
            </button>

            {activeDropdown === 'plugins' && (
              <div className="absolute top-full left-0 mt-1.5 w-76 rounded-2xl border border-blue-500/30 bg-[#060b17]/95 backdrop-blur-xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#38bdf8] font-mono">
                  Модификации и Код
                </div>
                <button
                  onClick={() => handleAction('plugins')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-blue-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#38bdf8] group-hover:bg-blue-500/25 shrink-0">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#38bdf8]">Менеджер плагинов</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Oxide / Carbon моды, компиляция и статус</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('configEditor')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-blue-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#00f0ff] group-hover:bg-blue-500/25 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#38bdf8]">Редактор конфигов</div>
                    <div className="text-[10px] text-slate-400 leading-tight">JSON конфиги с авто-перезагрузкой модов</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 3. АВТОМАТИЗАЦИЯ И СЕРВИС */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('automation')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                activeDropdown === 'automation'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-amber-500/10 border-transparent hover:border-amber-500/30'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Сервис</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeDropdown === 'automation' ? 'rotate-180 text-amber-300' : 'text-slate-400'}`} />
            </button>

            {activeDropdown === 'automation' && (
              <div className="absolute top-full left-0 mt-1.5 w-80 rounded-2xl border border-amber-500/30 bg-[#060b17]/95 backdrop-blur-xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 font-mono">
                  Автоматизация и Обслуживание
                </div>
                <button
                  onClick={() => handleAction('updater')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-amber-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">Автовайп и Вайпы</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Очистка карты, чертежей и авто-вайпы по дням</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('scheduler')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-amber-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#38bdf8] group-hover:bg-blue-500/25 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">Планировщик задач</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Авторестарты, сообщения в чат и таймеры</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('backups')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-emerald-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 shrink-0">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300">Резервные копии (Бэкапы)</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Снимки состояния сервера и откат в 1 клик</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('settings')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-cyan-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-slate-300 group-hover:bg-cyan-500/25 shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300">Параметры запуска</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Порты, слоты, сид карты, ConVars и .bat</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 4. ЭКОСИСТЕМА И АРХИВЫ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('ecosystem')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                activeDropdown === 'ecosystem'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-500/10 border-transparent hover:border-purple-500/30'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Экосистема</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeDropdown === 'ecosystem' ? 'rotate-180 text-purple-300' : 'text-slate-400'}`} />
            </button>

            {activeDropdown === 'ecosystem' && (
              <div className="absolute top-full left-0 mt-1.5 w-80 rounded-2xl border border-purple-500/30 bg-[#060b17]/95 backdrop-blur-xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-400 font-mono">
                  Установка и Облако TRP
                </div>
                <button
                  onClick={() => handleAction('wizard')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-cyan-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00f0ff] group-hover:bg-cyan-500/25 shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#00f0ff]">Установить сервер</div>
                    <div className="text-[10px] text-slate-400 leading-tight">1-Click мастер установки любой версии Rust</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('devblogs')}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-amber-500/15 text-slate-200 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 shrink-0">
                    <HistoryIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">Архив девблогов</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Каталог 65..301, клиенты и депоты</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CENTER SECTION: Selected Server Dropdown ── */}
      <div className="flex items-center justify-center min-w-0 mx-2 shrink [-webkit-app-region:no-drag]">
        <div className="relative">
          <button
            onClick={() => toggleDropdown('serverSelect')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-lg shadow-black/40 transition-all max-w-[280px] sm:max-w-[340px] cursor-pointer border ${
              activeDropdown === 'serverSelect'
                ? 'bg-[#0f1c38] border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                : 'bg-[#0a1122]/90 hover:bg-[#0f1c38] border-cyan-500/20 hover:border-cyan-400/40'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
            <span className="truncate">{activeServer.serverName || 'Выбрать сервер'}</span>
            <div className="shrink-0 flex items-center gap-1">
              {getStatusBadge(currentStatus)}
              {runningCount > 1 && (
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-[#00f0ff] text-[10px] font-mono font-bold" title="Несколько серверов активны">
                  {runningCount} ON
                </span>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${activeDropdown === 'serverSelect' ? 'rotate-180 text-[#00f0ff]' : ''}`} />
          </button>

          {activeDropdown === 'serverSelect' && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-96 rounded-2xl border-2 border-cyan-500/40 bg-[#060b17] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.98)] space-y-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8] flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <span className="flex items-center gap-1.5 text-white">
                  <Server className="w-3.5 h-3.5 text-[#00f0ff]" />
                  Список серверов ({servers.length})
                </span>
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    onOpenModal('servers');
                  }}
                  className="text-[#00f0ff] hover:text-white text-xs font-bold transition-colors cursor-pointer px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20"
                >
                  Менеджер →
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {servers.map((s) => {
                  const sStatus = serverStatuses[s.serverPath] || 'stopped';
                  const isCur = s.serverPath === activeServer.serverPath;
                  return (
                    <button
                      key={s.serverPath}
                      onClick={() => {
                        onSelectServer(s);
                        setActiveDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer border ${
                        isCur
                          ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/80 text-white border-cyan-400 font-bold shadow-md shadow-cyan-950/60'
                          : 'bg-[#0a1122] border-cyan-500/15 text-slate-300 hover:bg-cyan-500/15 hover:border-cyan-500/35 hover:text-white'
                      }`}
                    >
                      <div className="truncate mr-2 flex-1">
                        <div className={`truncate font-bold flex items-center gap-1.5 ${isCur ? 'text-[#00f0ff]' : 'text-slate-100'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {s.serverName}
                        </div>
                        <div className="text-[10px] text-[#94a3b8] font-mono truncate pl-3 mt-0.5">{s.serverPath}</div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(sStatus)}</div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-cyan-500/20">
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    onOpenModal('servers');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-[#00f0ff] bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить или сканировать сервер</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SECTION: App Settings, Tray & Window Controls ── */}
      <div className="flex items-center gap-2 shrink-0 [-webkit-app-region:no-drag]">
        {/* Quick Audio Sci-Fi SFX Toggle */}
        <button
          onClick={handleToggleSound}
          className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
            soundActive
              ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
              : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-500 border-white/[0.08]'
          }`}
          title={soundActive ? 'Звуковые эффекты Sci-Fi: Включены (нажмите для отключения)' : 'Звуковые эффекты: Отключены (нажмите для включения)'}
        >
          {soundActive ? <Volume2 className="w-4 h-4 text-[#00f0ff]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        <button
          onClick={() => onOpenModal('appSettings')}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-cyan-500/5 hover:bg-cyan-500/15 text-slate-300 hover:text-[#00f0ff] border border-cyan-500/15 transition-all hover:rotate-45 cursor-pointer"
          title="Настройки приложения RustPilot"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-cyan-500/20" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => (window as any).electronAPI?.minimizeToTray()}
            className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors cursor-pointer"
            title="Свернуть в системный трей (фоновая работа)"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => (window as any).electronAPI?.minimizeWindow()}
            className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-cyan-500/10 rounded transition-colors cursor-pointer"
            title="Свернуть"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => (window as any).electronAPI?.maximizeWindow()}
            className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-cyan-500/10 rounded transition-colors cursor-pointer"
            title="Развернуть"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCloseApp}
            className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 rounded transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
