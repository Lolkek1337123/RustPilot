import React from 'react';
import { AlertTriangle, Square, ArrowDownToLine, X, Server } from 'lucide-react';
import { ServerConfig, ServerStatus } from '../../types';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  runningServers: ServerConfig[];
  serverStatuses: Record<string, ServerStatus>;
  onMinimizeToTray: () => void;
  onConfirmExit: () => void;
  onCancel: () => void;
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  runningServers,
  serverStatuses,
  onMinimizeToTray,
  onConfirmExit,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/10">
          <div className="flex items-center gap-2 text-[#00f0ff]">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold text-sm text-white">Внимание: Сервер сейчас запущен!</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          <p className="leading-relaxed">
            Один или несколько серверов Rust Dedicated сейчас находятся в активном состоянии.
          </p>

          <div className="p-3 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              Активные серверы ({runningServers.length}):
            </div>
            {runningServers.map((srv) => (
              <div key={srv.serverPath} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-white truncate mr-2">
                  <Server className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                  <span className="truncate">{srv.serverName}</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  АКТИВЕН
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            Вы можете свернуть RustPilot в системный трей — серверы продолжат бесперебойную работу в фоновом режиме.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-cyan-500/20 bg-cyan-500/5 flex flex-col sm:flex-row items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <button
            onClick={onMinimizeToTray}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00f0ff] border border-cyan-400/40 shadow-sm transition-all cursor-pointer"
            title="Спрятать окно в трей, оставив серверы онлайн"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Свернуть в трей</span>
          </button>

          <button
            onClick={onConfirmExit}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/40 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
            title="Остановить все серверы и полностью закрыть приложение"
          >
            <Square className="w-3.5 h-3.5 fill-red-300" />
            <span>Остановить и выйти</span>
          </button>
        </div>
      </div>
    </div>
  );
};
