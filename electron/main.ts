import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { ProcessService } from './services/ProcessService';
import { SteamCmdService } from './services/SteamCmdService';
import { FrameworkService } from './services/FrameworkService';
import { RconService } from './services/RconService';
import { FileService } from './services/FileService';
import { PluginStoreService } from './services/PluginStoreService';
import { DevblogService } from './services/DevblogService';
import { SchedulerService } from './services/SchedulerService';
import { UpdateService } from './services/UpdateService';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

if (process.platform === 'win32') {
  app.setAppUserModelId('com.rustpilot.app');
}

// Ensure single application instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

const processService = new ProcessService();
const steamCmdService = new SteamCmdService();
const frameworkService = new FrameworkService();
const rconService = new RconService();
const fileService = new FileService();
const pluginStoreService = new PluginStoreService();
const devblogService = new DevblogService();
const schedulerService = new SchedulerService();
const updateService = new UpdateService(app.getVersion() || '1.0.0');

rconService.setProcessService(processService);
schedulerService.initServices(processService, rconService, fileService);

function getAppIcon(): Electron.NativeImage {
  const possiblePaths = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'resources/icon.ico'),
    path.join(app.getAppPath(), 'dist/icon.ico'),
    path.join(app.getAppPath(), 'public/icon.ico'),
    path.join(__dirname, '../dist/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, '../public/icon_fp_256.png'),
    path.join(__dirname, '../dist/icon_fp_256.png'),
    path.join(process.resourcesPath, 'app.asar/dist/icon_fp_256.png'),
    path.join(process.resourcesPath, 'app.asar/public/icon_fp_256.png'),
    path.join(app.getAppPath(), 'dist/icon_fp_256.png'),
    path.join(app.getAppPath(), 'public/icon_fp_256.png'),
    path.join(__dirname, 'icon_fp_256.png'),
    path.join(__dirname, '../src/assets/icon_fp_256.png'),
    'Z:\\ai\\apps\\RustPilot\\public\\icon.ico',
    'Z:\\ai\\apps\\RustPilot\\public\\icon_fp_256.png'
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          return img;
        }
      }
    } catch {}
  }

  return nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA3SURBVDhPY/wPBAwUACYqG8DAwMDIwMAwjAom1AAqGhh1AagBDIxaQNQFIH0wOAYMDAwMBgoAABjWA+0hUv4kAAAAAElFTkSuQmCC',
      'base64'
    )
  );
}

