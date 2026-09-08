import React from 'react';
import { Minus, Square, X, Cpu, ChevronDown, Server, FlaskConical } from 'lucide-react';
import { ServerStatus } from '../../types';

interface TitleBarProps {
  status: ServerStatus;
  serverName: string;
  onOpenServerSelector: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ status, serverName, onOpenServerSelector }) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE</span>;
      case 'starting':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> STARTING</span>;
      case 'updating':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-spin"></span> UPDATING</span>;
      case 'restarting':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">RESTARTING</span>;
      case 'wiping':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">WIPING</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> OFFLINE</span>;
    }
  };

  return (
    <header className="h-10 bg-[#050811]/90 backdrop-blur-md border-b border-cyan-500/15 flex items-center justify-between px-3 select-none [-webkit-app-region:drag] z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-cyan-400/30">
            <FlaskConical className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-white via-cyan-200 to-[#00f0ff] bg-clip-text text-transparent font-['Outfit']">
            TRP Labs RustPilot
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-[#00f0ff] font-semibold border border-cyan-500/20">
            v2.0 Cobalt
          </span>
        </div>

        <div className="h-4 w-px bg-cyan-500/20" />

        {/* Server Selector Trigger */}
        <div className="flex items-center gap-2 text-xs [-webkit-app-region:no-drag]">
          <button
            onClick={onOpenServerSelector}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0a1122] hover:bg-[#0f1c38] text-slate-200 border border-cyan-500/20 transition-all hover:border-cyan-400/40 cursor-pointer"
            title="Выбрать другой сервер"
          >
            <Server className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span className="font-bold max-w-[180px] truncate">{serverName || 'Выбрать сервер...'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {getStatusBadge()}
        </div>
      </div>

      <div className="flex items-center gap-1 [-webkit-app-region:no-drag]">
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
          onClick={() => (window as any).electronAPI?.closeWindow()}
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 rounded transition-colors cursor-pointer"
          title="Закрыть"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
