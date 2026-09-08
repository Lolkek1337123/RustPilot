import React from 'react';
import {
  Zap,
  Cpu,
  HardDrive,
  Users,
  Box,
  ArrowDownRight,
  ArrowUpRight,
  Activity
} from 'lucide-react';
import { ServerTelemetry, TelemetryPoint } from '../../types';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface TelemetryChartsProps {
  telemetry: ServerTelemetry;
  isRunning: boolean;
  history: TelemetryPoint[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  telemetry,
  isRunning,
  history
}) => {
  const renderSparkline = (
    data: number[],
    minVal: number,
    maxVal: number,
    color: string,
    fillGradientId: string
  ) => {
    const width = 120;
    const height = 24;

    if (!data || data.length < 2) {
      return (
        <div className="h-6 w-full flex items-center justify-center opacity-25">
          <svg className="w-full h-4" viewBox={`0 0 ${width} 4`}>
            <line x1="0" y1="2" x2={width} y2="2" stroke={color} strokeWidth="1.5" strokeDasharray="3" />
          </svg>
        </div>
      );
    }

    const range = Math.max(1, maxVal - minVal);
    const stepX = width / (data.length - 1);

    const points = data.map((val, idx) => {
      const clamped = Math.max(minVal, Math.min(maxVal, val));
      const normalizedY = height - ((clamped - minVal) / range) * (height - 6) - 3;
      return `${idx * stepX},${normalizedY}`;
    });

    const lastVal = data[data.length - 1] ?? minVal;
    const lastClamped = Math.max(minVal, Math.min(maxVal, lastVal));
    const lastY = height - ((lastClamped - minVal) / range) * (height - 6) - 3;
    const lastX = width;

    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

    return (
      <svg className="w-full h-6 overflow-visible drop-shadow-[0_0_8px_rgba(0,240,255,0.25)]" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.38" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
          <filter id={`glow-${fillGradientId}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor={color} floodOpacity="0.8" />
          </filter>
        </defs>
        <path d={areaPath} fill={`url(#${fillGradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${fillGradientId})`} />

        {/* Dynamic Beacon Ring on current active telemetry point */}
        {isRunning && (
          <g transform={`translate(${lastX}, ${lastY})`}>
            <circle r="5" fill={color} fillOpacity="0.3" className="telemetry-beacon" />
            <circle r="2.2" fill={color} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
      </svg>
    );
  };

  const fpsHistory = history.map((h) => h.fps);
  const cpuHistory = history.map((h) => h.cpu);
  const ramHistory = history.map((h) => h.ramMb / 1024);
  const entitiesHistory = history.map((h) => h.entities);
  const playersHistory = history.map((h) => h.players);
  const netInHistory = history.map((h) => h.netInKb);
  const netOutHistory = history.map((h) => h.netOutKb);
  const pingHistory = history.map((h) => (telemetry.ping > 0 ? telemetry.ping : 0));

  const hasRcon = telemetry.fps > 0 && telemetry.ping > 0;
  const ramGb = telemetry.memoryMb > 0 ? telemetry.memoryMb / 1024 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {/* ── CARD 1: Server FPS (Tickrate) ── */}
      <div className="p-3 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/50 stagger-item stagger-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">FPS Сервера</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/30 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-1">
          {hasRcon ? (
            <div className="flex items-baseline gap-1">
              <AnimatedNumber
                value={telemetry.fps}
                decimals={0}
                className={`text-xl font-black font-mono tracking-tight ${telemetry.fps >= 50 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : telemetry.fps >= 25 ? 'text-amber-400' : 'text-rose-400'}`}
              />
              <span className="text-[10px] text-slate-500 font-mono">fps</span>
            </div>
          ) : isRunning ? (
            <span className="text-xs font-bold text-cyan-300 font-mono animate-pulse">Синхронизация...</span>
          ) : (
            <span className="text-xl font-bold text-slate-600 font-mono">0</span>
          )}
        </div>
        <div className="mb-1">
          {renderSparkline(fpsHistory, 0, 100, '#10b981', 'sparkFps')}
        </div>
        <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Тикрейт</span>
          <span className="text-emerald-400 font-semibold">{isRunning ? '256 Hz' : 'Выкл'}</span>
        </div>
      </div>

      {/* ── CARD 2: CPU Usage ── */}
      <div className="p-3 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between group hover:border-cyan-400/50 stagger-item stagger-2">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">CPU Сервера</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-[#00f0ff] shrink-0 border border-cyan-500/30 group-hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] transition-all">
            <Cpu className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-1">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={telemetry.cpuPercent || 0}
              decimals={1}
              className={`text-xl font-black font-mono tracking-tight ${(telemetry.cpuPercent || 0) >= 80 ? 'text-rose-400' : (telemetry.cpuPercent || 0) >= 50 ? 'text-amber-400' : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]'}`}
            />
            <span className="text-[10px] text-slate-500 font-mono">%</span>
          </div>
        </div>
        <div className="mb-1">
          {renderSparkline(cpuHistory, 0, 100, '#00f0ff', 'sparkCpu')}
        </div>
        <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Ядра CPU</span>
          <span className="text-cyan-300">Нагрузка</span>
        </div>
      </div>

      {/* ── CARD 3: RAM Memory ── */}
      <div className="p-3 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between group hover:border-blue-400/50 stagger-item stagger-3">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">RAM Сервера</span>
          <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 shrink-0 border border-blue-500/30 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all">
            <HardDrive className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-1">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={ramGb}
              decimals={2}
              className="text-xl font-black text-blue-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]"
            />
            <span className="text-[10px] text-slate-500 font-mono">GB</span>
          </div>
        </div>
        <div className="mb-1">
          {renderSparkline(ramHistory, 0, 16, '#3b82f6', 'sparkRam')}
        </div>
        <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Память</span>
          <span className="text-slate-400">{telemetry.memoryMb} MB</span>
        </div>
      </div>

      {/* ── CARD 4: World Entities ── */}
      <div className="p-3 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between group hover:border-purple-400/50 stagger-item stagger-4">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">Сущности (ENT)</span>
          <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 shrink-0 border border-purple-500/30 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all">
            <Box className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-1">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={telemetry.entities || 0}
              decimals={0}
              className="text-xl font-black text-purple-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
            />
          </div>
        </div>
        <div className="mb-1">
          {renderSparkline(entitiesHistory, 0, 150000, '#a855f7', 'sparkEnt')}
        </div>
        <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Объекты</span>
          <span className="text-purple-300 font-medium">Procedural</span>
        </div>
      </div>

      {/* ── CARD 5: Online Players ── */}
      <div className="p-3 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between group hover:border-cyan-400/50 stagger-item stagger-5">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">Игроки Онлайн</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-[#00f0ff] shrink-0 border border-cyan-500/30 group-hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] transition-all">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-1">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={telemetry.players || 0}
              decimals={0}
              className="text-xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            />
            <span className="text-[10px] text-slate-400 font-mono">/ {telemetry.maxPlayers || 50}</span>
          </div>
        </div>
        <div className="mb-1">
          {renderSparkline(playersHistory, 0, telemetry.maxPlayers || 50, '#38bdf8', 'sparkPlayers')}
        </div>
        <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Слоты</span>
          <span className="text-emerald-400 font-bold">{telemetry.players > 0 ? `${telemetry.players} активны` : 'Пусто'}</span>
        </div>
      </div>

      {/* ── CARD 6: Network In (Traffic) ── */}
      <div className="p-3 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between group hover:border-emerald-400/50 stagger-item stagger-6">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">Входящий (NET IN)</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/30 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all">
            <ArrowDownRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-1">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={telemetry.networkInKb || 0}
              decimals={0}
              className="text-xl font-black text-emerald-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            />
            <span className="text-[10px] text-slate-500 font-mono">KB/s</span>
          </div>
        </div>
        <div className="mb-1">
          {renderSparkline(netInHistory, 0, 500, '#10b981', 'sparkNetIn')}
        </div>
        <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Трафик</span>
          <span className="text-emerald-300">Вход</span>
        </div>
      </div>

      {/* ── CARD 7: Network Out (Traffic) ── */}
      <div className="p-3 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between group hover:border-blue-400/50 stagger-item stagger-7">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">Исходящий (NET OUT)</span>
          <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 shrink-0 border border-blue-500/30 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-1">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={telemetry.networkOutKb || 0}
              decimals={0}
              className="text-xl font-black text-blue-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
            />
            <span className="text-[10px] text-slate-500 font-mono">KB/s</span>
          </div>
        </div>
        <div className="mb-1">
          {renderSparkline(netOutHistory, 0, 1000, '#3b82f6', 'sparkNetOut')}
        </div>
        <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Синхронизация</span>
          <span className="text-blue-300">Выход</span>
        </div>
      </div>

      {/* ── CARD 8: RCON Ping (Latency) ── */}
      <div className="p-3 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between group hover:border-cyan-400/50 stagger-item stagger-8">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">RCON Ping</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-[#00f0ff] shrink-0 border border-cyan-500/30 group-hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] transition-all">
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-1">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={telemetry.ping || 0}
              decimals={0}
              className={`text-xl font-black font-mono tracking-tight ${telemetry.ping > 0 && telemetry.ping <= 20 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : telemetry.ping > 20 ? 'text-amber-400' : 'text-slate-500'}`}
            />
            <span className="text-[10px] text-slate-500 font-mono">ms</span>
          </div>
        </div>
        <div className="mb-1">
          {renderSparkline(pingHistory, 0, 100, '#00f0ff', 'sparkPing')}
        </div>
        <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Задержка</span>
          <span className={telemetry.ping > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{telemetry.ping > 0 ? 'Подключен' : 'Ожидание'}</span>
        </div>
      </div>
    </div>
  );
};