function createTray() {
  if (tray) return;

  try {
    const rawIcon = getAppIcon();
    // For Windows taskbar tray, resize or use icon directly
    const trayIcon = rawIcon.isEmpty() ? rawIcon : rawIcon.resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip('RustPilot — Панель управления серверами Rust');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'RustPilot v1.0',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Открыть панель управления',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Свернуть в трей',
        click: () => {
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Остановить серверы и выйти',
        click: async () => {
          isQuitting = true;
          const running = processService.getRunningServers();
          for (const sPath of running) {
            await processService.stopServer(sPath);
          }
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err: any) {
    console.warn('Tray initialization skipped:', err?.message);
  }
}

function createWindow() {
  const appIcon = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    center: true,
    show: true,
    backgroundColor: '#090b10',
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.show();
  mainWindow.focus();

  createTray();

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Page failed to load: ${errorCode} - ${errorDescription} (${validatedURL})`);
  });

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('[Electron] Renderer process gone:', details);
  });

  mainWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.log(`[Renderer log] [lvl ${level}] ${message} (${sourceId}:${line})`);
  });

  // Handle window close event
  mainWindow.on('close', (e) => {
    if (isQuitting) return;

    const running = processService.getRunningServers();
    if (running.length > 0) {
      // Prevent immediate close and prompt renderer for confirmation
      e.preventDefault();
      mainWindow?.webContents.send('window:close-requested', { runningCount: running.length });
    }
  });

  // Forward logs & events with serverPath metadata
  processService.on('log', (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:log', payload);
    }
  });

  processService.on('compiler-error', (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:compiler-error', payload);
    }
  });

  steamCmdService.on('log', (text) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:log', { serverPath: 'global', text });
    }
  });

  frameworkService.on('log', (text) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:log', { serverPath: 'global', text });
    }
  });

  rconService.on('log', (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:log', payload);
    }
  });

  steamCmdService.on('progress', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('steamcmd:progress', data);
    }
  });

  processService.on('status-changed', (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process:status', status);
    }
  });

  rconService.on('message', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('rcon:message', data);
    }
  });

  rconService.on('chat', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('rcon:chat', data);
    }
  });

  processService.on('chat', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('rcon:chat', data);
    }
  });

  rconService.on('telemetry', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('rcon:telemetry', data);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:set-size', (_, { width, height, resizable = true }) => {
  if (!mainWindow) return;
  mainWindow.setResizable(resizable);
  mainWindow.setSize(width, height);
  mainWindow.center();
});
ipcMain.on('window:minimize-to-tray', () => {
  if (tray) {
    mainWindow?.hide();
  } else {
    mainWindow?.minimize();
  }
});
ipcMain.on('window:close', () => {
  const running = processService.getRunningServers();
  if (running.length > 0) {
    mainWindow?.webContents.send('window:close-requested', { runningCount: running.length });
  } else {
    isQuitting = true;
    mainWindow?.close();
  }
});
ipcMain.on('app:exit-now', async () => {
  isQuitting = true;
  const running = processService.getRunningServers();
  for (const sPath of running) {
    await processService.stopServer(sPath);
  }
  app.quit();
});

// App Update IPC (GitHub Releases Check & In-App Auto-Update)
ipcMain.handle('app:check-updates', async (_, customRepo?: string) => {
  return await updateService.checkGitHubUpdates(customRepo);
});

ipcMain.handle('app:download-update', async (_, downloadUrl?: string) => {
  return await updateService.downloadUpdate(downloadUrl, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:update-progress', progress);
    }
  });
});

ipcMain.handle('app:install-update', async () => {
  return await updateService.installAndRestart();
});

// Plugin Store IPC
ipcMain.handle('plugins:store-catalog', () => pluginStoreService.getCatalog());
ipcMain.handle('plugins:store-installed', (_, { serverDir, framework }) =>
  pluginStoreService.getInstalledPlugins(serverDir, framework)
);
ipcMain.handle('plugins:store-install', (_, { serverDir, framework, pluginId }) =>
  pluginStoreService.installPlugin(serverDir, framework, pluginId)
);
ipcMain.handle('plugins:store-uninstall', (_, { serverDir, framework, pluginId }) =>
  pluginStoreService.uninstallPlugin(serverDir, framework, pluginId)
);

// Devblog IPC
ipcMain.handle('devblog:catalog', () => devblogService.getDevblogs());
ipcMain.handle('devblog:merge-depots', (_, { sourceDir, targetDir }) =>
  devblogService.mergeDepotFolders(sourceDir, targetDir)
);
ipcMain.handle('devblog:auto-install', (_, { toolsDir, targetServerDir, devblogId, depots }) =>
  steamCmdService.installDevblogServer({ toolsDir, targetServerDir, devblogId, depots })
);
ipcMain.handle('devblog:auto-install-bundle', (_, { toolsDir, targetBaseDir, devblogId, serverDepots, clientDepots, installClient }) =>
  steamCmdService.installDevblogFullBundle({ toolsDir, targetBaseDir, devblogId, serverDepots, clientDepots, installClient })
);
ipcMain.handle('devblog:launch-client', (_, { clientDir, serverPort }) =>
  devblogService.launchClient(clientDir, serverPort)
);
ipcMain.handle('devblog:assemble-bundle', (_, options) =>
  devblogService.assembleDevblogBundle(options)
);
ipcMain.handle('devblog:patch-nosteam', (_, gameDir) =>
  devblogService.patchNoSteam(gameDir)
);
ipcMain.handle('devblog:auto-download-build', async (event, options) => {
  return devblogService.autoDownloadAndBuildDevblog(options, (msg) => {
    event.sender.send('devblog:log', msg);
  });
});
ipcMain.handle('devblog:import-local', async (event, options) => {
  return devblogService.importDevblogArchiveOrFolder(options, (msg) => {
    event.sender.send('devblog:log', msg);
  });
});
ipcMain.handle('devblog:install-oxide', (_, { serverDir, devblogId }) =>
  devblogService.installOxide(serverDir, devblogId)
);

// Permissions & Groups IPC
ipcMain.handle('permissions:get-data', async (_, { serverPath, framework }) => {
  const isCarbon = framework.startsWith('carbon');
  // Default common permissions matrix
  const groups = ['default', 'vip', 'premium', 'admin'];
  const permissions = [
    { name: 'kits.use', description: 'Доступ к команде /kit', plugin: 'Kits' },
    { name: 'kits.vip', description: 'Доступ к VIP наборам', plugin: 'Kits' },
    { name: 'clans.use', description: 'Создание кланов /clan', plugin: 'ClanSystem' },
    { name: 'bgrade.use', description: 'Авто-улучшение построек /bgrade', plugin: 'BGrade' },
    { name: 'removertool.use', description: 'Удаление своих построек /remove', plugin: 'RemoverTool' },
    { name: 'removertool.admin', description: 'Удаление любых построек карты', plugin: 'RemoverTool' },
    { name: 'autocodelock.use', description: 'Автоматический ввод код-паролей', plugin: 'AutoCodeLock' },
    { name: 'noclip', description: 'Режим полета сквозь стены (Admin)', plugin: 'RustCore' },
    { name: 'vanish', description: 'Полная невидимость на сервере', plugin: 'Vanish' }
  ];

  return { groups, permissions };
});

ipcMain.handle('permissions:grant', async (_, { serverPath, framework, targetType, targetName, permission }) => {
  const isCarbon = framework.startsWith('carbon');
  const cmd = isCarbon
    ? `c.grant ${targetType} "${targetName}" ${permission}`
    : `o.grant ${targetType} "${targetName}" ${permission}`;
  return await rconService.sendCommand(serverPath, cmd);
});

ipcMain.handle('permissions:revoke', async (_, { serverPath, framework, targetType, targetName, permission }) => {
  const isCarbon = framework.startsWith('carbon');
  const cmd = isCarbon
    ? `c.revoke ${targetType} "${targetName}" ${permission}`
    : `o.revoke ${targetType} "${targetName}" ${permission}`;
  return await rconService.sendCommand(serverPath, cmd);
});

// Bans & Inventory Management IPC
ipcMain.handle('bans:list', async (_, serverPath) => {
  try {
    const bansFile = path.join(serverPath, 'server', 'rustserver', 'cfg', 'bans.cfg');
    if (fs.existsSync(bansFile)) {
      const content = fs.readFileSync(bansFile, 'utf8');
      const lines = content.split(/\r?\n/);
      const bans: { steamId: string; username: string; reason: string }[] = [];
      for (const l of lines) {
        // format: banid 76561198... "Username" "Reason"
        const match = l.match(/banid\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"/i);
        if (match) {
          bans.push({ steamId: match[1], username: match[2], reason: match[3] });
        }
      }
      return bans;
    }
  } catch {}
  return [];
});

ipcMain.handle('bans:unban', async (_, { serverPath, steamId }) => {
  return await rconService.sendCommand(serverPath, `unban ${steamId}`);
});

ipcMain.handle('inventory:view', async (_, { serverPath, steamId }) => {
  // Return structured slots for the player inventory UI
  return {
    steamId,
    main: Array.from({ length: 24 }, (_, i) => ({
      slot: i,
      name: i === 0 ? 'wood' : i === 1 ? 'stones' : i === 2 ? 'metal.refined' : 'empty',
      displayName: i === 0 ? 'Дерево' : i === 1 ? 'Камень' : i === 2 ? 'МВК' : 'Пусто',
      amount: i === 0 ? 5000 : i === 1 ? 3000 : i === 2 ? 150 : 0
    })),
    belt: Array.from({ length: 6 }, (_, i) => ({
      slot: i,
      name: i === 0 ? 'rifle.ak' : i === 1 ? 'ammo.rifle' : i === 2 ? 'syringe.medical' : 'empty',
      displayName: i === 0 ? 'Assault Rifle (AK-47)' : i === 1 ? 'Патроны 5.56' : i === 2 ? 'Шприц' : 'Пусто',
      amount: i === 0 ? 1 : i === 1 ? 128 : i === 2 ? 4 : 0
    })),
    wear: Array.from({ length: 7 }, (_, i) => ({
      slot: i,
      name: i === 0 ? 'metal.facemask' : i === 1 ? 'metal.plate.torso' : i === 2 ? 'hoodie' : 'empty',
      displayName: i === 0 ? 'Металлическая маска' : i === 1 ? 'Металлический нагрудник' : i === 2 ? 'Толстовка' : 'Пусто',
      amount: i < 3 ? 1 : 0
    }))
  };
});

// Process IPC
ipcMain.handle('process:start', async (_, options) => {
  const result = await processService.startServer(options);
  if (result.success) {
    rconService.autoConnect(options.serverPath, '127.0.0.1', options.rconPort, options.rconPassword);
  }
  return result;
});
ipcMain.handle('process:stop', async (_, serverPath) => {
  rconService.disconnect(serverPath);
  return await processService.stopServer(serverPath);
});
ipcMain.handle('process:status', (_, serverPath) => processService.isRunning(serverPath));
ipcMain.handle('process:metrics', (_, serverPath) => processService.getProcessMetrics(serverPath));
ipcMain.handle('process:running-list', () => processService.getRunningServers());
ipcMain.handle('process:wipe', (_, { serverPath, wipeType }) => processService.performWipe(serverPath, wipeType));

// SteamCMD IPC
ipcMain.handle('steamcmd:install', (_, options) => steamCmdService.installOrUpdateServer(options));
ipcMain.handle('steamcmd:check-needed', (_, serverDir, branch) => steamCmdService.checkIfUpdateNeeded(serverDir, branch));
ipcMain.handle('steamcmd:cancel', () => steamCmdService.cancel());

// Framework IPC
ipcMain.handle('framework:install', (_, { serverDir, framework }) => frameworkService.installFramework(serverDir, framework));
ipcMain.handle('framework:is-installed', (_, { serverDir, framework }) => frameworkService.isFrameworkInstalled(serverDir, framework));

// RCON IPC
ipcMain.handle('rcon:connect', (_, { serverPath, ip, port, pass }) => rconService.connect(serverPath, ip, port, pass));
ipcMain.handle('rcon:disconnect', (_, serverPath) => rconService.disconnect(serverPath));
ipcMain.handle('rcon:send', (_, { serverPath, cmd }) => rconService.sendCommand(serverPath, cmd));
ipcMain.handle('rcon:players', (_, serverPath) => rconService.getPlayers(serverPath));
ipcMain.handle('rcon:status', (_, serverPath) => rconService.isConnected(serverPath));

// File IPC
ipcMain.handle('file:list', (_, { dir, subfolder }) => fileService.listFiles(dir, subfolder));
ipcMain.handle('file:read', (_, filePath) => fileService.readFile(filePath));
ipcMain.handle('file:write', (_, { filePath, content }) => fileService.writeFile(filePath, content));
ipcMain.handle('file:delete', (_, filePath) => fileService.deleteFile(filePath));
ipcMain.handle('file:backup', (_, { serverDir, backupDir, name }) => fileService.createBackup(serverDir, backupDir, name));
ipcMain.handle('backup:list', (_, backupDir) => fileService.listBackups(backupDir));
ipcMain.handle('backup:restore', (_, { zipPath, serverDir }) => fileService.restoreBackup(zipPath, serverDir));
ipcMain.handle('server:detect', (_, dirPath) => fileService.detectServerConfig(dirPath));
ipcMain.handle('server:validate-list', (_, serverPaths: string[]) => fileService.validateServers(serverPaths));
ipcMain.handle('server:auto-discover', () => fileService.autoDiscoverServers());
ipcMain.handle('plugins:list-configs', (_, serverDir) => fileService.listPluginConfigs(serverDir));

// Scheduler IPC
ipcMain.handle('scheduler:get-tasks', (_, serverPath) => schedulerService.getTasks(serverPath));
ipcMain.handle('scheduler:save-tasks', (_, tasks) => schedulerService.saveTasks(tasks));

// Directory picker
ipcMain.handle('dialog:selectDir', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory']
  });
  return result.filePaths.length > 0 ? result.filePaths[0] : null;
});

// File picker
ipcMain.handle('dialog:selectFile', async (_, options?: { title?: string; filters?: any[] }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: options?.title || 'Выберите файл архива (.zip) или сборку',
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'Архивы сборок Rust (*.zip, *.7z, *.rar, *.tar, *.gz)', extensions: ['zip', '7z', 'rar', 'tar', 'gz'] },
      { name: 'Все файлы (*.*)', extensions: ['*'] }
    ]
  });
  return result.filePaths.length > 0 ? result.filePaths[0] : null;
});

// System external URL
ipcMain.handle('system:openExternal', async (_, url: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    await shell.openExternal(url);
    return { success: true };
  }
  return { success: false, message: 'Invalid URL' };
});

app.whenReady().then(() => {
  updateService.setOptions({
    appVersion: app.getVersion() || '1.0.0',
    isPackaged: app.isPackaged,
    exePath: app.getPath('exe'),
    resourcesPath: process.resourcesPath,
    tempPath: app.getPath('temp'),
    quitApp: () => {
      isQuitting = true;
      app.exit(0);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
