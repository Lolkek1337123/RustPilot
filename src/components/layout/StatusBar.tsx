import React, { useState, useEffect } from 'react';
import {
  Activity,
  Shield,
  Clock,
  Save,
  Cpu,
  Palette,
  Terminal,
  Wifi,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { ServerConfig, ServerStatus, ServerTelemetry } from '../../types';

interface StatusBarProps {
  server: ServerConfig;
  status: ServerStatus;
  telemetry: ServerTelemetry;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  server,
  status,
  telemetry
}) => {
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const [autoSaveTimer, setAutoSaveTimer] = useState<number>(300);
  const [themeName, setThemeName] = useState<string>('Cobalt Sci-Fi');

  const isRunning = status === 'running';

  // Uptime ticker
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setUptimeSeconds((prev) => prev + 1);
        setAutoSaveTimer((prev) => (prev > 0 ? prev - 1 : (server.saveInterval || 300)));
      }, 1000);
    } else {
      setUptimeSeconds(0);
      setAutoSaveTimer(server.saveInterval || 300);
    }
    return () => clearInterval(interval);
  }, [isRunning, server.saveInterval]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatMinutesSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <footer className="h-7 bg-[#030611]/95 backdrop-blur-md border-t border-cyan-500/20 flex items-center justify-between px-3 text-[11px] font-mono select-none shrink-0 z-40 text-slate-400">
      {/* Left: Connection & RCON Health */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'
            }`}
          />
          <span className="font-bold text-slate-300">
            {isRunning ? `RCON 127.0.0.1:${server.rconPort}` : 'RCON ОФФЛАЙН'}
          </span>
          {isRunning && telemetry.ping > 0 && (
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              {telemetry.ping} ms
            </span>
          )}
        </div>

        <div className="h-3 w-px bg-cyan-500/20 hidden sm:block" />

        {/* Framework & Mod Engine */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
          <Shield className="w-3 h-3 text-cyan-400" />
          <span className="uppercase text-[10px] font-bold text-cyan-300">
            {server.framework.replace('_', ' ')}
          </span>
        </div>

        <div className="h-3 w-px bg-cyan-500/20 hidden md:block" />

        {/* Port routing */}
        <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400">
          <span>Game:</span>
          <span className="text-slate-200 font-bold">{server.port}</span>
          <span className="text-slate-600">|</span>
          <span>Query:</span>
          <span className="text-slate-200 font-bold">{server.queryPort}</span>
        </div>
      </div>

      {/* Center / Right: Timers & Stats */}
      <div className="flex items-center gap-3">
        {/* Server Uptime */}
        <div className="flex items-center gap-1.5" title="Время непрерывной работы активного сервера">
          <Clock className="w-3 h-3 text-[#00f0ff]" />
          <span className="text-slate-400 hidden sm:inline">Аптайм:</span>
          <span className="font-bold text-white tracking-wider font-mono">
            {formatTime(uptimeSeconds)}
          </span>
        </div>

        <div className="h-3 w-px bg-cyan-500/20" />

        {/* AutoSave Timer */}
        <div className="flex items-center gap-1.5" title="Таймер следующего автоматического сохранения карты (server.save)">
          <Save className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-400 hidden sm:inline">Автосохранение:</span>
          <span className={`font-bold font-mono ${autoSaveTimer <= 30 ? 'text-amber-400 animate-pulse' : 'text-slate-200'}`}>
            {formatMinutesSeconds(autoSaveTimer)}
          </span>
        </div>

        <div className="h-3 w-px bg-cyan-500/20 hidden lg:block" />

        {/* Theme badge */}
        <div className="hidden lg:flex items-center gap-1 text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
          <Sparkles className="w-3 h-3 text-[#00f0ff]" />
          <span>COBALT v2.0</span>
        </div>
      </div>
    </footer>
  );
};
