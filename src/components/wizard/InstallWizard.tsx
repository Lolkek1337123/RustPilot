import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Folder,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  ShieldCheck,
  FolderPlus,
  FlaskConical
} from 'lucide-react';
import { ModFramework } from '../../types';

interface InstallWizardProps {
  onInstallComplete: (serverPath: string, framework: ModFramework) => void;
}

export const InstallWizard: React.FC<InstallWizardProps> = ({ onInstallComplete }) => {
  const [rootFolder, setRootFolder] = useState<string>('D:\\RustServers');
  const [serverName, setServerName] = useState<string>('Rust Server (Carbon)');
  const [folderName, setFolderName] = useState<string>('RustServer_Carbon');
  const [isFolderManual, setIsFolderManual] = useState<boolean>(false);
  const [framework, setFramework] = useState<ModFramework>('carbon_release');
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('Готов к установке');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-sync folderName from serverName unless user manually changed it
  useEffect(() => {
    if (!isFolderManual) {
      const sanitized = serverName
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setFolderName(sanitized || 'RustServer_1');
    }
  }, [serverName, isFolderManual]);

  const computedFinalPath = `${rootFolder.replace(/[\\/]+$/, '')}\\${folderName}\\rustds`;

  const handleSelectFolder = async () => {
    try {
      const selected = await (window as any).electronAPI?.selectDirectory();
      if (selected) {
        setRootFolder(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartInstallation = async () => {
    setIsInstalling(true);
    setErrorMessage(null);
    setProgressPercent(2);
    setProgressStage('Инициализация SteamCMD...');

    // Subscribe to progress
    const unsubscribe = (window as any).electronAPI?.onDownloadProgress((data: any) => {
      setProgressStage(data.stage);
      setProgressPercent(Math.round(data.percent));
    });

    try {
      const baseDir = `${rootFolder.replace(/[\\/]+$/, '')}\\${folderName}`;
      const toolsDir = `${baseDir}\\_tools`;
      const serverFilesDir = `${baseDir}\\rustds`;

      // 1. Install / Update Rust Core via SteamCMD into dedicated server folder
      const res = await (window as any).electronAPI?.installServer({
        toolsDir,
        serverFilesDir,
        validate: true
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      // 2. Install Mod Framework if selected
      if (framework !== 'vanilla') {
        setProgressStage('Установка фреймворка ' + framework.toUpperCase() + '...');
        const modRes = await (window as any).electronAPI?.installFramework(serverFilesDir, framework);
        if (!modRes.success) {
          throw new Error(modRes.message);
        }
      }

      setProgressPercent(100);
      setProgressStage('Установка успешно завершена!');
      setIsInstalling(false);
      if (unsubscribe) unsubscribe();

      onInstallComplete(serverFilesDir, framework);
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsInstalling(false);
      if (unsubscribe) unsubscribe();
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-y-auto max-w-4xl mx-auto bg-[#050811]">
      {/* Header */}
      <div className="space-y-1 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-[#00f0ff] mb-2">
          <FlaskConical className="w-3.5 h-3.5" />
          <span>TRP Labs • 1-Click Automated Setup</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white">
          Мастер установки и развертывания сервера Rust
        </h2>
        <p className="text-xs text-[#94a3b8]">
          Создание изолированной папки сервера, загрузка SteamCMD, игрового ядра (AppID 258550) и инъекция Carbon/Oxide
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="rounded-2xl glass-panel p-6 border border-cyan-500/20 bg-[#0a1122] space-y-6">
        {/* Step 1: Server Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            1. Название сервера (server.hostname)
          </label>
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            disabled={isInstalling}
            placeholder="Например: RustPilot Testing Server"
            className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
          />
        </div>

        {/* Step 2: Root Path & Subfolder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] flex items-center justify-between">
              <span>2. Корневая директория</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rootFolder}
                onChange={(e) => setRootFolder(e.target.value)}
                disabled={isInstalling}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
              />
              <button
                onClick={handleSelectFolder}
                disabled={isInstalling}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-white border border-cyan-500/20 transition-colors shrink-0 cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Обзор</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
              Имя папки инстанса
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={folderName}
                onChange={(e) => {
                  setIsFolderManual(true);
                  setFolderName(e.target.value);
                }}
                disabled={isInstalling}
                className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
              />
            </div>
          </div>
        </div>

        {/* Path Preview Banner */}
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-3">
          <FolderPlus className="w-5 h-5 text-[#00f0ff] shrink-0" />
          <div className="text-xs">
            <span className="text-[#94a3b8]">Файлы сервера будут установлены в: </span>
            <span className="text-[#00f0ff] font-mono font-bold">{computedFinalPath}</span>
          </div>
        </div>

        {/* Step 3: Mod Framework Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            3. Выбор моддинг-ядра (Фреймворка)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Option 1: Carbon Release */}
            <div
              onClick={() => !isInstalling && setFramework('carbon_release')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                framework === 'carbon_release'
                  ? 'bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border-[#00f0ff]/50 shadow-lg shadow-cyan-950/20'
                  : 'bg-[#050811] border-cyan-500/15 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                  <span>Carbon Release</span>
                </div>
                {framework === 'carbon_release' && (
                  <CheckCircle2 className="w-4 h-4 text-[#00f0ff]" />
                )}
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Официальный релиз Carbon. Максимальная производительность, поддержка C# модулей и LUI v2/v3.
              </p>
            </div>

            {/* Option 2: Oxide / uMod */}
            <div
              onClick={() => !isInstalling && setFramework('oxide')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                framework === 'oxide'
                  ? 'bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border-amber-500/50 shadow-lg shadow-amber-950/20'
                  : 'bg-[#050811] border-cyan-500/15 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Oxide / uMod</span>
                </div>
                {framework === 'oxide' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Классический фреймворк Oxide. Полная совместимость со всеми классическими плагинами uMod.
              </p>
            </div>

            {/* Option 3: Vanilla */}
            <div
              onClick={() => !isInstalling && setFramework('vanilla')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                framework === 'vanilla'
                  ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                  : 'bg-[#050811] border-cyan-500/15 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pure Vanilla</span>
                </div>
                {framework === 'vanilla' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Чистый сервер Rust без модификаций. Официальные правила игры Facepunch.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Display */}
        {isInstalling && (
          <div className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-[#00f0ff] animate-spin" />
                <span>{progressStage}</span>
              </span>
              <span className="font-mono font-bold text-[#00f0ff]">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-cyan-500/15">
              <div
                className="h-full bg-gradient-to-r from-[#00f0ff] to-[#2563eb] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-200">
              <span className="font-bold">Ошибка установки: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            onClick={handleStartInstallation}
            disabled={isInstalling || !folderName.trim() || !rootFolder.trim()}
            className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-xl shadow-cyan-950/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 border border-cyan-300/30 cursor-pointer"
          >
            {isInstalling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Выполняется установка...</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>Создать папку и установить сервер</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
