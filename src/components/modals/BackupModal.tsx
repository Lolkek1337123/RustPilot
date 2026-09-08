import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Download,
  UploadCloud,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Archive,
  RefreshCw
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

interface BackupItem {
  fileName: string;
  fullPath: string;
  sizeBytes: number;
  sizeMb: string;
  created: number;
}

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverPath: string;
  serverName: string;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  serverPath,
  serverName
}) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [backupName, setBackupName] = useState<string>('Snapshot');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const backupDir = `${serverPath}\\..\\_backups`;

  useEffect(() => {
    if (!isOpen || !serverPath) return;
    loadBackups();
  }, [isOpen, serverPath]);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const list = await (window as any).electronAPI?.listBackups(backupDir);
      if (Array.isArray(list)) {
        setBackups(list);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setStatusMessage(null);
    soundEffects.playClick();
    try {
      const zipPath = await (window as any).electronAPI?.createBackup(
        serverPath,
        backupDir,
        backupName || 'ManualBackup'
      );
      soundEffects.playSuccess();
      setStatusMessage({ type: 'success', text: `Снимок успешно сохранён: ${zipPath}` });
      await loadBackups();
    } catch (err: any) {
      soundEffects.playError();
      setStatusMessage({ type: 'error', text: `Ошибка создания снимка: ${err.message}` });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreBackup = async (item: BackupItem) => {
    if (!window.confirm(`Вы уверены, что хотите восстановить сервер из бэкапа "${item.fileName}"? Все несохраненные данные мира будут заменены!`)) {
      return;
    }

    setIsRestoring(item.fileName);
    setStatusMessage(null);
    soundEffects.playWarning();
    try {
      await (window as any).electronAPI?.restoreBackup(item.fullPath, serverPath);
      soundEffects.playSuccess();
      setStatusMessage({ type: 'success', text: `Сервер успешно восстановлен из архива ${item.fileName}!` });
    } catch (err: any) {
      soundEffects.playError();
      setStatusMessage({ type: 'error', text: `Ошибка восстановления: ${err.message}` });
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDeleteBackup = async (item: BackupItem) => {
    if (!window.confirm(`Удалить архив "${item.fileName}"?`)) return;
    try {
      await (window as any).electronAPI?.deleteFile(item.fullPath);
      soundEffects.playClick();
      await loadBackups();
    } catch (err: any) {
      alert(`Ошибка удаления: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl border-2 border-cyan-500/30 bg-[#050811] shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-[#091122] via-[#050811] to-[#0c162d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] flex items-center justify-center border border-cyan-400/40 shadow-lg shadow-cyan-950/50">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Менеджер бэкапов и мгновенный откат</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30">
                  SNAPSHOTS
                </span>
              </h2>
              <p className="text-[11px] text-[#94a3b8] font-mono">
                Архивация мира (save), данных плагинов (oxide/carbon data) и конфигов в .ZIP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Create Snapshot Toolbar ── */}
        <div className="px-6 py-4 border-b border-cyan-500/15 bg-[#060b17] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <input
              type="text"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              placeholder="Название снимка (например: BeforeWipe_Thursday)"
              className="flex-1 px-4 py-2 rounded-xl bg-[#091122] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
            />
            <button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] text-white hover:brightness-110 shadow-lg border border-cyan-300/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isCreating ? 'Создание ZIP архива...' : 'Создать снимок'}</span>
            </button>
          </div>

          <button
            onClick={loadBackups}
            className="p-2 rounded-xl bg-[#091122] border border-cyan-500/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Обновить список"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status alert */}
        {statusMessage && (
          <div
            className={`px-6 py-2 text-xs flex items-center gap-2 font-mono ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-red-950/40 text-red-300 border-b border-red-500/30'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ── Backups List Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">Чтение архивов...</div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Archive className="w-12 h-12 text-slate-700" />
              <div className="text-sm font-bold text-slate-300">Снимки сервера пока не создавались</div>
              <p className="text-xs text-slate-500 max-w-md">
                Создайте первый снимок прямо сейчас перед внесением изменений в плагины или вайпом карты.
              </p>
            </div>
          ) : (
            backups.map((item) => {
              const dateStr = new Date(item.created).toLocaleString('ru-RU');

              return (
                <div
                  key={item.fileName}
                  className="p-4 rounded-2xl bg-[#081024] border border-cyan-500/20 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[#00f0ff] shrink-0">
                      <Archive className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-white truncate mb-0.5">{item.fileName}</div>
                      <div className="text-[11px] text-[#94a3b8] font-mono flex items-center gap-3">
                        <span>📦 Размер: <strong className="text-white">{item.sizeMb} MB</strong></span>
                        <span>• 📅 Дата: <strong className="text-white">{dateStr}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestoreBackup(item)}
                      disabled={isRestoring === item.fileName}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      title="Откатить сервер к этому состоянию"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isRestoring === item.fileName ? 'Откат...' : 'Откатить'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteBackup(item)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Удалить архив"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
