import React from 'react';
import {
  Play,
  Square,
  RotateCw,
  Save,
  Users,
  Activity,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
  FlaskConical
} from 'lucide-react';
import { ServerConfig, ServerStatus, Player } from '../../types';

interface DashboardViewProps {
  status: ServerStatus;
  config: ServerConfig;
  players: Player[];
  onStartServer: () => void;
  onStopServer: () => void;
  onRestartServer: () => void;
  onSaveServer: () => void;
  onQuickCommand: (cmd: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  status,
  config,
  players,
  onStartServer,
  onStopServer,
  onRestartServer,
  onSaveServer,
  onQuickCommand
}) => {
  const isRunning = status === 'running';
  const isDevblogServer = config.isDevblog || config.serverPath.toLowerCase().includes('devblog') || config.serverName.toLowerCase().includes('devblog');

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-full">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 border border-cyan-500/20 bg-gradient-to-r from-[#0a1122]/95 via-[#050811]/90 to-[#0f1c38]/95">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            {isDevblogServer ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-[#00f0ff] shadow-sm">
                <ShieldAlert className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>🔒 Защита сборки Devblog (Авто-обновление отключено)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-[#00f0ff]">
                <FlaskConical className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>TRP Labs • Dedicated Orchestrator</span>
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-['Outfit']">
              {config.serverName || 'My Rust Server'}
            </h1>
            <p className="text-xs text-[#94a3b8] font-mono">
              IP: 127.0.0.1:{config.port} • RCON: {config.rconPort} • Seed: {config.seed} ({config.worldSize}m) • Mod: {config.framework.toUpperCase()}
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {status !== 'running' && status !== 'starting' ? (
              <button
                onClick={onStartServer}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-lg shadow-cyan-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 border border-cyan-300/30 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Запустить сервер</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onStopServer}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-red-300" />
                  <span>Остановить</span>
                </button>
                <button
                  onClick={onRestartServer}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-white border border-cyan-500/20 transition-all cursor-pointer"
                  title="Перезагрузить"
                >
                  <RotateCw className="w-4 h-4 text-[#00f0ff]" />
                </button>
                <button
                  onClick={onSaveServer}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                  title="Сохранить мир (server.save)"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Online */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden bg-[#0a1122] border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Онлайн игроков</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-[#00f0ff]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{players.length}</span>
            <span className="text-xs text-[#94a3b8] font-mono">/ {config.maxPlayers} max</span>
          </div>
          <div className="mt-3 w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-cyan-500/15">
            <div
              className="bg-gradient-to-r from-[#00f0ff] to-[#2563eb] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (players.length / (config.maxPlayers || 50)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Framework */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden bg-[#0a1122] border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Моддинг-ядро</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-[#00f0ff]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-white uppercase">
              {config.framework === 'carbon_release' && 'Carbon (Production)'}
              {config.framework === 'carbon_preview' && 'Carbon (Edge)'}
              {config.framework === 'oxide' && 'Oxide / uMod'}
              {config.framework === 'vanilla' && 'Vanilla (Чистый)'}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#94a3b8]">
            {config.framework.startsWith('carbon') ? 'Поддержка C#, Hook Native' : 'Стандартные хуки'}
          </div>
        </div>

        {/* Metric 3: Server FPS / Status */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden bg-[#0a1122] border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Статус RCON</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              {isRunning ? 'Connected' : 'Standby'}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#94a3b8]">
            {isRunning ? 'Порт 28016/WebSockets' : 'Ожидание старта'}
          </div>
        </div>

        {/* Metric 4: Auto-Watchdog */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden bg-[#0a1122] border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Watchdog Защита</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-[#00f0ff]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-[#00f0ff]">Активна</span>
          </div>
          <div className="mt-2 text-xs text-[#94a3b8]">
            Авто-рестарт при краше / сбое
          </div>
        </div>
      </div>

      {/* Quick Console Actions & Preset Toolbar */}
      <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 space-y-4 bg-[#0a1122]/90">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#00f0ff]" />
            <span>Быстрые RCON-команды</span>
          </div>
          <span className="text-xs text-[#94a3b8] font-mono">1-Click Trigger</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onQuickCommand('serverinfo')}
            disabled={!isRunning}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-slate-200 border border-cyan-500/20 transition-all disabled:opacity-40 cursor-pointer"
          >
            serverinfo (Статус)
          </button>
          <button
            onClick={() => onQuickCommand('fps')}
            disabled={!isRunning}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-slate-200 border border-cyan-500/20 transition-all disabled:opacity-40 cursor-pointer"
          >
            fps (Тикрейт)
          </button>
          <button
            onClick={() => onQuickCommand('gc.collect')}
            disabled={!isRunning}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-slate-200 border border-cyan-500/20 transition-all disabled:opacity-40 cursor-pointer"
          >
            gc.collect (Очистка памяти)
          </button>
          <button
            onClick={() => onQuickCommand('c.reload *')}
            disabled={!isRunning}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00f0ff] border border-cyan-400/40 transition-all disabled:opacity-40 cursor-pointer"
          >
            c.reload * (Релоад всех плагинов)
          </button>
          <button
            onClick={() => onQuickCommand('o.reload *')}
            disabled={!isRunning}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all disabled:opacity-40 cursor-pointer"
          >
            o.reload * (Oxide Релоад)
          </button>
          <button
            onClick={() => onQuickCommand('say "[СЕРВЕР] Всем приятной игры!"')}
            disabled={!isRunning}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all disabled:opacity-40 cursor-pointer"
          >
            say (Сообщение в чат)
          </button>
        </div>
      </div>
    </div>
  );
};
