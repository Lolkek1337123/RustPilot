import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  Users,
  Code2,
  DownloadCloud,
  RefreshCw,
  Sliders,
  FolderOpen,
  Server,
  FlaskConical
} from 'lucide-react';
import { NavTab, ServerStatus } from '../../types';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  status: ServerStatus;
  onOpenFolder: () => void;
  onOpenServerSelector: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  status,
  onOpenFolder,
  onOpenServerSelector
}) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
    { id: 'console', label: 'Консоль & Чат', icon: Terminal },
    { id: 'players', label: 'Игроки', icon: Users },
    { id: 'plugins', label: 'Плагины & Конфиги', icon: Code2 },
    { id: 'updater', label: 'Автообновления', icon: RefreshCw },
    { id: 'wizard', label: '1-Click Установка', icon: DownloadCloud },
    { id: 'settings', label: 'Конфигурация', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-[#0a1122]/95 border-r border-cyan-500/15 flex flex-col justify-between p-3 select-none backdrop-blur-xl">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Управление сервером</span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-[#00f0ff] border border-cyan-400/40 shadow-lg shadow-cyan-950/30'
                    : 'text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#00f0ff]' : 'text-[#94a3b8]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / Quick Actions */}
      <div className="space-y-2 pt-3 border-t border-cyan-500/15">
        <button
          onClick={onOpenServerSelector}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#00f0ff]/15 via-[#2563eb]/15 to-[#1e3a8a]/15 hover:brightness-125 text-white border border-cyan-400/30 transition-all shadow-md shadow-cyan-950/20 cursor-pointer"
        >
          <Server className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span>Сменить сервер</span>
        </button>

        <button
          onClick={onOpenFolder}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-cyan-500/5 hover:bg-cyan-500/15 text-slate-300 border border-cyan-500/15 transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>Каталог сервера</span>
        </button>

        <div className="p-2.5 rounded-xl bg-[#050811] border border-cyan-500/15 flex items-center justify-between">
          <div className="text-[11px] text-[#94a3b8]">
            Движок: <span className="text-[#00f0ff] font-mono">TRP Labs Core</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse" />
        </div>
      </div>
    </aside>
  );
};
