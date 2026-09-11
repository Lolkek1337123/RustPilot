import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Check } from 'lucide-react';
import { CpuTopologyInfo, CpuCoreInfo } from '../../types';

interface CpuCoreMatrixProps {
  currentServerPath?: string;
  affinityMode: 'auto' | 'all' | 'custom';
  affinityMask?: number;
  onAffinityChange?: (mode: 'auto' | 'all' | 'custom', mask: number) => void;
  readOnly?: boolean;
}

export const CpuCoreMatrix: React.FC<CpuCoreMatrixProps> = ({
  currentServerPath,
  affinityMode,
  affinityMask = 15,
  onAffinityChange,
  readOnly = false
}) => {
  const [topology, setTopology] = useState<CpuTopologyInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredCore, setHoveredCore] = useState<CpuCoreInfo | null>(null);

  const fetchTopology = async () => {
    try {
      const api = (window as any).electronAPI;
      if (api?.getCpuTopology) {
        const data: CpuTopologyInfo = await api.getCpuTopology();
        setTopology(data);
      }
    } catch (e) {
      console.error('Failed to get CPU topology:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
    const timer = setInterval(fetchTopology, 3500);
    return () => clearInterval(timer);
  }, [currentServerPath]);

  // Check if a specific core index is active for THIS server given the mode & mask
  const isCoreSelected = (coreIndex: number): boolean => {
    if (affinityMode === 'all') return true;
    if (affinityMode === 'custom') {
      const maskBig = BigInt(affinityMask);
      return (maskBig & (1n << BigInt(coreIndex))) !== 0n;
    }
    // 'auto' mode: check if topology shows this core allocated to current server
    if (topology && currentServerPath) {
      const core = topology.cores[coreIndex];
      return core?.isAllocated === true && core?.serverPath === currentServerPath;
    }
    return coreIndex < 4; // fallback first 4 cores
  };

  const handleToggleCore = (coreIndex: number) => {
    if (readOnly || !onAffinityChange) return;

    let currentMaskBig = BigInt(affinityMask);
    const bit = 1n << BigInt(coreIndex);

    if ((currentMaskBig & bit) !== 0n) {
      // Turn off
      currentMaskBig &= ~bit;
    } else {
      // Turn on
      currentMaskBig |= bit;
    }

    const newMask = Number(currentMaskBig);
    onAffinityChange('custom', newMask === 0 ? 1 : newMask);
  };

  const applyPreset = (coresCount: number, startFrom = 0) => {
    if (readOnly || !onAffinityChange || !topology) return;
    let maskBig = 0n;
    const end = Math.min(topology.totalCores, startFrom + coresCount);
    for (let i = startFrom; i < end; i++) {
      maskBig |= (1n << BigInt(i));
    }
    onAffinityChange('custom', Number(maskBig));
  };

  if (loading && !topology) {
    return (
      <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
        <span>Определение топологии процессора...</span>
      </div>
    );
  }

  const totalCores = topology?.totalCores || 8;
  const isHybrid = topology?.isHybrid || false;
  const vendor = topology?.vendor || 'unknown';
  const model = topology?.model || 'Процессор';

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#0e131f] to-[#0a0d14] border border-cyan-500/20 p-4 space-y-4 shadow-xl">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-[#00f0ff]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-['Outfit'] tracking-wide">
                {model}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                vendor === 'amd'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : vendor === 'intel'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-700/50 text-slate-300'
              }`}>
                {vendor === 'amd' ? 'AMD Zen' : vendor === 'intel' ? (isHybrid ? 'Intel Hybrid (P/E)' : 'Intel Core') : 'CPU'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Всего логических потоков: <span className="font-mono text-cyan-300 font-bold">{totalCores}</span>
              {isHybrid && ' • P-Cores (0-15 HT) + E-Cores (16+)'}
            </p>
          </div>
        </div>

        {/* Current Mask & Mode Badge */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-cyan-500/20 font-mono text-[11px] text-cyan-400">
            {affinityMode === 'all'
              ? 'Маска: ALL'
              : `Маска: 0x${(affinityMask || 0).toString(16).toUpperCase()}`}
          </div>
          <button
            type="button"
            onClick={fetchTopology}
            title="Обновить топологию"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Preset Buttons (if Custom Mode & not readOnly) */}
      {!readOnly && onAffinityChange && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Быстрый выбор:
          </span>

          <button
            type="button"
            onClick={() => onAffinityChange('auto', affinityMask)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              affinityMode === 'auto'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : 'bg-white/[0.04] text-slate-300 hover:bg-cyan-500/10 hover:text-white border border-white/[0.08]'
            }`}
          >
            ⚡ Авто-изоляция
          </button>

          <button
            type="button"
            onClick={() => onAffinityChange('all', -1)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              affinityMode === 'all'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : 'bg-white/[0.04] text-slate-300 hover:bg-cyan-500/10 hover:text-white border border-white/[0.08]'
            }`}
          >
            🌐 Все ядра
          </button>

          {isHybrid && (
            <button
              type="button"
              onClick={() => applyPreset(16, 0)}
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/[0.04] text-amber-300 hover:bg-amber-500/15 hover:text-amber-200 border border-amber-500/30 transition-all cursor-pointer"
            >
              🔥 Только P-ядра (0-15)
            </button>
          )}

          <button
            type="button"
            onClick={() => applyPreset(4, 0)}
            className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/[0.04] text-slate-300 hover:bg-cyan-500/10 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
          >
            Первые 4 ядра
          </button>

          <button
            type="button"
            onClick={() => applyPreset(8, 0)}
            className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/[0.04] text-slate-300 hover:bg-cyan-500/10 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
          >
            Первые 8 ядер
          </button>

          {affinityMode === 'custom' && (
            <button
              type="button"
              onClick={() => applyPreset(1, 0)}
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/[0.04] text-red-400 hover:bg-red-500/15 hover:text-red-300 border border-red-500/30 transition-all cursor-pointer"
            >
              Сбросить
            </button>
          )}
        </div>
      )}

      {/* Grid of Logical Cores */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Интерактивная сетка потоков ЦП {!readOnly && '(Кликните для выбора)'}</span>
          <span className="font-mono text-cyan-400 text-[10px]">
            {affinityMode === 'custom' ? 'Ручной режим выбора' : affinityMode === 'auto' ? 'Автоматический режим' : 'Все ядра'}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-1.5">
          {topology?.cores.map((core) => {
            const isSelected = isCoreSelected(core.index);
            const isAllocatedToOther =
              core.isAllocated && core.serverPath && core.serverPath !== currentServerPath;

            return (
              <div
                key={core.index}
                onClick={() => {
                  if (!readOnly && onAffinityChange) {
                    if (affinityMode !== 'custom') {
                      onAffinityChange('custom', affinityMask);
                    }
                    handleToggleCore(core.index);
                  }
                }}
                onMouseEnter={() => setHoveredCore(core)}
                onMouseLeave={() => setHoveredCore(null)}
                className={`group relative p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all select-none cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 border-[#00f0ff] shadow-sm shadow-cyan-500/30 text-white'
                    : isAllocatedToOther
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 opacity-70'
                    : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-cyan-500/40 hover:bg-white/[0.06]'
                }`}
              >
                {/* Core Index */}
                <span className="font-mono text-[11px] font-black">
                  #{core.index}
                </span>

                {/* Core Type Badge */}
                <span className={`text-[8px] font-black px-1 rounded uppercase leading-tight ${
                  core.type === 'P'
                    ? 'bg-amber-500/30 text-amber-300'
                    : core.type === 'E'
                    ? 'bg-blue-500/30 text-blue-300'
                    : core.type === 'Zen'
                    ? 'bg-red-500/30 text-red-300'
                    : 'bg-slate-700/50 text-slate-300'
                }`}>
                  {core.type}
                </span>

                {/* Indicator dot if in use */}
                {isSelected ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] shadow-sm shadow-cyan-300 mt-0.5" />
                ) : isAllocatedToOther ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-transparent mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hovered Core Info Banner */}
      {hoveredCore && (
        <div className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-cyan-300">
              Ядро #{hoveredCore.index}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">
              Тип: {hoveredCore.type === 'P' ? 'P-Core (Высокая производительность)' : hoveredCore.type === 'E' ? 'E-Core (Энергоэффективное ядро)' : hoveredCore.type === 'Zen' ? 'AMD Zen Core' : 'Стандартное ядро ЦП'}
            </span>
          </div>

          <div className="text-[11px]">
            {isCoreSelected(hoveredCore.index) ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Выделено этому серверу
              </span>
            ) : hoveredCore.isAllocated && hoveredCore.serverName ? (
              <span className="text-amber-400 font-semibold">
                Занято сервером: "{hoveredCore.serverName}"
              </span>
            ) : (
              <span className="text-slate-400">Свободно для распределения</span>
            )}
          </div>
        </div>
      )}

      {/* Matrix Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 pt-1 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-cyan-500/40 border border-[#00f0ff]" />
          <span>Выделено этому серверу</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40" />
          <span>Занято другим сервером</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-white/[0.04] border border-white/[0.1]" />
          <span>Свободно</span>
        </div>
        {isHybrid && (
          <>
            <div className="flex items-center gap-1">
              <span className="px-1 py-0.5 rounded text-[8px] font-black bg-amber-500/30 text-amber-300">P</span>
              <span>Performance Core</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1 py-0.5 rounded text-[8px] font-black bg-blue-500/30 text-blue-300">E</span>
              <span>Efficient Core</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
