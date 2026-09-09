import React, { useState, useEffect, useRef } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { StatusBar } from './components/layout/StatusBar';
import { UnifiedCommandCenter } from './components/dashboard/UnifiedCommandCenter';
import { PlayersModal } from './components/modals/PlayersModal';
import { PluginsModal } from './components/modals/PluginsModal';
import { WipeSchedulerModal } from './components/modals/WipeSchedulerModal';
import { ServerConfigModal } from './components/modals/ServerConfigModal';
import { AppSettingsModal } from './components/modals/AppSettingsModal';
import { WizardModal } from './components/modals/WizardModal';
import { ServerManagerModal } from './components/servers/ServerManagerModal';
import { CommandLibraryModal } from './components/modals/CommandLibraryModal';
import { ExitConfirmationModal } from './components/modals/ExitConfirmationModal';
import { DevblogsModal } from './components/devblogs/DevblogsModal';
import { PluginConfigModal } from './components/plugins/PluginConfigModal';
import { SchedulerModal } from './components/modals/SchedulerModal';
import { BackupModal } from './components/modals/BackupModal';
import { StartupUpdateModal } from './components/modals/StartupUpdateModal';
import {
  ModalType,
  ServerConfig,
  ServerStatus,
  Player,
  ServerTelemetry,
  TelemetryPoint,
  ModFramework
} from './types';

const DEFAULT_SERVERS: ServerConfig[] = [
  {
    serverPath: 'D:\\ai\\apps\\RustTestingServer_Carbon\\rustds',
    serverName: 'Testing Server (Carbon)',
    identity: 'rustserver',
    port: 28015,
    queryPort: 28016,
    rconPort: 28017,
    rconPassword: 'admin',
    maxPlayers: 50,
    worldSize: 3000,
    seed: 123456,
    saveInterval: 300,
    framework: 'carbon_release',
    autoRestartOnCrash: true
  },
  {
    serverPath: 'D:\\ai\\apps\\RustTestingServer_Oxide\\rustds',
    serverName: 'Testing Server (Oxide)',
    identity: 'rustserver',
    port: 28025,
    queryPort: 28026,
    rconPort: 28027,
    rconPassword: 'admin',
    maxPlayers: 50,
    worldSize: 3000,
    seed: 123456,
    saveInterval: 300,
    framework: 'oxide',
    autoRestartOnCrash: true
  },
  {
    serverPath: 'D:\\RustServers\\Server_1\\rustds',
    serverName: 'Main Production Rust Server',
    identity: 'rustserver',
    port: 28015,
    queryPort: 28016,
    rconPort: 28017,
    rconPassword: 'admin',
    maxPlayers: 100,
    worldSize: 3500,
    seed: 987654,
    saveInterval: 300,
    framework: 'carbon_release',
    autoRestartOnCrash: true
  }
];

