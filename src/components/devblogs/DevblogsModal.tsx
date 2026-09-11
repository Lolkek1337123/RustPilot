import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Download,
  Copy,
  Check,
  FolderOpen,
  Terminal,
  ExternalLink,
  Layers,
  Sparkles,
  HelpCircle,
  FileCode,
  ShieldAlert,
  Search,
  CheckCircle2,
  Calendar,
  Cpu,
  Plus,
  Play,
  Loader2,
  Gamepad2,
  CheckSquare,
  Square,
  AlertTriangle,
  FolderCheck,
  Settings,
  Sliders,
  FlaskConical,
  Cloud,
  CloudDownload,
  FileArchive
} from 'lucide-react';
import { ServerConfig } from '../../types';

interface DevblogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddServer: (server: ServerConfig) => void;
}

interface DevblogItem {
  id: number;
  title: string;
  version: string;
  releaseDate: string;
  steamDbBuild: number;
  serverBuild?: number;
  era: '2025' | '2024' | '2021-2023' | '2018-2020' | '2016-2017';
  gdriveUrl?: string;
  isZip?: boolean;
  downloadFormat?: 'folder' | 'zip';
  client: {
    appId: number;
    depots: { depotId: number; manifestId: string; label: string }[];
  };
  serverWindows: {
    appId: number;
    depots: { depotId: number; manifestId: string; label: string }[];
  };
  serverLinux: {
    appId: number;
    depots: { depotId: number; manifestId: string; label: string }[];
  };
}

