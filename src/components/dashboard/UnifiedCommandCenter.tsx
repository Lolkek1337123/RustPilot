import React, { useState } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Save,
  Trash2,
  FolderOpen,
  Zap,
  HardDrive,
  RefreshCw,
  Sparkles,
  BookOpen,
  ArrowUpCircle,
  FastForward,
  FlaskConical,
  Sun,
  Moon,
  CloudSun,
  Package,
  Map,
  Compass,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { ConsoleView } from '../console/ConsoleView';
import { TelemetryCharts } from './TelemetryCharts';
import { ServerConfig, ServerStatus, ServerTelemetry, TelemetryPoint } from '../../types';
import { sound } from '../../services/soundService';

interface UnifiedCommandCenterProps {
  server: ServerConfig;
  status: ServerStatus;
  telemetry: ServerTelemetry;
  history: TelemetryPoint[];
  logs: string[];
  chatMessages: string[];
  commandInput: string;
  setCommandInput: (val: string) => void;
  onStartServer: () => void;
  onQuickStart: () => void;
  onStopServer: () => void;
  onRestartServer: () => void;
  onSaveServer: () => void;
  onOpenWipeModal: () => void;
  onOpenFolder: () => void;
  onOpenCommandLibrary: () => void;
  onSendCommand: (cmd: string) => void;
  onClearLogs: () => void;
}