export const App: React.FC = () => {
  // Startup GitHub update check state
  const [isStartupChecking, setIsStartupChecking] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rustpilot_check_updates_on_start') !== 'false';
    } catch {
      return true;
    }
  });

  // Modal & Exit confirmation state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [commandInput, setCommandInput] = useState<string>('');

  // Multi-server state
  const [servers, setServers] = useState<ServerConfig[]>(() => {
    try {
      const saved = localStorage.getItem('rustpilot_servers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SERVERS;
  });

  const [activeServer, setActiveServer] = useState<ServerConfig>(() => servers[0] || DEFAULT_SERVERS[0]);
  const activeServerRef = useRef(activeServer);
  useEffect(() => {
    activeServerRef.current = activeServer;
  }, [activeServer]);

  // Per-server logs, chat, telemetry, and status
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({});
  const [serverLogs, setServerLogs] = useState<Record<string, string[]>>({});
  const [serverChats, setServerChats] = useState<Record<string, string[]>>({});
  const [serverTelemetries, setServerTelemetries] = useState<Record<string, ServerTelemetry>>({});
  const [telemetryHistories, setTelemetryHistories] = useState<Record<string, TelemetryPoint[]>>({});
  const [serverPlayers, setServerPlayers] = useState<Record<string, Player[]>>({});

  // Persist servers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('rustpilot_servers', JSON.stringify(servers));
    } catch {}
  }, [servers]);

  // Single Unified Theme: Cobalt Scientist
  useEffect(() => {
    localStorage.setItem('rustpilot_theme', 'cobalt');
    document.documentElement.setAttribute('data-theme', 'cobalt');
  }, []);

  // Setup IPC Listeners
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const unLog = api.onLog((data: { serverPath: string; text: string }) => {
      const targetPath = data.serverPath === 'global' ? activeServerRef.current.serverPath : data.serverPath;
      if (!data.text) return;
      
      // Check for true startup complete log to transition from starting -> running
      if (
        data.text.includes('Server startup complete') ||
        data.text.includes('Dedicated Server Started') ||
        data.text.includes('SteamServer Connected') ||
        data.text.includes('Game Server Connected') ||
        data.text.includes('Server successfully started') ||
        data.text.includes('Your server is now ready')
      ) {
        setServerStatuses((prev) => {
          if (prev[targetPath] === 'starting' || prev[targetPath] === 'restarting') {
            return {
              ...prev,
              [targetPath]: 'running'
            };
          }
          return prev;
        });
      }

      const splitLines = data.text.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
      if (splitLines.length === 0) return;

      setServerLogs((prev) => {
        const list = prev[targetPath] || [];
        const lastLine = list[list.length - 1];

        // Deduplicate against the immediately preceding line
        const cleanLines = splitLines.filter((line, idx) => {
          if (idx === 0 && line === lastLine) return false;
          if (idx > 0 && line === splitLines[idx - 1]) return false;
          return true;
        });

        if (cleanLines.length === 0) return prev;

        return {
          ...prev,
          [targetPath]: [...list.slice(-2000), ...cleanLines]
        };
      });
    });

    const unProc = api.onProcessStatus((data: { serverPath: string; status: string }) => {
      setServerStatuses((prev) => ({
        ...prev,
        [data.serverPath]: (data.status as ServerStatus)
      }));
    });

    const unChat = api.onChatMessage((data: { serverPath: string; message: string }) => {
      setServerChats((prev) => {
        const list = prev[data.serverPath] || [];
        return {
          ...prev,
          [data.serverPath]: [...list.slice(-200), data.message]
        };
      });
    });

    const unClose = api.onCloseRequested?.(() => {
      setIsExitModalOpen(true);
    });

    const unTelem = api.onTelemetry((data: { serverPath: string; telemetry: ServerTelemetry }) => {
      const sPath = data.serverPath;
      setServerTelemetries((prev) => ({
        ...prev,
        [sPath]: data.telemetry
      }));

      // Transition starting -> running when RCON connects or returns ping/fps
      if (data.telemetry.ping > 0 || data.telemetry.fps > 0) {
        setServerStatuses((prev) => {
          if (prev[sPath] === 'starting') {
            return { ...prev, [sPath]: 'running' };
          }
          return prev;
        });
      }

      // Update historical trend with real values
      setTelemetryHistories((prev) => {
        const history = prev[sPath] || [];
        const newPoint: TelemetryPoint = {
          time: new Date().toLocaleTimeString(),
          fps: data.telemetry.fps || 0,
          cpu: data.telemetry.cpuPercent || 0,
          ramMb: data.telemetry.memoryMb || 0,
          netInKb: data.telemetry.networkInKb || 0,
          netOutKb: data.telemetry.networkOutKb || 0,
          entities: data.telemetry.entities || 0,
          players: data.telemetry.players || 0
        };
        return {
          ...prev,
          [sPath]: [...history.slice(-25), newPoint]
        };
      });
    });

    // Check initial running servers list
    api.getRunningServers().then((runningPaths: string[]) => {
      if (Array.isArray(runningPaths)) {
        setServerStatuses((prev) => {
          const next: Record<string, ServerStatus> = { ...prev };
          servers.forEach((s) => {
            next[s.serverPath] = runningPaths.includes(s.serverPath) ? 'running' : 'stopped';
          });
          return next;
        });
      }
    });

    return () => {
      if (unLog) unLog();
      if (unProc) unProc();
      if (unChat) unChat();
      if (unTelem) unTelem();
      if (unClose) unClose();
    };
  }, [activeServer.serverPath]);

  // Auto-connect RCON whenever active server is running
  useEffect(() => {
    const sPath = activeServer.serverPath;
    const isRun = serverStatuses[sPath] === 'running';
    if (isRun) {
      (window as any).electronAPI?.connectRcon(
        sPath,
        '127.0.0.1',
        activeServer.rconPort || 28017,
        activeServer.rconPassword || 'admin'
      );
    }
  }, [activeServer.serverPath, serverStatuses[activeServer.serverPath], activeServer.rconPort, activeServer.rconPassword]);

  // Periodic player list fetch (only when server is running)
  useEffect(() => {
    const sPath = activeServer.serverPath;
    const isRun = serverStatuses[sPath] === 'running';

    if (!isRun) {
      setServerPlayers((prev) => ({ ...prev, [sPath]: [] }));
      return;
    }

    const interval = setInterval(async () => {
      try {
        const playersList = await (window as any).electronAPI?.getPlayers(sPath);
        if (Array.isArray(playersList)) {
          setServerPlayers((prev) => ({ ...prev, [sPath]: playersList }));
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [activeServer.serverPath, serverStatuses[activeServer.serverPath]]);

  // Server Process Controls (Auto-Update bypass for historical Devblog servers)
  const handleStartServer = async (skipUpdate = false) => {
    const sPath = activeServer.serverPath;

    const isDevblogServer =
      activeServer.isDevblog === true ||
      sPath.toLowerCase().includes('devblog') ||
      activeServer.serverName.toLowerCase().includes('devblog');

    if (isDevblogServer) {
      setServerLogs((prev) => ({
        ...prev,
        [sPath]: [
          ...(prev[sPath] || []),
          '\x1b[1;36m[DEVBLOG SECURITY] ════════════════════════════════════════════════════════════\x1b[0m',
          `\x1b[1;36m[DEVBLOG SECURITY] Обнаружен исторический Devblog сервер: ${activeServer.serverName}\x1b[0m`,
          '\x1b[1;32m[DEVBLOG SECURITY] 🔒 Авто-обновление SteamCMD и Oxide отключено для защиты файлов сборки!\x1b[0m',
          '\x1b[1;36m[DEVBLOG SECURITY] ════════════════════════════════════════════════════════════\x1b[0m'
        ]
      }));
    } else if (!skipUpdate) {
      // ── Smart Auto-Update Check ──
      try {
        const updateCheck = await (window as any).electronAPI?.checkServerUpdateNeeded(sPath, activeServer.branch || 'public');

        // If files are already installed and up to date, skip SteamCMD validation entirely!
        if (updateCheck && updateCheck.installed && !updateCheck.needsUpdate) {
          const isFwInstalled = await (window as any).electronAPI?.isFrameworkInstalled(sPath, activeServer.framework);

          setServerLogs((prev) => ({
            ...prev,
            [sPath]: [
              ...(prev[sPath] || []),
              '\x1b[1;36m[SMART UPDATER] ════════════════════════════════════════════════════════════\x1b[0m',
              `\x1b[1;32m[SMART UPDATER] ⚡ ${updateCheck.reason}\x1b[0m`,
              isFwInstalled
                ? `\x1b[1;32m[SMART UPDATER] 🔒 Фреймворк ${activeServer.framework.toUpperCase()} уже установлен и готов.\x1b[0m`
                : `\x1b[1;33m[SMART UPDATER] 📦 Доустановка фреймворка ${activeServer.framework.toUpperCase()}...\x1b[0m`,
              '\x1b[1;36m[SMART UPDATER] 🚀 Пропуск длительной валидации SteamCMD. Мгновенный запуск сервера!\x1b[0m',
              '\x1b[1;36m[SMART UPDATER] ════════════════════════════════════════════════════════════\x1b[0m'
            ]
          }));

          if (!isFwInstalled && activeServer.framework && activeServer.framework !== 'vanilla') {
            await (window as any).electronAPI?.installFramework(sPath, activeServer.framework);
          }
        } else {
          // Full installation or update needed
          setServerStatuses((prev) => ({ ...prev, [sPath]: 'updating' }));

          setServerLogs((prev) => ({
            ...prev,
            [sPath]: [
              ...(prev[sPath] || []),
              '\x1b[1;35m[UPDATER] ════════════════════════════════════════════════════════════\x1b[0m',
              `\x1b[1;35m[UPDATER] ${updateCheck?.reason || 'Первичная установка / обновление ядра...'}\x1b[0m`,
              '\x1b[1;36m[UPDATER] [1/2] Загрузка файлов Rust Dedicated Server (SteamCMD)...\x1b[0m'
            ]
          }));

          const toolsDir = `${sPath}\\..\\_tools`;
          const resSteam = await (window as any).electronAPI?.installServer({
            toolsDir,
            serverFilesDir: sPath,
            validate: true
          });

          if (!resSteam?.success) {
            setServerLogs((prev) => ({
              ...prev,
              [sPath]: [...(prev[sPath] || []), `\x1b[1;33m[UPDATER NOTICE] ${resSteam?.message}\x1b[0m`]
            }));
          }

          if (activeServer.framework && activeServer.framework !== 'vanilla') {
            setServerLogs((prev) => ({
              ...prev,
              [sPath]: [
                ...(prev[sPath] || []),
                `\x1b[1;36m[UPDATER] [2/2] Загрузка мод-фреймворка ${activeServer.framework.toUpperCase()}...\x1b[0m`
              ]
            }));
            await (window as any).electronAPI?.installFramework(sPath, activeServer.framework);
          }

          setServerLogs((prev) => ({
            ...prev,
            [sPath]: [
              ...(prev[sPath] || []),
              '\x1b[1;32m[UPDATER] Проверка версий завершена! Запуск сервера...\x1b[0m',
              '\x1b[1;35m[UPDATER] ════════════════════════════════════════════════════════════\x1b[0m'
            ]
          }));
        }
      } catch (err: any) {
        setServerLogs((prev) => ({
          ...prev,
          [sPath]: [...(prev[sPath] || []), `\x1b[1;31m[UPDATER WARNING] Ошибка проверки: ${err.message}. Попытка прямого запуска...\x1b[0m`]
        }));
      }
    }

    setServerStatuses((prev) => ({ ...prev, [sPath]: 'starting' }));

    try {
      const res = await (window as any).electronAPI?.startServer(activeServer);
      if (!res.success) {
        setServerStatuses((prev) => ({ ...prev, [sPath]: 'stopped' }));
        setServerLogs((prev) => ({
          ...prev,
          [sPath]: [...(prev[sPath] || []), `[ERROR] ${res.message}`]
        }));
      }
    } catch (err: any) {
      setServerStatuses((prev) => ({ ...prev, [sPath]: 'stopped' }));
      setServerLogs((prev) => ({
        ...prev,
        [sPath]: [...(prev[sPath] || []), `[FATAL] ${err.message}`]
      }));
    }
  };

  const handleStopServer = async () => {
    const sPath = activeServer.serverPath;
    await (window as any).electronAPI?.disconnectRcon(sPath);
    await (window as any).electronAPI?.stopServer(sPath);
    setServerStatuses((prev) => ({ ...prev, [sPath]: 'stopped' }));
  };

  const handleRestartServer = async () => {
    const sPath = activeServer.serverPath;
    setServerStatuses((prev) => ({ ...prev, [sPath]: 'restarting' }));
    await handleStopServer();
    setTimeout(() => {
      handleStartServer(false);
    }, 3000);
  };

  const handleSaveServer = async () => {
    await handleSendCommand('server.save');
  };

  const handleSendCommand = async (cmd: string) => {
    const sPath = activeServer.serverPath;
    setServerLogs((prev) => ({
      ...prev,
      [sPath]: [...(prev[sPath] || []), `> ${cmd}`]
    }));

    try {
      const res = await (window as any).electronAPI?.sendRconCommand(sPath, cmd);
      if (res !== undefined && res !== null) {
        let outputText = '';
        try {
          const parsed = JSON.parse(res);
          if (parsed && typeof parsed === 'object') {
            if (parsed.Message && parsed.Message.trim().length > 0) {
              outputText = parsed.Message.trim();
            } else if (parsed.Type === 'Generic' && !parsed.Message) {
              outputText = '✔ Выполнено';
            }
          }
        } catch {
          outputText = String(res).trim();
        }

        if (outputText.length > 0) {
          setServerLogs((prev) => ({
            ...prev,
            [sPath]: [...(prev[sPath] || []), outputText]
          }));
        }
      }
    } catch (err: any) {
      setServerLogs((prev) => ({
        ...prev,
        [sPath]: [...(prev[sPath] || []), `[ОШИБКА] ${err.message || err}`]
      }));
    }
  };

  const handlePerformWipe = async (wipeType: 'full' | 'map' | 'bp') => {
    const sPath = activeServer.serverPath;
    setServerStatuses((prev) => ({ ...prev, [sPath]: 'wiping' }));
    const res = await (window as any).electronAPI?.wipeServer(sPath, wipeType);
    setServerStatuses((prev) => ({ ...prev, [sPath]: 'stopped' }));
    alert(res.message);
  };

  const handleCheckAndUpdateServer = async () => {
    const sPath = activeServer.serverPath;
    setServerStatuses((prev) => ({ ...prev, [sPath]: 'updating' }));
    
    setServerLogs((prev) => ({
      ...prev,
      [sPath]: [
        ...(prev[sPath] || []),
        `[UPDATER] Запуск полной проверки и обновления для сервера: ${activeServer.serverName}`
      ]
    }));

    try {
      const toolsDir = `${sPath}\\..\\_tools`;
      const resSteam = await (window as any).electronAPI?.installServer({
        toolsDir,
        serverFilesDir: sPath,
        validate: true,
        betaBranch: activeServer.branch || 'public'
      });

      if (!resSteam.success) {
        throw new Error(resSteam.message);
      }

      if (activeServer.framework && activeServer.framework !== 'vanilla') {
        const resMod = await (window as any).electronAPI?.installFramework(sPath, activeServer.framework);
        if (!resMod.success) {
          throw new Error(resMod.message);
        }
      }

      setServerLogs((prev) => ({
        ...prev,
        [sPath]: [
          ...(prev[sPath] || []),
          `[SUCCESS] Сервер и ядро ${activeServer.framework.toUpperCase()} успешно обновлены!`
        ]
      }));
    } catch (err: any) {
      setServerLogs((prev) => ({
        ...prev,
        [sPath]: [...(prev[sPath] || []), `[ERROR] Ошибка обновления: ${err.message}`]
      }));
    } finally {
      setServerStatuses((prev) => ({ ...prev, [sPath]: 'stopped' }));
    }
  };

  const handleReloadPlugin = (pluginName: string) => {
    const isCarbon = activeServer.framework.startsWith('carbon');
    const cmd = isCarbon ? `c.reload ${pluginName}` : `o.reload ${pluginName}`;
    handleSendCommand(cmd);
  };

  const handleInstallComplete = (serverPath: string, framework: ModFramework) => {
    const newServer: ServerConfig = {
      ...activeServer,
      serverPath,
      framework,
      serverName: `Rust Server (${framework.toUpperCase()})`
    };
    handleAddServer(newServer);
    setActiveServer(newServer);
  };

  const handleAddServer = (newServer: ServerConfig) => {
    setServers((prev) => {
      const filtered = prev.filter((s) => s.serverPath !== newServer.serverPath);
      return [newServer, ...filtered];
    });
  };

  const handleDeleteServer = (serverPath: string) => {
    setServers((prev) => prev.filter((s) => s.serverPath !== serverPath));
  };

  // Close app with check for running servers
  const handleCloseApp = () => {
    const runningList = servers.filter(
      (s) =>
        serverStatuses[s.serverPath] === 'running' ||
        serverStatuses[s.serverPath] === 'starting' ||
        serverStatuses[s.serverPath] === 'restarting'
    );

    if (runningList.length > 0) {
      setIsExitModalOpen(true);
    } else {
      (window as any).electronAPI?.exitAppNow();
    }
  };

  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    (window as any).electronAPI?.exitAppNow();
  };

  const handleMinimizeToTray = () => {
    setIsExitModalOpen(false);
    (window as any).electronAPI?.minimizeToTray();
  };

  const currentLogs = serverLogs[activeServer.serverPath] || [];
  const currentChats = serverChats[activeServer.serverPath] || [];
  const currentTelemetry = serverTelemetries[activeServer.serverPath] || {
    fps: 0,
    players: 0,
    maxPlayers: activeServer.maxPlayers,
    entities: 0,
    uptime: 0,
    memoryMb: 0,
    cpuPercent: 0,
    gpuPercent: 0,
    networkInKb: 0,
    networkOutKb: 0,
    ping: 0,
    history: []
  };
  const currentHistory = telemetryHistories[activeServer.serverPath] || [];
  const currentPlayers = serverPlayers[activeServer.serverPath] || [];
  const currentStatus = serverStatuses[activeServer.serverPath] || 'stopped';

  const activeRunningServers = servers.filter(
    (s) =>
      serverStatuses[s.serverPath] === 'running' ||
      serverStatuses[s.serverPath] === 'starting' ||
      serverStatuses[s.serverPath] === 'restarting'
  );


  return (
    <div className="h-screen w-screen flex flex-col text-slate-100 font-['Outfit'] antialiased overflow-hidden select-none relative bg-[#030611]">
      {/* ── Global Tactile Noisy Material Overlay ── */}
      <div className="noise-overlay" />

      {/* ── Background Image: Rust Skinviewer with Vignette & Cyber Grid ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 opacity-30 mix-blend-luminosity"
        style={{ backgroundImage: "url('/skinviewer_bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030611]/90 via-[#050b18]/85 to-[#02050e]/95 pointer-events-none z-0" />
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0 opacity-40" />

      {/* ── Reactive Status-Based Ambient Glow Layer ── */}
      <div
        className={`absolute inset-0 pointer-events-none z-0 ambient-glow-layer ${
          currentStatus === 'running'
            ? 'ambient-running'
            : currentStatus === 'starting' || currentStatus === 'restarting'
            ? 'ambient-starting'
            : currentStatus === 'updating'
            ? 'ambient-updating'
            : 'ambient-stopped'
        }`}
      />

      {/* ── Top Glassmorphic Navigation & Window Controls Header ── */}
      <AppHeader
        servers={servers}
        activeServer={activeServer}
        serverStatuses={serverStatuses}
        onSelectServer={setActiveServer}
        onOpenModal={setActiveModal}
        onCloseApp={handleCloseApp}
      />

      {/* ── Main Single Page: Unified Command Center (8 Telemetry Cards + Controls + Console) ── */}
      <main className="flex-1 overflow-hidden relative z-10">
        <UnifiedCommandCenter
          server={activeServer}
          status={currentStatus}
          telemetry={currentTelemetry}
          history={currentHistory}
          logs={currentLogs}
          chatMessages={currentChats}
          commandInput={commandInput}
          setCommandInput={setCommandInput}
          onStartServer={() => handleStartServer(false)}
          onQuickStart={() => handleStartServer(true)}
          onUpdateServer={handleCheckAndUpdateServer}
          onStopServer={handleStopServer}
          onRestartServer={handleRestartServer}
          onSaveServer={handleSaveServer}
          onOpenWipeModal={() => setActiveModal('wipe')}
          onOpenFolder={() => {
            if (activeServer.serverPath) {
              setServerLogs((prev) => ({
                ...prev,
                [activeServer.serverPath]: [
                  ...(prev[activeServer.serverPath] || []),
                  `[SYSTEM] Папка сервера: ${activeServer.serverPath}`
                ]
              }));
            }
          }}
          onOpenCommandLibrary={() => setActiveModal('commandLib')}
          onSendCommand={handleSendCommand}
          onClearLogs={() => {
            setServerLogs((prev) => ({ ...prev, [activeServer.serverPath]: [] }));
            setServerChats((prev) => ({ ...prev, [activeServer.serverPath]: [] }));
          }}
        />
      </main>

      {/* ── Bottom System Status Bar ── */}
      <StatusBar
        server={activeServer}
        status={currentStatus}
        telemetry={currentTelemetry}
      />

      {/* ── Modals & Overlays ── */}

      {/* 1. Players & Moderation Modal */}
      <PlayersModal
        isOpen={activeModal === 'players'}
        onClose={() => setActiveModal(null)}
        players={currentPlayers}
        serverPath={activeServer.serverPath}
        onRefresh={async () => {
          const list = await (window as any).electronAPI?.getPlayers(activeServer.serverPath);
          if (Array.isArray(list)) {
            setServerPlayers((prev) => ({ ...prev, [activeServer.serverPath]: list }));
          }
        }}
        onKick={(id: string, r: string) => handleSendCommand(`kick ${id} "${r}"`)}
        onBan={(id: string, r: string) => handleSendCommand(`ban ${id} "${r}"`)}
        onMute={(id: string) => handleSendCommand(`mute ${id}`)}
        onGiveItem={(id: string, item: string, amount: number) => handleSendCommand(`inventory.give ${id} ${item} ${amount}`)}
        onExecuteCommand={handleSendCommand}
      />

      {/* 2. Plugins & Configs Modal (Monaco IDE) */}
      <PluginsModal
        isOpen={activeModal === 'plugins'}
        onClose={() => setActiveModal(null)}
        serverPath={activeServer.serverPath}
        framework={activeServer.framework}
        onReloadPlugin={handleReloadPlugin}
      />

      {/* 3. Wipe & Auto-Update Modal */}
      <WipeSchedulerModal
        isOpen={activeModal === 'updater' || activeModal === 'wipe'}
        onClose={() => setActiveModal(null)}
        server={activeServer}
        onUpdateNow={handleCheckAndUpdateServer}
        onCreateBackup={async (name) => {
          const backupDir = `${activeServer.serverPath}\\..\\_backups`;
          return await (window as any).electronAPI?.createBackup(activeServer.serverPath, backupDir, name);
        }}
        onPerformWipe={handlePerformWipe}
      />

      {/* 4. Server Config & Startup Args Modal */}
      <ServerConfigModal
        isOpen={activeModal === 'settings'}
        onClose={() => setActiveModal(null)}
        server={activeServer}
        onUpdateConfig={(newConf) => {
          setActiveServer(newConf);
          setServers((prev) => prev.map((s) => (s.serverPath === newConf.serverPath ? newConf : s)));
        }}
        onSaveConfig={() => {
          setServerLogs((prev) => ({
            ...prev,
            [activeServer.serverPath]: [...(prev[activeServer.serverPath] || []), '[CONFIG] Конфигурация сервера сохранена.']
          }));
        }}
      />

      {/* 5. Command Library Modal */}
      <CommandLibraryModal
        isOpen={activeModal === 'commandLib'}
        onClose={() => setActiveModal(null)}
        framework={activeServer.framework}
        onExecuteCommand={handleSendCommand}
        onSelectCommand={(cmd) => setCommandInput(cmd)}
      />

      {/* 6. 1-Click Installation Wizard Modal */}
      <WizardModal
        isOpen={activeModal === 'wizard'}
        onClose={() => setActiveModal(null)}
        onInstallComplete={handleInstallComplete}
      />

      {/* 7. Multi-Server Manager Modal */}
      <ServerManagerModal
        isOpen={activeModal === 'servers'}
        onClose={() => setActiveModal(null)}
        servers={servers}
        activeServer={activeServer}
        onSelectServer={setActiveServer}
        onAddServer={handleAddServer}
        onDeleteServer={handleDeleteServer}
        onOpenWizard={() => setActiveModal('wizard')}
      />

      {/* 8. App Settings Modal */}
      <AppSettingsModal
        isOpen={activeModal === 'appSettings'}
        onClose={() => setActiveModal(null)}
      />

      {/* 9. Devblog Archive & Merger Modal */}
      <DevblogsModal
        isOpen={activeModal === 'devblogs'}
        onClose={() => setActiveModal(null)}
        onAddServer={handleAddServer}
      />

      {/* 10. In-App Plugin JSON Config & Data Editor */}
      <PluginConfigModal
        isOpen={activeModal === 'configEditor'}
        onClose={() => setActiveModal(null)}
        serverPath={activeServer.serverPath}
        framework={activeServer.framework}
        onSendCommand={handleSendCommand}
      />

      {/* 11. Automated Task & Wipe Scheduler */}
      <SchedulerModal
        isOpen={activeModal === 'scheduler'}
        onClose={() => setActiveModal(null)}
        serverPath={activeServer.serverPath}
        serverName={activeServer.serverName}
      />

      {/* 12. 1-Click Server Snapshots & Restore */}
      <BackupModal
        isOpen={activeModal === 'backups'}
        onClose={() => setActiveModal(null)}
        serverPath={activeServer.serverPath}
        serverName={activeServer.serverName}
      />

      {/* 13. Startup GitHub Releases Update Checker */}
      <StartupUpdateModal
        isOpen={isStartupChecking}
        onClose={() => setIsStartupChecking(false)}
      />

      {/* 14. Safe Exit Confirmation Modal (When Servers are active) */}
      <ExitConfirmationModal
        isOpen={isExitModalOpen}
        runningServers={activeRunningServers}
        serverStatuses={serverStatuses}
        onMinimizeToTray={handleMinimizeToTray}
        onConfirmExit={handleConfirmExit}
        onCancel={() => setIsExitModalOpen(false)}
      />
    </div>
  );
};

export default App;
