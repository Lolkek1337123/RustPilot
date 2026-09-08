import React, { useState } from 'react';
import { RefreshCw, Archive, Clock, AlertTriangle, ShieldCheck, CheckCircle2, Play, Calendar, FlaskConical } from 'lucide-react';
import { ServerConfig } from '../../types';

interface UpdaterViewProps {
  config: ServerConfig;
  onUpdateNow: () => void;
  onCreateBackup: (name: string) => Promise<string>;
}

export const UpdaterView: React.FC<UpdaterViewProps> = ({
  config,
  onUpdateNow,
  onCreateBackup
}) => {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [checkIntervalMin, setCheckIntervalMin] = useState(5);
  const [warnPlayersBeforeRestart, setWarnPlayersBeforeRestart] = useState(true);
  const [backupName, setBackupName] = useState('Manual_Backup');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const handleBackup = async () => {
    try {
      setBackupStatus('Создание архивного бэкапа...');
      const backupPath = await onCreateBackup(backupName);
      setBackupStatus(`Бэкап успешно сохранен: ${backupPath}`);
      setTimeout(() => setBackupStatus(null), 5000);
    } catch (err: any) {
      setBackupStatus(`Ошибка бэкапа: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-full max-w-5xl mx-auto bg-[#050811]">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#00f0ff]" />
          <span>Автообновления, Бэкапы и Планировщик</span>
        </h2>
        <p className="text-xs text-[#94a3b8]">
          Умный фоновый мониторинг релизов Facepunch/Carbon, бекапы сохранений и расписание вайпов
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Smart Auto-Updater */}
        <div className="rounded-2xl glass-panel p-6 border border-cyan-500/20 bg-[#0a1122] space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Smart Watchdog & Auto-Update</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ACTIVE
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#050811] border border-cyan-500/15">
              <div>
                <div className="text-xs font-semibold text-white">Авто-проверка обновлений Steam</div>
                <div className="text-[11px] text-[#94a3b8]">Опрашивать Steam Web API о выходе патчей игры</div>
              </div>
              <input
                type="checkbox"
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#00f0ff]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#050811] border border-cyan-500/15">
              <div>
                <div className="text-xs font-semibold text-white">Предупреждение в чат игрокам</div>
                <div className="text-[11px] text-[#94a3b8]">Отправлять таймер за 3 минуты до авто-перезагрузки</div>
              </div>
              <input
                type="checkbox"
                checked={warnPlayersBeforeRestart}
                onChange={(e) => setWarnPlayersBeforeRestart(e.target.checked)}
                className="w-4 h-4 accent-[#00f0ff]"
              />
            </div>

            <div>
              <label className="text-xs text-[#94a3b8] block mb-1">Интервал проверки (минуты):</label>
              <input
                type="number"
                value={checkIntervalMin}
                onChange={(e) => setCheckIntervalMin(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
              />
            </div>

            <button
              onClick={onUpdateNow}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase bg-cyan-500/10 hover:bg-cyan-500/20 text-white border border-cyan-500/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Проверить и обновить сервер сейчас</span>
            </button>
          </div>
        </div>

        {/* Card 2: Backups & Restores */}
        <div className="rounded-2xl glass-panel p-6 border border-cyan-500/20 bg-[#0a1122] space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#00f0ff]" />
              <span>Резервное копирование (Бэкапы)</span>
            </div>
            <span className="text-[10px] font-mono text-[#94a3b8]">ZIP / LZ4</span>
          </div>

          <p className="text-xs text-slate-300">
            Сохраняет папки `server/`, `carbon/` (или `oxide/`), конфигурации и данные вайпа в единый архив.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#94a3b8] block mb-1">Метка бэкапа:</label>
              <input
                type="text"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
              />
            </div>

            {backupStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                {backupStatus}
              </div>
            )}

            <button
              onClick={handleBackup}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-lg shadow-cyan-950/40 transition-all hover:scale-[1.01] border border-cyan-300/30 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Создать бэкап сервера в 1 клик</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
