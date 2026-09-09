import React, { useState } from 'react';
import {
  Server,
  FolderOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Search,
  X,
  AlertCircle,
  ScanLine,
  FlaskConical
} from 'lucide-react';
import { ServerConfig, ModFramework } from '../../types';

interface ServerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: ServerConfig[];
  activeServer: ServerConfig;
  onSelectServer: (server: ServerConfig) => void;
  onAddServer: (server: ServerConfig) => void;
  onDeleteServer: (serverPath: string) => void;
  onSetServers?: (servers: ServerConfig[]) => void;
  onOpenWizard: () => void;
}

export const ServerManagerModal: React.FC<ServerManagerModalProps> = ({
  isOpen,
  onClose,
  servers,
  activeServer,
  onSelectServer,
  onAddServer,
  onDeleteServer,
  onSetServers,
  onOpenWizard
}) => {
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [validityMap, setValidityMap] = useState<Record<string, { exists: boolean; hasExe: boolean }>>({});

  // Validate all servers on disk when modal opens or server list changes
  React.useEffect(() => {
    if (!isOpen) return;
    const api = (window as any).electronAPI;
    if (!api?.validateServers) return;

    api.validateServers(servers.map((s) => s.serverPath)).then((res: any) => {
      if (res) setValidityMap(res);
    });
  }, [isOpen, servers]);

  if (!isOpen) return null;

  const handleBrowseAndAdd = async () => {
    try {
      const selected = await (window as any).electronAPI?.selectDirectory();
      if (!selected) return;

      const detected = await (window as any).electronAPI?.detectServer(selected);
      if (detected && detected.isValid) {
        onAddServer(detected);
        onSelectServer(detected);
        setScanMessage(`Успешно добавлен сервер: ${detected.serverName}`);
        setTimeout(() => setScanMessage(null), 3000);
      } else {
        alert('В выбранной папке не найден RustDedicated.exe!');
      }
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    }
  };

  const handleCleanMissingServers = () => {
    const invalidServers = servers.filter((s) => validityMap[s.serverPath] && !validityMap[s.serverPath].exists);
    if (invalidServers.length === 0) {
      setScanMessage('Все серверы в списке физически существуют на диске!');
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }

    const validServers = servers.filter((s) => !validityMap[s.serverPath] || validityMap[s.serverPath].exists);
    if (onSetServers) {
      onSetServers(validServers);
    } else {
      for (const inv of invalidServers) {
        onDeleteServer(inv.serverPath);
      }
    }

    if (validServers.length > 0 && !validServers.some((s) => s.serverPath === activeServer.serverPath)) {
      onSelectServer(validServers[0]);
    }

    setScanMessage(`Удалено отсутствующих на диске серверов: ${invalidServers.length}`);
    setTimeout(() => setScanMessage(null), 4000);
  };

  const handleQuickScanWorkspace = async () => {
    setIsScanning(true);
    setScanMessage('Авто-сканирование локальных дисков и рабочих папок на наличие серверов...');
    try {
      let found = 0;
      const api = (window as any).electronAPI;
      if (api?.autoDiscoverServers) {
        const discovered = await api.autoDiscoverServers();
        if (Array.isArray(discovered)) {
          for (const s of discovered) {
            onAddServer(s);
            found++;
          }
        }
      } else {
        const candidatePaths = [
          'Z:\\ai\\apps\\CarbonRustReactTest\\rustds',
          'Z:\\ai\\apps\\CarbonRustReactTest',
          'C:\\RustServer\\rustds',
          'D:\\RustServer\\rustds'
        ];
        for (const p of candidatePaths) {
          const detected = await api?.detectServer(p);
          if (detected && detected.isValid) {
            onAddServer(detected);
            found++;
          }
        }
      }

      setScanMessage(found > 0 ? `Найдено и добавлено реальных серверов: ${found}` : 'Новых серверов в стандартных путях не обнаружено.');
      setTimeout(() => setScanMessage(null), 4000);
    } catch (err: any) {
      setScanMessage(`Ошибка сканирования: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredServers = servers.filter(
    (s) =>
      s.serverName.toLowerCase().includes(search.toLowerCase()) ||
      s.serverPath.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#2563eb] flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <Server className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit']">
                Выбор и управление серверами Rust
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Переключайтесь между установленными серверами или добавьте существующий
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-cyan-500/15 bg-black/20 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск серверов..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCleanMissingServers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all cursor-pointer shadow-sm shadow-rose-950/40"
              title="Удалить из списка серверы, папки которых отсутствуют на диске"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Очистить несуществующие</span>
            </button>

            <button
              onClick={handleBrowseAndAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-white border border-cyan-500/20 transition-all cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Добавить существующий</span>
            </button>

            <button
              onClick={handleQuickScanWorkspace}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30 transition-all disabled:opacity-50 cursor-pointer"
              title="Авто-сканирование локальных дисков на наличие серверов"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Авто-сканирование</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenWizard();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-lg shadow-cyan-950/40 transition-all border border-cyan-300/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Установить новый</span>
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="px-5 py-2.5 bg-cyan-500/10 border-b border-cyan-500/20 text-[#00f0ff] text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}

        {/* Server List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredServers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Server className="w-8 h-8 mx-auto opacity-30 text-cyan-400" />
              <div className="text-xs">Серверы не найдены</div>
              <div className="text-[11px] text-slate-600">
                Нажмите «Добавить существующий» или «Установить новый»
              </div>
            </div>
          ) : (
            filteredServers.map((server) => {
              const isActive = activeServer.serverPath === server.serverPath;
              const val = validityMap[server.serverPath];
              const isMissingOnDisk = val && !val.exists;
              const isMissingExe = val && val.exists && !val.hasExe;

              return (
                <div
                  key={server.serverPath}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 via-blue-950/20 to-transparent border-cyan-400/50 shadow-lg shadow-cyan-950/20'
                      : isMissingOnDisk
                      ? 'bg-rose-950/10 border-rose-500/30 hover:border-rose-500/50'
                      : 'bg-[#050811] border-cyan-500/15 hover:border-cyan-500/30'
                  }`}
                >
                  <div
                    onClick={() => {
                      onSelectServer(server);
                      onClose();
                    }}
                    className="flex-1 cursor-pointer space-y-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{server.serverName}</span>
                      {isActive && (
                        <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          АКТИВЕН
                        </span>
                      )}
                      <span className="px-2 py-0.2 rounded bg-cyan-500/10 text-[#00f0ff] text-[10px] font-mono uppercase font-semibold">
                        {server.framework.toUpperCase()}
                      </span>

                      {/* Disk existence status badges */}
                      {isMissingOnDisk && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono border border-rose-500/40 flex items-center gap-1 font-bold animate-pulse">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          ПАПКА НЕ НАЙДЕНА
                        </span>
                      )}
                      {isMissingExe && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/40 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          НЕТ RUSTDEDICATED.EXE
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#94a3b8] font-mono truncate">
                      Путь: {server.serverPath}
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-3">
                      <span>Порт: {server.port}</span>
                      <span>•</span>
                      <span>RCON: {server.rconPort}</span>
                      <span>•</span>
                      <span>Карта: {server.worldSize}m (Сид: {server.seed})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive ? (
                      <button
                        onClick={() => {
                          onSelectServer(server);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] transition-colors cursor-pointer"
                      >
                        Выбрать
                      </button>
                    ) : (
                      <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30 cursor-pointer"
                      >
                        Открыть
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteServer(server.serverPath);
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                      title="Удалить этот сервер из списка"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyan-500/15 bg-black/40 px-5 flex items-center justify-between text-[11px] text-[#94a3b8]">
          <span>Всего серверов в списке: {servers.length}</span>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white font-medium cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
