import React, { useState } from 'react';
import {
  Users,
  ShieldAlert,
  UserX,
  VolumeX,
  Gift,
  Search,
  RefreshCw,
  Package,
  Ban,
  FlaskConical
} from 'lucide-react';
import { Player } from '../../types';
import { PlayerInventoryModal } from './PlayerInventoryModal';
import { BansTab } from './BansTab';

interface PlayersViewProps {
  players: Player[];
  serverPath: string;
  onRefresh: () => void;
  onKick: (steamId: string, reason: string) => void;
  onBan: (steamId: string, reason: string) => void;
  onMute: (steamId: string) => void;
  onGiveItem: (steamId: string, item: string, amount: number) => void;
  onExecuteCommand?: (cmd: string) => void;
}

export const PlayersView: React.FC<PlayersViewProps> = ({
  players,
  serverPath,
  onRefresh,
  onKick,
  onBan,
  onMute,
  onGiveItem,
  onExecuteCommand = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'bans'>('online');
  const [search, setSearch] = useState('');
  const [selectedInventoryPlayer, setSelectedInventoryPlayer] = useState<Player | null>(null);
  const [selectedGivePlayer, setSelectedGivePlayer] = useState<Player | null>(null);
  const [giveItemName, setGiveItemName] = useState('rifle.ak');
  const [giveItemAmount, setGiveItemAmount] = useState(1);

  const filteredPlayers = players.filter((p) => {
    const name = p.DisplayName || p.displayName || '';
    const sid = p.SteamID || p.steamId || '';
    return name.toLowerCase().includes(search.toLowerCase()) || sid.includes(search);
  });

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 overflow-hidden select-none bg-[#050811]">
      {/* Top Header & Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'online'
                ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 shadow-md'
                : 'bg-cyan-500/5 text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Онлайн Игроки ({players.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bans')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bans'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-md'
                : 'bg-cyan-500/5 text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
            }`}
          >
            <Ban className="w-3.5 h-3.5 text-red-400" />
            <span>Бан-лист (bans.cfg)</span>
          </button>
        </div>

        {activeTab === 'online' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по нику или SteamID..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-[#0a1122] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
              />
            </div>

            <button
              onClick={onRefresh}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-white border border-cyan-500/20 transition-all cursor-pointer"
              title="Обновить список"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Обновить</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'bans' ? (
        <div className="flex-1 overflow-hidden">
          <BansTab serverPath={serverPath} onExecuteCommand={onExecuteCommand} />
        </div>
      ) : (
        <div className="flex-1 rounded-2xl glass-panel border border-cyan-500/20 overflow-hidden flex flex-col bg-[#0a1122]/90">
          <div className="px-6 py-3 border-b border-cyan-500/20 bg-cyan-500/5 grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
            <div className="col-span-4">Игрок / Никнейм</div>
            <div className="col-span-3">SteamID 64</div>
            <div className="col-span-2">Пинг / IP</div>
            <div className="col-span-1">Здоровье</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-cyan-500/10">
            {filteredPlayers.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Users className="w-8 h-8 opacity-40" />
                <span className="text-xs">На сервере сейчас нет подключенных игроков</span>
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const sid = player.SteamID || player.steamId || '';
                const name = player.DisplayName || player.displayName || 'Player';
                const ping = player.Ping || 0;
                const addr = player.Address || '127.0.0.1';
                const health = player.Health || 100;

                return (
                  <div
                    key={sid}
                    className="px-6 py-3 grid grid-cols-12 items-center hover:bg-cyan-500/[0.04] transition-colors"
                  >
                    {/* Avatar & Name */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={player.AvatarUrl || 'https://files.facepunch.com/steam/profiles/0.png'}
                          alt={name}
                          className={`w-9 h-9 rounded-xl bg-black/40 border-2 object-cover transition-all ${
                            ping < 50
                              ? 'border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                              : ping < 120
                              ? 'border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                              : 'border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                          }`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://files.facepunch.com/steam/profiles/0.png';
                          }}
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                            ping < 50 ? 'bg-emerald-400 animate-pulse' : ping < 120 ? 'bg-amber-400' : 'bg-rose-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{name}</div>
                        <div className="text-[10px] text-[#94a3b8] font-mono">
                          В игре: {Math.floor((player.ConnectedSeconds || 0) / 60)} мин.
                        </div>
                      </div>
                    </div>

                    {/* SteamID */}
                    <div className="col-span-3 text-xs font-mono text-cyan-300">{sid}</div>

                    {/* Ping / IP */}
                    <div className="col-span-2 text-xs font-mono text-slate-400">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          ping < 50
                            ? 'text-emerald-400'
                            : ping < 120
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ping < 50 ? 'bg-emerald-400 animate-ping' : ping < 120 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                        {ping} ms
                      </span>
                      <span className="text-[10px] text-slate-500 block">{addr}</span>
                    </div>

                    {/* Health */}
                    <div className="col-span-1 text-xs font-mono text-emerald-400 font-semibold">
                      {health} HP
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {/* Inventory Button */}
                      <button
                        onClick={() => setSelectedInventoryPlayer(player)}
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] transition-colors cursor-pointer"
                        title="Инвентарь игрока"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>

                      {/* Give Item */}
                      <button
                        onClick={() => setSelectedGivePlayer(player)}
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#38bdf8] transition-colors cursor-pointer"
                        title="Выдать предмет"
                      >
                        <Gift className="w-3.5 h-3.5" />
                      </button>

                      {/* Mute */}
                      <button
                        onClick={() => onMute(sid)}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors cursor-pointer"
                        title="Замутить чат"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                      </button>

                      {/* Kick */}
                      <button
                        onClick={() => {
                          const reason = prompt('Причина кика:', 'Нарушение правил');
                          if (reason) onKick(sid, reason);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                        title="Кикнуть"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>

                      {/* Ban */}
                      <button
                        onClick={() => {
                          const reason = prompt('Причина бана:', 'Запрещенный софт / Читы');
                          if (reason) onBan(sid, reason);
                        }}
                        className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors cursor-pointer"
                        title="Забанить"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Player Inventory Modal */}
      {selectedInventoryPlayer && (
        <PlayerInventoryModal
          isOpen={!!selectedInventoryPlayer}
          onClose={() => setSelectedInventoryPlayer(null)}
          player={selectedInventoryPlayer}
          serverPath={serverPath}
          onExecuteCommand={onExecuteCommand}
        />
      )}

      {/* Quick Give Item Modal */}
      {selectedGivePlayer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl glass-panel p-6 border border-cyan-500/30 bg-[#0a1122] space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#00f0ff]" />
              <span>Выдать предмет игроку {selectedGivePlayer.DisplayName || selectedGivePlayer.displayName}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Название предмета (Shortname):</label>
                <input
                  type="text"
                  value={giveItemName}
                  onChange={(e) => setGiveItemName(e.target.value)}
                  placeholder="wood, scrap, rifle.ak, sulfur..."
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Количество:</label>
                <input
                  type="number"
                  value={giveItemAmount}
                  onChange={(e) => setGiveItemAmount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedGivePlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const sid = selectedGivePlayer.SteamID || selectedGivePlayer.steamId || '';
                  onGiveItem(sid, giveItemName, giveItemAmount);
                  setSelectedGivePlayer(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-lg shadow-cyan-950/40 transition-all border border-cyan-300/30 cursor-pointer"
              >
                Выдать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
