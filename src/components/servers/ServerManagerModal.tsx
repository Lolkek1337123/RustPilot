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
  onOpenWizard
}) => {
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

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

  const handleQuickScanWorkspace = async () => {
    setIsScanning(true);
    setScanMessage('Сканирование локальных папок на наличие серверов...');
    try {
      const candidatePaths = [
        'D:\\ai\\apps\\RustTestingServer_Carbon',
        'D:\\ai\\apps\\RustTestingServer_Oxide',
        'D:\\ai\\apps\\TestRustServer_Nexus',
        'D:\\RustServers\\Server_1'
      ];

      let found = 0;
      for (const p of candidatePaths) {
        const detected = await (window as any).electronAPI?.detectServer(p);
        if (detected && detected.isValid) {
          onAddServer(detected);
          found++;
        }
      }

      setScanMessage(found > 0 ? `Найдено и добавлено серверов: ${found}` : 'Новых серверов в стандартных путях не обнаружено.');
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

          <div className="flex items-center gap-2">
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
              title="Быстро найти серверы в рабочей папке"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Сканировать</span>
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
              return (
                <div
                  key={server.serverPath}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 via-blue-950/20 to-transparent border-cyan-400/50 shadow-lg shadow-cyan-950/20'
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
                    <div className="flex items-center gap-2">
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

                    {servers.length > 1 && (
                      <button
                        onClick={() => onDeleteServer(server.serverPath)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Удалить из списка"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