export const UnifiedCommandCenter: React.FC<UnifiedCommandCenterProps> = ({
  server,
  status,
  telemetry,
  history,
  logs,
  chatMessages,
  commandInput,
  setCommandInput,
  onStartServer,
  onQuickStart,
  onStopServer,
  onRestartServer,
  onSaveServer,
  onOpenWipeModal,
  onOpenFolder,
  onOpenCommandLibrary,
  onSendCommand,
  onClearLogs
}) => {
  const [isEnvTweakOpen, setIsEnvTweakOpen] = useState(false);
  const isRunning = status === 'running';
  const isProcessAlive = status === 'running' || status === 'starting' || status === 'restarting';

  const getStatusBadge = (st: ServerStatus) => {
    switch (st) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            4. ЗАПУЩЕН / ОНЛАЙН
          </span>
        );
      case 'starting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            3. ЗАПУСКАЕТСЯ (Инициализация карты...)
          </span>
        );
      case 'updating':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/40">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-spin" />
            2. ПРОВЕРКА И ОБНОВЛЕНИЕ ВЕРСИЙ
          </span>
        );
      case 'restarting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-spin" />
            6. ПЕРЕЗАПУСКАЕТСЯ
          </span>
        );
      case 'wiping':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/40">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
            5. ВАЙПАЕТСЯ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            1. ОТКЛЮЧЕН
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-hidden select-none">
      {/* ── Top Hero Card: Server Title, World Info & Master Controls ── */}
      <div className="rounded-2xl glass-panel p-4 px-5 relative overflow-hidden shadow-2xl shrink-0 border border-cyan-500/25">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 font-mono shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                {server.framework.toUpperCase()}
              </span>
              {getStatusBadge(status)}
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                IP: 127.0.0.1:{server.port} • Query: {server.queryPort} • RCON: {server.rconPort}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-wide font-['Outfit'] flex items-center gap-2">
                <span className="bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent drop-shadow-sm">
                  {server.serverName}
                </span>
              </h1>

              {/* World Map & Seed Pills */}
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-[#00f0ff]" />
                  Size: {server.worldSize || 3000}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center gap-1">
                  <Map className="w-3 h-3 text-purple-400" />
                  Seed: {server.seed || 123456}
                </span>
              </div>
            </div>
          </div>

          {/* Master Server Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Environment Control Dropdown */}
            {isRunning && (
              <div className="relative">
                <button
                  onClick={() => setIsEnvTweakOpen(!isEnvTweakOpen)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 transition-all cursor-pointer"
                  title="Быстрое управление временем суток, погодой и ивентами"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Окружение</span>
                </button>

                {isEnvTweakOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-60 rounded-2xl border border-cyan-500/30 bg-[#060b17]/95 backdrop-blur-xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-400/80 font-mono">
                      Игровое Окружение
                    </div>
                    <button
                      onClick={() => {
                        onSendCommand('env.time 12');
                        setIsEnvTweakOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-cyan-500/15 text-slate-200 hover:text-white transition-all cursor-pointer"
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Сделать полдень (12:00)</span>
                    </button>
                    <button
                      onClick={() => {
                        onSendCommand('env.time 0');
                        setIsEnvTweakOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-cyan-500/15 text-slate-200 hover:text-white transition-all cursor-pointer"
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Сделать полночь (00:00)</span>
                    </button>
                    <button
                      onClick={() => {
                        onSendCommand('weather.clouds 0; weather.rain 0; weather.fog 0; weather.wind 0');
                        setIsEnvTweakOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-cyan-500/15 text-slate-200 hover:text-white transition-all cursor-pointer"
                    >
                      <CloudSun className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                      <span>Ясная погода (Без дождя/тумана)</span>
                    </button>
                    <button
                      onClick={() => {
                        onSendCommand('spawn supply_drop');
                        setIsEnvTweakOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-cyan-500/15 text-slate-200 hover:text-white transition-all cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Вызвать AirDrop самолет</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isProcessAlive ? (
              <>
                <div className="shimmer-wrapper">
                  <button
                    onClick={() => {
                      sound.playStart();
                      onStartServer();
                    }}
                    className="shimmer-content flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-black bg-gradient-to-r from-[#00f0ff] via-[#38bdf8] to-[#0284c7] hover:brightness-110 shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    title="Запустить сервер с полной проверкой и компиляцией плагинов"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>ЗАПУСТИТЬ СЕРВЕР</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    sound.playStart();
                    onQuickStart();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 hover:border-cyan-400/50 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
                  title="Быстрый запуск сервера напрямую (минуя проверку обновлений)"
                >
                  <FastForward className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span>Быстрый старт</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    sound.playStop();
                    onStopServer();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:brightness-110 shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  title="Остановить сервер (сохранение карты и мягкое завершение процесса)"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>ОСТАНОВИТЬ</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    onRestartServer();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 hover:border-cyan-400/50 shadow-sm transition-all cursor-pointer"
                  title="Мягкий перезапуск сервера"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span>Рестарт</span>
                </button>

                <button
                  onClick={() => {
                    sound.playSuccess();
                    onSaveServer();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 shadow-sm transition-all cursor-pointer"
                  title="Принудительно сохранить карту (server.save)"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Сохранить</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                sound.playWipe();
                onOpenWipeModal();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 shadow-sm transition-all cursor-pointer"
              title="Открыть меню очистки карты и чертежей"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Вайп</span>
            </button>

            <button
              onClick={onOpenFolder}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#0a1122] hover:bg-cyan-500/20 text-slate-300 hover:text-[#00f0ff] border border-cyan-500/20 hover:border-cyan-400/40 shadow-sm transition-all cursor-pointer"
              title="Показать путь к папке сервера"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Startup Pipeline Progress Indicator (Only when Starting/Updating) ── */}
        {(status === 'starting' || status === 'updating' || status === 'restarting') && (
          <div className="mt-3 pt-3 border-t border-cyan-500/20 flex items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-bold">Инициализация:</span>
              <span className="text-slate-300">
                {status === 'updating' ? 'Проверка обновлений и SteamCMD...' : 'Загрузка ассетов карты и компиляция модов...'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30">
                PORT {server.port}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
                RCON {server.rconPort}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Middle Strip: 8 Real-time Telemetry Metrics Cards with Live Sparklines ── */}
      <div className="shrink-0">
        <TelemetryCharts telemetry={telemetry} isRunning={isProcessAlive} history={history} />
      </div>

      {/* ── Bottom Section: Unified Interactive Console & Chat ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ConsoleView
          logs={logs}
          chatMessages={chatMessages}
          onSendCommand={onSendCommand}
          onClearLogs={onClearLogs}
          onOpenCommandLibrary={onOpenCommandLibrary}
          commandInput={commandInput}
          setCommandInput={setCommandInput}
        />
      </div>
    </div>
  );
};