export const DevblogsModal: React.FC<DevblogsModalProps> = ({
  isOpen,
  onClose,
  onAddServer
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'merger' | 'guide'>('catalog');
  const [devblogs, setDevblogs] = useState<DevblogItem[]>([]);
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected Devblog Wizard Config Modal
  const [setupDevblog, setSetupDevblog] = useState<DevblogItem | null>(null);
  const [targetBaseDir, setTargetBaseDir] = useState<string>('');
  const [serverPort, setServerPort] = useState<number>(28015);
  const [serverName, setServerName] = useState<string>('');
  const [installWithClient, setInstallWithClient] = useState<boolean>(true);
  const [applyNoSteam, setApplyNoSteam] = useState<boolean>(true);
  const [installOxide, setInstallOxide] = useState<boolean>(true);
  const [autoLogs, setAutoLogs] = useState<string[]>([]);
  const [wizardTab, setWizardTab] = useState<'gdrive' | 'auto' | 'manual'>('gdrive');
  const [sourceArchiveOrDir, setSourceArchiveOrDir] = useState<string>('');

  // Progress / Assembly state
  const [isAssembling, setIsAssembling] = useState<boolean>(false);
  const [assemblyStatus, setAssemblyStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
    serverPath?: string;
    clientPath?: string;
  }>({ type: 'idle', message: '' });

  useEffect(() => {
    const unsub = (window as any).electronAPI?.onDevblogLog?.((msg: string) => {
      setAutoLogs((prev) => [...prev.slice(-200), msg]);
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const list = await (window as any).electronAPI?.getDevblogCatalog();
        if (Array.isArray(list)) {
          setDevblogs(list);
        }
      } catch {}
    };

    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Step 1 Setup Wizard for selected Devblog
  const handleOpenSetupWizard = (db: DevblogItem, initialTab: 'gdrive' | 'auto' | 'manual' = 'gdrive') => {
    setSetupDevblog(db);
    const defaultRoot = localStorage.getItem('rustpilot_default_dir') || 'C:\\RustServers';
    const cleanRoot = defaultRoot.replace(/[/\\]+$/, '');
    setTargetBaseDir(`${cleanRoot}\\Rust_Devblog_${db.id}`);
    setServerName(`Rust Dedicated [Devblog ${db.id} - ${db.version}]`);
    setServerPort(28015 + (db.id % 20) * 10);
    setAssemblyStatus({ type: 'idle', message: '' });
    setAutoLogs([]);
    setWizardTab(initialTab);
    setSourceArchiveOrDir('');
  };

  const handleOpenGDriveInBrowser = async (url?: string) => {
    const targetUrl = url || setupDevblog?.gdriveUrl;
    if (!targetUrl) return;
    try {
      if ((window as any).electronAPI?.openExternal) {
        await (window as any).electronAPI.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank');
      }
    } catch {
      window.open(targetUrl, '_blank');
    }
  };

  const handleSelectArchiveFile = async () => {
    try {
      const file = await (window as any).electronAPI?.selectFile?.({
        title: `Выберите скачанный архив Devblog ${setupDevblog?.id} (.zip)`
      });
      if (file) {
        setSourceArchiveOrDir(file);
      }
    } catch {}
  };

  const handleSelectSourceDir = async () => {
    try {
      const dir = await (window as any).electronAPI?.selectDirectory?.();
      if (dir) {
        setSourceArchiveOrDir(dir);
      }
    } catch {}
  };

  const handleImportFromGDrive = async () => {
    if (!setupDevblog || !targetBaseDir.trim()) {
      alert('Пожалуйста, укажите папку назначения для сервера!');
      return;
    }
    if (!sourceArchiveOrDir.trim()) {
      alert('Пожалуйста, выберите скачанный .ZIP архив или папку со сборкой с Google Диска!');
      return;
    }

    setIsAssembling(true);
    setAutoLogs([`Запуск импорта и развёртывания Devblog ${setupDevblog.id}...`]);
    setAssemblyStatus({ type: 'idle', message: 'Распаковка, проверка структуры файлов и патчинг...' });

    try {
      const res = await (window as any).electronAPI?.importDevblogLocal({
        devblogId: setupDevblog.id,
        sourcePath: sourceArchiveOrDir.trim(),
        targetBaseDir: targetBaseDir.trim(),
        serverPort: serverPort,
        installClient: installWithClient,
        applyNoSteam: applyNoSteam,
        installOxide: installOxide
      });

      if (res?.success) {
        const newServer: ServerConfig = {
          serverPath: res.serverPath || `${targetBaseDir.trim()}\\server`,
          serverName: serverName.trim() || `Rust Dedicated [Devblog ${setupDevblog.id}]`,
          identity: 'rustserver',
          port: serverPort,
          queryPort: serverPort + 2,
          rconPort: serverPort + 1,
          rconPassword: 'admin',
          maxPlayers: 50,
          worldSize: 3000,
          seed: 123456,
          saveInterval: 300,
          framework: installOxide ? 'oxide' : 'vanilla',
          isDevblog: true,
          devblogId: setupDevblog.id,
          pvpEnabled: true,
          stability: true,
          radiation: true,
          rconWeb: true
        };

        onAddServer(newServer);

        setAssemblyStatus({
          type: 'success',
          message: res.message,
          serverPath: res.serverPath,
          clientPath: res.clientPath
        });
      } else {
        setAssemblyStatus({
          type: 'error',
          message: res?.message || 'Ошибка импорта сборки с Google Drive'
        });
      }
    } catch (err: any) {
      setAssemblyStatus({
        type: 'error',
        message: `Ошибка: ${err.message}`
      });
    } finally {
      setIsAssembling(false);
    }
  };

  const handleSelectTargetDir = async () => {
    const dir = await (window as any).electronAPI?.selectDirectory();
    if (dir && setupDevblog) {
      const finalDir = dir.toLowerCase().includes(`devblog_${setupDevblog.id}`)
        ? dir
        : `${dir}\\Rust_Devblog_${setupDevblog.id}`;
      setTargetBaseDir(finalDir);
    } else if (dir) {
      setTargetBaseDir(dir);
    }
  };

  // 1-Click Automated Download, Assemble & Patch
  const handleAutoDownloadAndBuild = async () => {
    if (!setupDevblog || !targetBaseDir.trim()) {
      alert('Пожалуйста, укажите папку для установки!');
      return;
    }

    setIsAssembling(true);
    setAutoLogs(['Запуск автоматической загрузки и сборки Devblog...']);
    setAssemblyStatus({ type: 'idle', message: 'Автоматическое скачивание депотов и сборка...' });

    try {
      const res = await (window as any).electronAPI?.autoDownloadAndBuildDevblog({
        devblogId: setupDevblog.id,
        targetBaseDir: targetBaseDir.trim(),
        serverPort: serverPort,
        installClient: installWithClient,
        applyNoSteam: applyNoSteam,
        installOxide: installOxide
      });

      if (res?.success) {
        const newServer: ServerConfig = {
          serverPath: res.serverPath || `${targetBaseDir.trim()}\\server`,
          serverName: serverName.trim() || `Rust Dedicated [Devblog ${setupDevblog.id}]`,
          identity: 'rustserver',
          port: serverPort,
          queryPort: serverPort + 2,
          rconPort: serverPort + 1,
          rconPassword: 'admin',
          maxPlayers: 50,
          worldSize: 3000,
          seed: 123456,
          saveInterval: 300,
          framework: installOxide ? 'oxide' : 'vanilla',
          isDevblog: true,
          devblogId: setupDevblog.id,
          pvpEnabled: true,
          stability: true,
          radiation: true,
          rconWeb: true
        };

        onAddServer(newServer);

        setAssemblyStatus({
          type: 'success',
          message: res.message,
          serverPath: res.serverPath,
          clientPath: res.clientPath
        });
      } else {
        setAssemblyStatus({
          type: 'error',
          message: res?.message || 'Ошибка автоматической установки'
        });
      }
    } catch (err: any) {
      setAssemblyStatus({
        type: 'error',
        message: `Ошибка: ${err.message}`
      });
    } finally {
      setIsAssembling(false);
    }
  };

  const handleAssembleAndRegister = async () => {
    await handleAutoDownloadAndBuild();
  };

  // Quick NoSteam Patcher
  const handlePatchNoSteamNow = async () => {
    if (!targetBaseDir.trim()) return;
    try {
      const clientRes = await (window as any).electronAPI?.patchNoSteam(`${targetBaseDir.trim()}\\client`);
      const serverRes = await (window as any).electronAPI?.patchNoSteam(`${targetBaseDir.trim()}\\server`);
      alert(`Клиент: ${clientRes?.message || 'OK'}\nСервер: ${serverRes?.message || 'OK'}`);
    } catch (err: any) {
      alert(`Ошибка патча: ${err.message}`);
    }
  };

  const handleLaunchClient = async () => {
    if (!assemblyStatus.clientPath) return;
    try {
      const res = await (window as any).electronAPI?.launchDevblogClient(
        assemblyStatus.clientPath,
        serverPort
      );
      if (res?.message) {
        alert(res.message);
      }
    } catch (e: any) {
      alert(`Ошибка запуска: ${e.message}`);
    }
  };

  const filteredDevblogs = devblogs.filter((db) => {
    const matchesEra = selectedEra === 'all' || db.era === selectedEra;
    const matchesSearch =
      db.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      db.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      db.id.toString().includes(searchQuery);
    return matchesEra && matchesSearch;
  });

  const eras = [
    { id: 'all', label: 'Все эпохи' },
    { id: '2025', label: '2025 (Modern)' },
    { id: '2024', label: '2024 (HDRP)' },
    { id: '2021-2023', label: '2021-2023 (Golden Age)' },
    { id: '2018-2020', label: '2018-2020 (Classic)' },
    { id: '2016-2017', label: '2016-2017 (Old Rust)' }
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-5xl h-[88vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#2563eb] flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base font-['Outfit']">
                  Менеджер Девблогов Rust (Devblog Archive)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/40">
                  Любые версии Rust: Сервер + Клиент
                </span>
              </div>
              <span className="text-xs text-[#94a3b8]">
                Автоматическая загрузка, объединение депотов и запуск серверов и клиентов любой эпохи Rust
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-cyan-500/15 bg-cyan-500/5">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-[#00f0ff] text-[#00f0ff] bg-cyan-500/10'
                : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-cyan-500/5'
            }`}
          >
            <Layers className="w-4 h-4 text-[#00f0ff]" />
            <span>Каталог Девблогов & Установка</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-[#00f0ff] text-[#00f0ff] bg-cyan-500/10'
                : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-cyan-500/5'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-[#38bdf8]" />
            <span>Инструкция по загрузке & NoSteam</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* Search & Era Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#050811] p-3 rounded-2xl border border-cyan-500/20">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по номеру девблога (236, 133, 280, 65...)"
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0a1122] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {eras.map((era) => (
                    <button
                      key={era.id}
                      onClick={() => setSelectedEra(era.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedEra === era.id
                          ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 shadow-md'
                          : 'bg-cyan-500/5 text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
                      }`}
                    >
                      {era.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Devblogs Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDevblogs.map((db) => (
                  <div
                    key={db.id}
                    className="p-5 rounded-2xl glass-panel border border-cyan-500/20 bg-[#050811] flex flex-col justify-between space-y-4 hover:border-cyan-400/40 transition-all shadow-xl"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white font-['Outfit']">
                              {db.title}
                            </span>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30">
                              {db.version}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#94a3b8] flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {db.releaseDate}
                            </span>
                            <span>•</span>
                            <span>SteamDB Build: <strong className="text-slate-300 font-mono">{db.steamDbBuild}</strong></span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-[#38bdf8] border border-cyan-500/20">
                          {db.era}
                        </span>
                      </div>

                      {/* Depots & Cloud Preview */}
                      <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/15 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-emerald-400 font-bold">
                          <span>🖥️ Сервер (AppID {db.serverWindows.appId}):</span>
                          <span className="text-slate-400 font-mono text-[10px]">2 депота</span>
                        </div>
                        <div className="flex items-center justify-between text-[#00f0ff] font-bold">
                          <span>🎮 Клиент Игры (AppID {db.client.appId}):</span>
                          <span className="text-slate-400 font-mono text-[10px]">2 депота</span>
                        </div>
                        {db.gdriveUrl && (
                          <div className="pt-1.5 border-t border-cyan-500/15 flex items-center justify-between text-[10px]">
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              ☁️ Google Drive:
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                db.isZip
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30'
                              }`}
                            >
                              {db.isZip ? '📦 ZIP архив' : '📁 Папка без .zip'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Setup Actions */}
                    <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenSetupWizard(db, 'gdrive')}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-amber-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 border border-amber-400/40 cursor-pointer"
                        title="Скачать готовую сборку без Steam / Depot"
                      >
                        <CloudDownload className="w-4 h-4 text-white shrink-0" />
                        <span>☁️ Google Drive (Без Depot)</span>
                      </button>

                      <button
                        onClick={() => handleOpenSetupWizard(db, 'auto')}
                        className="py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-[#00f0ff] font-bold text-xs border border-cyan-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Установка через DepotDownloader"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span>Depot</span>
                      </button>

                      <a
                        href={`https://steamdb.info/app/258550/patchnotes/`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] hover:text-white transition-colors shrink-0"
                        title="SteamDB Patchnotes"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: GUIDE & NOSTEAM PATCH */}
          {activeTab === 'guide' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Step 1 */}
              <div className="p-5 rounded-2xl bg-[#050811] border border-cyan-500/20 space-y-2">
                <div className="flex items-center gap-2 text-[#00f0ff] font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs text-[#00f0ff]">1</span>
                  <span>Установка SteamTools и манифестов</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Для загрузки девблогов Steam скачивает точные исторические депоты через консоль <code>download_depot</code>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                  <a
                    href="https://steamtools.net/"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-[#0a1122] hover:bg-cyan-500/10 text-slate-300 hover:text-white flex items-center justify-between border border-cyan-500/20"
                  >
                    <span>SteamTools (Официальный сайт)</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                  <a
                    href="https://codeload.github.com/SSMGAlt/ManifestHub2/zip/refs/heads/258550"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-[#0a1122] hover:bg-cyan-500/10 text-slate-300 hover:text-white flex items-center justify-between border border-cyan-500/20"
                  >
                    <span>Архив манифестов Server (258550)</span>
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-2xl bg-[#050811] border border-cyan-500/20 space-y-2">
                <div className="flex items-center gap-2 text-[#38bdf8] font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs text-[#38bdf8]">2</span>
                  <span>Запуск консоли Steam</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Нажмите <code>Win + R</code> и введите <code>steam://open/console</code>. После этого в клиенте Steam появится вкладка <strong>Console</strong>, куда вводятся команды <code>download_depot</code>.
                </p>
              </div>

              {/* Step 3: NoSteam Spacewar Patch */}
              <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-3">
                <div className="flex items-center gap-2 text-[#00f0ff] font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-[#00f0ff]" />
                  <span>Патч NoSteam (на основе Spacewar AppID 480)</span>
                </div>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/15 space-y-1">
                    <strong className="text-white">Вариант А: Для клиентов до 2020 года (Assembly-CSharp.dll):</strong>
                    <p>
                      Откройте <code>RustClient_Data\Managed\Assembly-CSharp.dll</code> через <strong>dnSpy</strong>. Перейдите в класс <code>Rust.Defines</code>, нажмите правой кнопкой <em>Edit Class</em> и замените <code>appID = 252490U;</code> на <code>appID = 480U;</code>. Сохраните модуль.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/15 space-y-1">
                    <strong className="text-white">Вариант Б: Для клиентов 2020+ года (GameAssembly.dll):</strong>
                    <p>
                      Откройте <code>GameAssembly.dll</code> в корне игры через <strong>HxD Hex Editor</strong>. Нажмите <em>Search → Replace</em>, выберите <em>Integer number</em> (UInt32), замените <code>252490</code> на <code>480</code> и сохраните файл.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── STEP 1: SETUP WIZARD POPUP MODAL ── */}
        {setupDevblog && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-[999] animate-in fade-in duration-200 select-none">
            <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 px-5 py-3.5 bg-black/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#2563eb] flex items-center justify-center shadow-lg shadow-cyan-950/40 shrink-0">
                    <Sliders className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-['Outfit']">
                      Настройка: {setupDevblog.title}
                    </h3>
                    <span className="text-[11px] text-[#94a3b8] font-mono">
                      Версия: {setupDevblog.version} • {setupDevblog.releaseDate}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSetupDevblog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center border-b border-cyan-500/15 bg-black/20 px-5 pt-2 gap-2 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setWizardTab('gdrive')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    wizardTab === 'gdrive'
                      ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                      : 'border-transparent text-[#94a3b8] hover:text-slate-200'
                  }`}
                >
                  <CloudDownload className="w-3.5 h-3.5 text-amber-400" />
                  <span>☁️ Google Drive (Без Steam)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWizardTab('auto')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    wizardTab === 'auto'
                      ? 'border-[#00f0ff] text-[#00f0ff] bg-cyan-500/10'
                      : 'border-transparent text-[#94a3b8] hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ DepotDownloader</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWizardTab('manual')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    wizardTab === 'manual'
                      ? 'border-[#38bdf8] text-[#38bdf8] bg-cyan-500/10'
                      : 'border-transparent text-[#94a3b8] hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>📋 Ручные команды Steam</span>
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* 1. Target Base Path */}
                <div>
                  <label className="text-slate-200 font-bold block mb-1">
                    📁 Папка для установки сервера и клиента:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={targetBaseDir}
                      onChange={(e) => setTargetBaseDir(e.target.value)}
                      placeholder="D:\ai\servers\Rust_Devblog_65"
                      className="flex-1 px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-white font-mono text-xs focus:outline-none focus:border-[#00f0ff]"
                    />
                    <button
                      type="button"
                      onClick={handleSelectTargetDir}
                      className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Обзор...</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-[#94a3b8] mt-1 block">
                    Внутри будут созданы папки <code>\server</code> и <code>\client</code>.
                  </span>
                </div>

                {/* 2. Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#94a3b8] font-semibold block mb-1">
                      Название сервера:
                    </label>
                    <input
                      type="text"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[#94a3b8] font-semibold block mb-1">
                      Основной порт:
                    </label>
                    <input
                      type="number"
                      value={serverPort}
                      onChange={(e) => setServerPort(parseInt(e.target.value) || 28015)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-white font-mono text-xs focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                </div>

                {/* 3. Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInstallWithClient(!installWithClient)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all text-left cursor-pointer ${
                      installWithClient
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-[#00f0ff]'
                        : 'bg-[#050811] border-cyan-500/15 text-[#94a3b8]'
                    }`}
                  >
                    {installWithClient ? (
                      <CheckSquare className="w-4 h-4 text-[#00f0ff] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <strong className="block text-[11px] text-white">Клиент игры</strong>
                      <span className="text-[9px] text-[#94a3b8]">RustClient.exe</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyNoSteam(!applyNoSteam)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all text-left cursor-pointer ${
                      applyNoSteam
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-[#00f0ff]'
                        : 'bg-[#050811] border-cyan-500/15 text-[#94a3b8]'
                    }`}
                  >
                    {applyNoSteam ? (
                      <CheckSquare className="w-4 h-4 text-[#00f0ff] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <strong className="block text-[11px] text-white">Патч NoSteam</strong>
                      <span className="text-[9px] text-[#94a3b8]">Spacewar 480</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInstallOxide(!installOxide)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all text-left cursor-pointer ${
                      installOxide
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-[#050811] border-cyan-500/15 text-[#94a3b8]'
                    }`}
                  >
                    {installOxide ? (
                      <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <strong className="block text-[11px] text-white">⚡ Oxide / uMod</strong>
                      <span className="text-[9px] text-[#94a3b8]">Папка плагинов</span>
                    </div>
                  </button>
                </div>

                {/* TAB 0: GOOGLE DRIVE DOWNLOAD & 1-CLICK IMPORT */}
                {wizardTab === 'gdrive' && (
                  <div className="space-y-4 pt-1">
                    {/* Google Drive Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#0a1122] to-[#050811] border border-amber-500/30 space-y-3 shadow-lg shadow-amber-950/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 border border-amber-500/30 shrink-0">
                            <CloudDownload className="w-4 h-4 text-amber-300" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs">
                              Готовая облачная сборка (Сервер + Клиент)
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              Скачивание без необходимости ввода Steam логина или ожидания депотов
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                            setupDevblog.isZip
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/40'
                          }`}
                        >
                          {setupDevblog.isZip ? '📦 Архив .ZIP' : '📁 Папка без .zip'}
                        </span>
                      </div>

                      {/* URL Box & Actions */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                        <input
                          type="text"
                          readOnly
                          value={setupDevblog.gdriveUrl || 'Ссылка не указана'}
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-amber-500/20 text-slate-300 font-mono text-[11px] focus:outline-none select-all"
                        />

                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenGDriveInBrowser()}
                            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-amber-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Открыть Диск</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(setupDevblog.gdriveUrl || '', 'gdrive-link')}
                            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Скопировать ссылку"
                          >
                            {copiedKey === 'gdrive-link' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-amber-200/80 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-amber-500/15 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          {setupDevblog.isZip
                            ? 'Нажмите «Открыть Диск», скачайте готовый .zip архив, затем выберите его в поле ниже для автоматической установки.'
                            : 'Нажмите «Открыть Диск» и скачайте папку или файлы игры. Затем укажите скачанную папку ниже для сборки и запуска.'}
                        </span>
                      </div>
                    </div>

                    {/* Step 2: Select Downloaded Archive or Folder */}
                    <div className="p-4 rounded-2xl bg-[#050811] border border-cyan-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-white font-bold block text-xs flex items-center gap-1.5">
                          <FileArchive className="w-3.5 h-3.5 text-[#00f0ff]" />
                          <span>Шаг 2: Укажите скачанный архив или папку с Google Диска:</span>
                        </label>
                        <span className="text-[10px] text-slate-400">(.zip, .7z или папка)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={sourceArchiveOrDir}
                          onChange={(e) => setSourceArchiveOrDir(e.target.value)}
                          placeholder={
                            setupDevblog.isZip
                              ? 'C:\\Users\\User\\Downloads\\Rust_Devblog_301.zip'
                              : 'C:\\Users\\User\\Downloads\\Rust_Devblog_299'
                          }
                          className="flex-1 px-3 py-2 rounded-xl bg-[#0a1122] border border-cyan-500/20 text-white font-mono text-xs focus:outline-none focus:border-[#00f0ff]"
                        />

                        <button
                          type="button"
                          onClick={handleSelectArchiveFile}
                          className="px-2.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] font-bold text-[11px] flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                          title="Выбрать ZIP архив"
                        >
                          <FileArchive className="w-3.5 h-3.5" />
                          <span>.ZIP файл</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSelectSourceDir}
                          className="px-2.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-slate-300 hover:text-white font-bold text-[11px] flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                          title="Выбрать распакованную папку"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Папка</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-[#94a3b8] block">
                        RustPilot автоматически распакует архив или распределит файлы в <code>\server</code> и <code>\client</code>, пропатчит NoSteam и запустит сервер!
                      </span>
                    </div>

                    {/* Live Auto Logs Console */}
                    {autoLogs.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-black/60 border border-cyan-500/30 font-mono text-[10px] text-[#00f0ff] max-h-32 overflow-y-auto space-y-1 shadow-inner">
                        {autoLogs.map((logLine, idx) => (
                          <div key={idx} className="truncate">❯ {logLine}</div>
                        ))}
                      </div>
                    )}

                    {/* Status Message */}
                    {assemblyStatus.message && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                          assemblyStatus.type === 'success'
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : assemblyStatus.type === 'error'
                            ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                        }`}
                      >
                        {assemblyStatus.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : assemblyStatus.type === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{assemblyStatus.message}</span>
                      </div>
                    )}

                    {/* Actions */}
                    {assemblyStatus.type === 'success' ? (
                      <div className="w-full flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handlePatchNoSteamNow}
                          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] text-xs font-bold border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Патчить NoSteam</span>
                        </button>

                        {assemblyStatus.clientPath && (
                          <button
                            onClick={handleLaunchClient}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Gamepad2 className="w-3.5 h-3.5" />
                            <span>🎮 Запустить Клиент</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSetupDevblog(null);
                            onClose();
                          }}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>🚀 К Серверу</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isAssembling}
                        onClick={handleImportFromGDrive}
                        className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.005] active:scale-[0.995] border border-amber-300/40 cursor-pointer"
                      >
                        {isAssembling ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Импорт, распаковка и патчинг сборки...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-200" />
                            <span>⚡ Распаковать, Пропатчить и Добавить в RustPilot</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 1: AUTO INSTALL */}
                {wizardTab === 'auto' && (
                  <div className="space-y-3 pt-2">
                    {/* Live Auto Logs Console */}
                    {autoLogs.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-black/60 border border-cyan-500/30 font-mono text-[10px] text-[#00f0ff] max-h-32 overflow-y-auto space-y-1 shadow-inner">
                        {autoLogs.map((logLine, idx) => (
                          <div key={idx} className="truncate">❯ {logLine}</div>
                        ))}
                      </div>
                    )}

                    {/* Status Message */}
                    {assemblyStatus.message && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                          assemblyStatus.type === 'success'
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : assemblyStatus.type === 'error'
                            ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                            : 'bg-cyan-500/10 border border-cyan-500/20 text-[#00f0ff]'
                        }`}
                      >
                        {assemblyStatus.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : assemblyStatus.type === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-[#00f0ff] shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{assemblyStatus.message}</span>
                      </div>
                    )}

                    {assemblyStatus.type === 'success' ? (
                      <div className="w-full flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handlePatchNoSteamNow}
                          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] text-xs font-bold border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Патчить NoSteam</span>
                        </button>

                        {assemblyStatus.clientPath && (
                          <button
                            onClick={handleLaunchClient}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Gamepad2 className="w-3.5 h-3.5" />
                            <span>🎮 Запустить Клиент</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSetupDevblog(null);
                            onClose();
                          }}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>🚀 К Серверу</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isAssembling}
                        onClick={handleAutoDownloadAndBuild}
                        className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white font-black text-xs shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.005] active:scale-[0.995] border border-cyan-300/30 cursor-pointer"
                      >
                        {isAssembling ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Автоматическая установка и сборка...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-cyan-200" />
                            <span>🚀 1-Click Авто-Установка (Скачать + Собрать + Патч)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 2: MANUAL STEAM COMMANDS */}
                {wizardTab === 'manual' && (
                  <div className="space-y-3 pt-2">
                    {/* License Unlock Banner */}
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                      <span className="text-[#00f0ff] font-bold text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                        <span>Если Steam пишет «missing license for depot»:</span>
                      </span>
                      <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('app_license_request 258550');
                            setCopiedKey('lic-req');
                            window.location.href = 'steam://open/console';
                          }}
                          className="w-full sm:w-auto px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00f0ff] font-bold border border-cyan-500/40 flex items-center justify-center gap-1 text-[10px] cursor-pointer"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>{copiedKey === 'lic-req' ? '✓ Скопировано!' : 'Активировать (app_license_request 258550)'}</span>
                        </button>

                        <a
                          href="https://steamtools.net/"
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-slate-300 hover:text-white font-bold border border-cyan-500/20 flex items-center justify-center gap-1 text-[10px]"
                        >
                          <span>SteamTools</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>
                    </div>

                    {/* Server Depots */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-[11px] flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Шаг 1: Депоты СЕРВЕРА (AppID {setupDevblog.serverWindows.appId})</span>
                        </span>
                        <span className="text-[9px] text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">
                          Бесплатно
                        </span>
                      </div>

                      <div className="space-y-1">
                        {setupDevblog.serverWindows.depots.map((depot, idx) => {
                          const cmd = `download_depot ${setupDevblog.serverWindows.appId} ${depot.depotId} ${depot.manifestId}`;
                          const isCopied = copiedKey === `srv-${depot.depotId}`;

                          return (
                            <div key={depot.depotId} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/40 border border-cyan-500/15">
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-slate-200 block truncate">
                                  {idx + 1}. {depot.label} ({depot.depotId})
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(cmd);
                                  setCopiedKey(`srv-${depot.depotId}`);
                                  window.location.href = 'steam://open/console';
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                              >
                                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? 'Скопировано' : 'Копировать'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Client Depots */}
                    {installWithClient && (
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold text-[11px] flex items-center gap-1.5">
                            <Gamepad2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                            <span>Шаг 2: Депоты КЛИЕНТА (AppID {setupDevblog.client.appId})</span>
                          </span>
                        </div>

                        <div className="space-y-1">
                          {setupDevblog.client.depots.map((depot, idx) => {
                            const cmd = `download_depot ${setupDevblog.client.appId} ${depot.depotId} ${depot.manifestId}`;
                            const isCopied = copiedKey === `cli-${depot.depotId}`;

                            return (
                              <div key={depot.depotId} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/40 border border-cyan-500/15">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-bold text-slate-200 block truncate">
                                    {idx + 1}. {depot.label} ({depot.depotId})
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cmd);
                                    setCopiedKey(`cli-${depot.depotId}`);
                                    window.location.href = 'steam://open/console';
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                                >
                                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  <span>{isCopied ? 'Скопировано' : 'Копировать'}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Assemble & Register */}
                    <button
                      type="button"
                      disabled={isAssembling}
                      onClick={handleAssembleAndRegister}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isAssembling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Сборка файлов...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Шаг 3: Собрать скачанные файлы и добавить в RustPilot</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
