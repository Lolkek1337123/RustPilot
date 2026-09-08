import React, { useState, useEffect } from 'react';
import { Ban, ShieldCheck, Trash2, Search, CheckCircle2, UserX } from 'lucide-react';

interface BansTabProps {
  serverPath: string;
  onExecuteCommand: (cmd: string) => void;
}

interface BanRecord {
  steamId: string;
  username: string;
  reason: string;
}

export const BansTab: React.FC<BansTabProps> = ({ serverPath, onExecuteCommand }) => {
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadBans = async () => {
    try {
      const list = await (window as any).electronAPI?.getBansList(serverPath);
      if (Array.isArray(list)) {
        setBans(list);
      }
    } catch {}
  };

  useEffect(() => {
    loadBans();
  }, [serverPath]);

  const handleUnban = async (steamId: string, username: string) => {
    try {
      await (window as any).electronAPI?.unbanPlayer(serverPath, steamId);
      setActionNotice(`Игрок ${username} (${steamId}) успешно разбанен!`);
      setBans((prev) => prev.filter((b) => b.steamId !== steamId));
    } catch {}
    setTimeout(() => setActionNotice(null), 3000);
  };

  const filteredBans = bans.filter(
    (b) =>
      b.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.steamId.includes(searchQuery) ||
      b.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col space-y-4 p-4 select-none bg-[#050811]">
      {/* Search Header */}
      <div className="flex items-center justify-between gap-3 bg-[#0a1122] p-3 rounded-2xl border border-cyan-500/20">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по нику, SteamID или причине бана..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
          />
        </div>

        <div className="text-xs font-bold text-[#94a3b8]">
          Всего забанено: <span className="text-red-400 font-mono">{bans.length}</span>
        </div>
      </div>

      {actionNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Bans Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-cyan-500/20 bg-[#0a1122]">
        {filteredBans.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
            <UserX className="w-10 h-10 text-slate-600" />
            <div className="text-sm font-bold text-white">Список банов пуст</div>
            <p className="text-xs text-[#94a3b8]">На этом сервере нет активных заблокированных игроков.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-cyan-500/20 bg-cyan-500/5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-bold">
                <th className="p-3">Игрок / Никнейм</th>
                <th className="p-3">SteamID 64</th>
                <th className="p-3">Причина блокировки</th>
                <th className="p-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10 text-xs">
              {filteredBans.map((ban) => (
                <tr key={ban.steamId} className="hover:bg-cyan-500/[0.04] transition-colors">
                  <td className="p-3 font-bold text-white">{ban.username || 'Неизвестно'}</td>
                  <td className="p-3 font-mono text-cyan-300">{ban.steamId}</td>
                  <td className="p-3 text-red-300">{ban.reason || 'Заблокирован администратором'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleUnban(ban.steamId, ban.username)}
                      className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Разбанить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
