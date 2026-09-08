import React, { useState, useEffect } from 'react';
import { X, Package, Shield, Trash2, Plus, Gift, CheckCircle2 } from 'lucide-react';
import { Player } from '../../types';

interface PlayerInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  serverPath: string;
  onExecuteCommand: (cmd: string) => void;
}

interface InventoryData {
  steamId: string;
  main: { slot: number; name: string; displayName: string; amount: number }[];
  belt: { slot: number; name: string; displayName: string; amount: number }[];
  wear: { slot: number; name: string; displayName: string; amount: number }[];
}

export const PlayerInventoryModal: React.FC<PlayerInventoryModalProps> = ({
  isOpen,
  onClose,
  player,
  serverPath,
  onExecuteCommand
}) => {
  const [invData, setInvData] = useState<InventoryData | null>(null);
  const [giveItemName, setGiveItemName] = useState('rifle.ak');
  const [giveItemAmount, setGiveItemAmount] = useState(1);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const steamId = player?.SteamID || player?.steamId || '';
  const displayName = player?.DisplayName || player?.displayName || 'Игрок';

  useEffect(() => {
    if (!isOpen || !steamId) return;

    const loadInv = async () => {
      try {
        const data = await (window as any).electronAPI?.getPlayerInventory(serverPath, steamId);
        if (data) setInvData(data);
      } catch {}
    };

    loadInv();
  }, [isOpen, steamId, serverPath]);

  if (!isOpen || !player) return null;

  const handleClearInventory = () => {
    if (!confirm(`Очистить весь инвентарь игрока ${displayName}?`)) return;
    onExecuteCommand(`inventory.clear ${steamId}`);
    setActionNotice('Инвентарь игрока успешно очищен!');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleGiveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giveItemName.trim()) return;

    onExecuteCommand(`inventory.give ${steamId} ${giveItemName.trim()} ${giveItemAmount}`);
    setActionNotice(`Выдано ${giveItemAmount}x ${giveItemName} игроку ${displayName}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#00f0ff]" />
            <div>
              <span className="font-bold text-white text-sm">Инвентарь игрока: {displayName}</span>
              <span className="text-[10px] text-[#94a3b8] font-mono block">{steamId}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {actionNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Item Quick Presets Chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center justify-between">
              <span>Быстрые пресеты предметов:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'AK-47', code: 'rifle.ak', count: 1 },
                { name: 'L96 Sniper', code: 'rifle.l96', count: 1 },
                { name: 'Metal Mask', code: 'metal.facemask', count: 1 },
                { name: 'Metal Chest', code: 'metal.plate.torso', count: 1 },
                { name: 'Syringe x10', code: 'syringe.medical', count: 10 },
                { name: 'C4 x5', code: 'explosive.timed', count: 5 },
                { name: 'Rocket x10', code: 'ammo.rocket.basic', count: 10 },
                { name: 'Scrap x1000', code: 'scrap', count: 1000 },
                { name: 'Wood x10k', code: 'wood', count: 10000 },
                { name: 'Metal x10k', code: 'metal.refined', count: 1000 }
              ].map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    setGiveItemName(p.code);
                    setGiveItemAmount(p.count);
                    onExecuteCommand(`inventory.give ${steamId} ${p.code} ${p.count}`);
                    setActionNotice(`Выдано ${p.count}x ${p.name} игроку ${displayName}`);
                    setTimeout(() => setActionNotice(null), 3000);
                  }}
                  className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-[10px] font-bold text-slate-200 hover:text-[#00f0ff] transition-all cursor-pointer"
                >
                  +{p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Give Form */}
          <form onSubmit={handleGiveItem} className="p-3 rounded-xl bg-[#050811] border border-cyan-500/20 flex items-center gap-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 shrink-0">
              <Gift className="w-4 h-4 text-[#00f0ff]" />
              <span>Кастомная выдача:</span>
            </div>
            <input
              type="text"
              value={giveItemName}
              onChange={(e) => setGiveItemName(e.target.value)}
              placeholder="shortname (rifle.ak, wood...)"
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#0a1122] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
            />
            <input
              type="number"
              value={giveItemAmount}
              onChange={(e) => setGiveItemAmount(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1.5 rounded-xl bg-[#0a1122] border border-cyan-500/20 text-xs text-white font-mono text-center focus:outline-none focus:border-[#00f0ff]"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md shrink-0 border border-cyan-300/30 cursor-pointer"
            >
              Выдать
            </button>
          </form>

          {/* Armor & Clothing Slots (7 slots) */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#00f0ff]" />
              <span>Броня и Одежда (Wear)</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {(invData?.wear || Array.from({ length: 7 }).map((_, i) => ({ slot: i, name: '', displayName: 'Пусто', amount: 0 }))).map((slot) => (
                <div
                  key={slot.slot}
                  className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all ${
                    slot.amount > 0
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                      : 'bg-black/30 border-cyan-500/10 text-slate-600'
                  }`}
                >
                  <div className="text-[10px] font-bold truncate max-w-full">{slot.displayName}</div>
                  {slot.amount > 1 && <div className="text-[9px] font-mono font-bold text-[#00f0ff]">x{slot.amount}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Main Inventory Slots (24 slots) */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1">
              <Package className="w-3 h-3 text-amber-400" />
              <span>Основной рюкзак (Main 24 слота)</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {(invData?.main || Array.from({ length: 24 }).map((_, i) => ({ slot: i, name: '', displayName: 'Пусто', amount: 0 }))).map((slot) => (
                <div
                  key={slot.slot}
                  className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all ${
                    slot.amount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-white'
                      : 'bg-black/30 border-cyan-500/10 text-slate-600'
                  }`}
                >
                  <div className="text-[10px] font-bold truncate max-w-full">{slot.displayName}</div>
                  {slot.amount > 1 && <div className="text-[9px] font-mono font-bold text-amber-400">x{slot.amount}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Belt Quick Slots (6 slots) */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1">
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>Быстрый слот (Belt 6 слотов)</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {(invData?.belt || Array.from({ length: 6 }).map((_, i) => ({ slot: i, name: '', displayName: 'Пусто', amount: 0 }))).map((slot) => (
                <div
                  key={slot.slot}
                  className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all ${
                    slot.amount > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-black/30 border-cyan-500/10 text-slate-600'
                  }`}
                >
                  <div className="text-[10px] font-bold truncate max-w-full">{slot.displayName}</div>
                  {slot.amount > 1 && <div className="text-[9px] font-mono font-bold text-emerald-400">x{slot.amount}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Danger Actions */}
        <div className="p-4 border-t border-cyan-500/20 bg-cyan-500/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onExecuteCommand(`kill ${steamId}`);
                setActionNotice(`Отправлена команда: kill ${steamId}`);
              }}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition-all cursor-pointer"
            >
              💀 Убить
            </button>
            <button
              onClick={() => {
                onExecuteCommand(`freeze ${steamId}`);
                setActionNotice(`Отправлена команда: freeze ${steamId}`);
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all cursor-pointer"
            >
              ❄️ Заморозить
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearInventory}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить инвентарь</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
