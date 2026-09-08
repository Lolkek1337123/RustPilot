import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Check,
  X,
  Plus,
  Trash2,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ModFramework } from '../../types';

interface PermissionsTabProps {
  serverPath: string;
  framework: ModFramework;
}

interface PermissionItem {
  name: string;
  description: string;
  plugin: string;
}

const DEFAULT_PERMISSIONS: PermissionItem[] = [
  { name: 'kits.use', plugin: 'Kits', description: 'Доступ к наборам предметов /kit' },
  { name: 'kits.vip', plugin: 'Kits', description: 'Доступ к VIP наборам' },
  { name: 'kits.admin', plugin: 'Kits', description: 'Создание и редактирование наборов /kit add' },
  { name: 'bgrade.use', plugin: 'BuildingGrades', description: 'Авто-апгрейд построек при строительстве /bgrade' },
  { name: 'removertool.use', plugin: 'RemoverTool', description: 'Удаление собственных построек /remove' },
  { name: 'removertool.admin', plugin: 'RemoverTool', description: 'Удаление любых построек на карте' },
  { name: 'autocodelock.use', plugin: 'AutoCodeLock', description: 'Автоматический ввод кода на замки' },
  { name: 'clans.use', plugin: 'Clans', description: 'Создание и управление кланами /clan' },
  { name: 'betterchat.vip', plugin: 'BetterChat', description: 'VIP префикс и цветной ник в чате' },
  { name: 'betterchat.admin', plugin: 'BetterChat', description: 'Админский тег [ADMIN] в чате' },
  { name: 'vanish.allow', plugin: 'Vanish', description: 'Полная невидимость для админов /vanish' },
  { name: 'noclip.toggle', plugin: 'Noclip', description: 'Полёт сквозь стены и текстуры' },
  { name: 'tp.use', plugin: 'Teleportation', description: 'Телепортация к друзьям /tpr /tpa' },
  { name: 'tp.admin', plugin: 'Teleportation', description: 'Админская мгновенная телепортация' },
  { name: 'backpacks.use', plugin: 'Backpacks', description: 'Дополнительный рюкзак игрока /backpack' },
  { name: 'trade.use', plugin: 'Trade', description: 'Безопасный обмен предметами /trade' },
  { name: 'skipnight.vote', plugin: 'SkipNight', description: 'Голосование за пропуск ночи' },
  { name: 'hitmarker.use', plugin: 'HitMarker', description: 'Визуальный хитмаркер попаданий' }
];

