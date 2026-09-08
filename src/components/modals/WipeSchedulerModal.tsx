import React, { useState } from 'react';
import { X, RefreshCw, Trash2, Archive, AlertTriangle, ShieldCheck, CheckCircle2, FlaskConical } from 'lucide-react';
import { UpdaterView } from '../updater/UpdaterView';
import { ServerConfig } from '../../types';

interface WipeSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: ServerConfig;
  onUpdateNow: () => void;
  onCreateBackup: (name: string) => Promise<string>;
  onPerformWipe: (wipeType: 'full' | 'map' | 'bp') => void;
}

export const WipeSchedulerModal: React.FC<WipeSchedulerModalProps> = ({
  isOpen,
  onClose,
  server,
  onUpdateNow,
  onCreateBackup,
  onPerformWipe
}) => {
  const [confirmingWipe, setConfirmingWipe] = useState<'full' | 'map' | 'bp' | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#00f0ff]" />
            <span className="font-bold text-white">Автовайпы, Бэкапы и Автообновления</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Wipe Actions */}
          <div className="p-5 rounded-2xl glass-card border border-amber-500/30 bg-amber-950/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Быстрый ручной вайп сервера</span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                Внимание
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Перед выполнением вайпа убедитесь, что сервер остановлен. Выберите тип очистки:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setConfirmingWipe('map')}
                className="p-3.5 rounded-xl bg-[#050811] hover:bg-amber-500/20 text-left border border-cyan-500/20 hover:border-amber-500/40 transition-all space-y-1 cursor-pointer"
              >
                <div className="text-xs font-bold text-white">Map Wipe (Карта)</div>
                <div className="text-[10px] text-[#94a3b8]">Удаляет .sav и .map файлы. Чертежи игроков сохраняются.</div>
              </button>

              <button
                onClick={() => setConfirmingWipe('bp')}
                className="p-3.5 rounded-xl bg-[#050811] hover:bg-amber-500/20 text-left border border-cyan-500/20 hover:border-amber-500/40 transition-all space-y-1 cursor-pointer"
              >
                <div className="text-xs font-bold text-white">BP Wipe (Чертежи)</div>
                <div className="text-[10px] text-[#94a3b8]">Сбрасывает изученные чертежи и опыт всех игроков.</div>
              </button>

              <button
                onClick={() => setConfirmingWipe('full')}
                className="p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-left border border-red-500/30 transition-all space-y-1 cursor-pointer"
              >
                <div className="text-xs font-bold text-red-300">Full Wipe (Полный)</div>
                <div className="text-[10px] text-[#94a3b8]">Полная очистка карты, построек и всех чертежей.</div>
              </button>
            </div>

            {confirmingWipe && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-4 animate-in fade-in">
                <div className="text-xs text-red-200">
                  Вы действительно хотите выполнить <span className="font-bold uppercase">{confirmingWipe} Wipe</span> для {server.serverName}?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmingWipe(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      onPerformWipe(confirmingWipe);
                      setConfirmingWipe(null);
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer"
                  >
                    Да, вайпнуть
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Updater & Backups Section */}
          <UpdaterView
            config={server}
            onUpdateNow={onUpdateNow}
            onCreateBackup={onCreateBackup}
          />
        </div>
      </div>
    </div>
  );
};