export const PermissionsTab: React.FC<PermissionsTabProps> = ({
  serverPath,
  framework
}) => {
  const [groups, setGroups] = useState<string[]>(['default', 'vip', 'premium', 'admin']);
  const [permissions, setPermissions] = useState<PermissionItem[]>(DEFAULT_PERMISSIONS);
  const [newPermName, setNewPermName] = useState<string>('');
  const [newPermPlugin, setNewPermPlugin] = useState<string>('');
  const [isAddingPerm, setIsAddingPerm] = useState<boolean>(false);
  const [grantedMatrix, setGrantedMatrix] = useState<Record<string, Set<string>>>({
    default: new Set(['kits.use', 'bgrade.use', 'removertool.use', 'autocodelock.use', 'backpacks.use']),
    vip: new Set(['kits.use', 'kits.vip', 'clans.use', 'bgrade.use', 'removertool.use', 'autocodelock.use', 'betterchat.vip', 'backpacks.use']),
    premium: new Set(['kits.use', 'kits.vip', 'clans.use', 'bgrade.use', 'removertool.use', 'autocodelock.use', 'betterchat.vip', 'backpacks.use']),
    admin: new Set(['kits.use', 'kits.vip', 'kits.admin', 'clans.use', 'bgrade.use', 'removertool.use', 'removertool.admin', 'autocodelock.use', 'noclip.toggle', 'vanish.allow', 'betterchat.admin', 'tp.admin'])
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [selectedUserGroup, setSelectedUserGroup] = useState('vip');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const data = await (window as any).electronAPI?.getPermissionsData(serverPath, framework);
        if (data) {
          if (data.groups && data.groups.length > 0) setGroups(data.groups);
          if (data.permissions && data.permissions.length > 0) {
            setPermissions(data.permissions);
          }
        }
      } catch {}
    };

    loadPermissions();
  }, [serverPath, framework]);

  const handleTogglePermission = async (group: string, perm: string) => {
    const isGranted = grantedMatrix[group]?.has(perm);
    const api = (window as any).electronAPI;

    try {
      if (isGranted) {
        await api?.revokePermission(serverPath, framework, 'group', group, perm);
        setGrantedMatrix((prev) => {
          const updated = new Set(prev[group]);
          updated.delete(perm);
          return { ...prev, [group]: updated };
        });
        setActionNotice(`Отозвано право ${perm} у группы ${group}`);
      } else {
        await api?.grantPermission(serverPath, framework, 'group', group, perm);
        setGrantedMatrix((prev) => {
          const updated = new Set(prev[group] || []);
          updated.add(perm);
          return { ...prev, [group]: updated };
        });
        setActionNotice(`Выдано право ${perm} группе ${group}`);
      }
    } catch {}

    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleAssignUserGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser.trim()) return;

    try {
      const isCarbon = framework.startsWith('carbon');
      const cmd = isCarbon
        ? `c.group add "${targetUser.trim()}" ${selectedUserGroup}`
        : `o.user group add "${targetUser.trim()}" ${selectedUserGroup}`;

      await (window as any).electronAPI?.sendRconCommand(serverPath, cmd);
      setActionNotice(`Игрок ${targetUser} успешно добавлен в группу ${selectedUserGroup.toUpperCase()}`);
      setTargetUser('');
    } catch {}

    setTimeout(() => setActionNotice(null), 3000);
  };

  const filteredPerms = permissions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.plugin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col space-y-4 p-4 select-none bg-[#050811]">
      {/* Top Search & User Quick Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0a1122] p-3 rounded-2xl border border-cyan-500/20">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Фильтр прав по названию или плагину..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
          />
        </div>

        {/* Assign User Group Form */}
        <form onSubmit={handleAssignUserGroup} className="flex items-center gap-2">
          <input
            type="text"
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            placeholder="SteamID или ник игрока..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-[#00f0ff]"
          />
          <select
            value={selectedUserGroup}
            onChange={(e) => setSelectedUserGroup(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-[#00f0ff] font-bold focus:outline-none"
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white text-xs font-bold transition-all shrink-0 border border-cyan-300/30 cursor-pointer"
          >
            Выдать
          </button>
        </form>
      </div>

      {actionNotice && (
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#00f0ff] shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Permissions Matrix Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-cyan-500/20 bg-[#0a1122]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cyan-500/20 bg-cyan-500/5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-bold">
              <th className="p-3">Право (Permission)</th>
              <th className="p-3">Плагин</th>
              <th className="p-3">Описание</th>
              {groups.map((g) => (
                <th key={g} className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[#00f0ff] font-mono">{g}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-500/10 text-xs">
            {filteredPerms.map((perm) => (
              <tr key={perm.name} className="hover:bg-cyan-500/[0.04] transition-colors">
                <td className="p-3 font-mono font-bold text-[#00f0ff]">{perm.name}</td>
                <td className="p-3 text-[#94a3b8]">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-[#38bdf8]">
                    {perm.plugin}
                  </span>
                </td>
                <td className="p-3 text-slate-300">{perm.description}</td>
                {groups.map((group) => {
                  const isChecked = !!grantedMatrix[group]?.has(perm.name);
                  return (
                    <td key={group} className="p-3 text-center">
                      <button
                        onClick={() => handleTogglePermission(group, perm.name)}
                        className={`w-6 h-6 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-white/[0.04] text-slate-600 border border-white/[0.06] hover:text-slate-400'
                        }`}
                        title={`${isChecked ? 'Отозвать' : 'Выдать'} ${perm.name} для ${group}`}
                      >
                        {isChecked ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
