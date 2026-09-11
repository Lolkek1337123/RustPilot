import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Process Multi-Instance
  startServer: (options: any) => ipcRenderer.invoke('process:start', options),
  stopServer: (serverPath: string) => ipcRenderer.invoke('process:stop', serverPath),
  getServerStatus: (serverPath: string) => ipcRenderer.invoke('process:status', serverPath),
  getProcessMetrics: (serverPath: string) => ipcRenderer.invoke('process:metrics', serverPath),
  getRunningServers: () => ipcRenderer.invoke('process:running-list'),
  wipeServer: (serverPath: string, wipeType: 'full' | 'map' | 'bp') => ipcRenderer.invoke('process:wipe', { serverPath, wipeType }),
  getCpuTopology: () => ipcRenderer.invoke('process:cpu-topology'),
  checkPortConflicts: (config: any) => ipcRenderer.invoke('process:check-ports', config),

  // SteamCMD
  installServer: (options: any) => ipcRenderer.invoke('steamcmd:install', options),
  checkServerUpdateNeeded: (serverDir: string, branch?: string) => ipcRenderer.invoke('steamcmd:check-needed', serverDir, branch),
  cancelSteamCmd: () => ipcRenderer.invoke('steamcmd:cancel'),

  // Frameworks
  installFramework: (serverDir: string, framework: string) => ipcRenderer.invoke('framework:install', { serverDir, framework }),
  isFrameworkInstalled: (serverDir: string, framework: string) => ipcRenderer.invoke('framework:is-installed', { serverDir, framework }),

  // RCON Multi-Instance
  connectRcon: (serverPath: string, ip: string, port: number, pass: string) => ipcRenderer.invoke('rcon:connect', { serverPath, ip, port, pass }),
  disconnectRcon: (serverPath: string) => ipcRenderer.invoke('rcon:disconnect', serverPath),
  sendRconCommand: (serverPath: string, cmd: string) => ipcRenderer.invoke('rcon:send', { serverPath, cmd }),
  getPlayers: (serverPath: string) => ipcRenderer.invoke('rcon:players', serverPath),
  getRconStatus: (serverPath: string) => ipcRenderer.invoke('rcon:status', serverPath),

  // Files & Configs
  listFiles: (dir: string, subfolder?: string) => ipcRenderer.invoke('file:list', { dir, subfolder }),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', { filePath, content }),
  deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
  createBackup: (serverDir: string, backupDir: string, name: string) => ipcRenderer.invoke('file:backup', { serverDir, backupDir, name }),
  listBackups: (backupDir: string) => ipcRenderer.invoke('backup:list', backupDir),
  restoreBackup: (zipPath: string, serverDir: string) => ipcRenderer.invoke('backup:restore', { zipPath, serverDir }),
  detectServer: (dirPath: string) => ipcRenderer.invoke('server:detect', dirPath),
  validateServers: (serverPaths: string[]) => ipcRenderer.invoke('server:validate-list', serverPaths),
  autoDiscoverServers: () => ipcRenderer.invoke('server:auto-discover'),
  listPluginConfigs: (serverDir: string) => ipcRenderer.invoke('plugins:list-configs', serverDir),
  copyMapToServer: (options: { mapFilePath: string; serverDir: string; identity?: string }) =>
    ipcRenderer.invoke('map:copy-to-server', options),
  uploadMapToFacepunch: (mapFilePath: string) =>
    ipcRenderer.invoke('map:upload-to-facepunch', mapFilePath),
  onMapUploadProgress: (callback: (data: { percent: number; mapFilePath: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('map:upload-progress', handler);
    return () => ipcRenderer.off('map:upload-progress', handler);
  },

  // Scheduler Tasks
  getScheduledTasks: (serverPath?: string) => ipcRenderer.invoke('scheduler:get-tasks', serverPath),
  saveScheduledTasks: (tasks: any[]) => ipcRenderer.invoke('scheduler:save-tasks', tasks),

  // Plugin Store (1-Click Store)
  getPluginCatalog: () => ipcRenderer.invoke('plugins:store-catalog'),
  searchPluginCatalog: (options: any) => ipcRenderer.invoke('plugins:store-search', options),
  getInstalledStorePlugins: (serverDir: string, framework: string) =>
    ipcRenderer.invoke('plugins:store-installed', { serverDir, framework }),
  installStorePlugin: (serverDir: string, framework: string, pluginId: string) =>
    ipcRenderer.invoke('plugins:store-install', { serverDir, framework, pluginId }),
  uninstallStorePlugin: (serverDir: string, framework: string, pluginId: string) =>
    ipcRenderer.invoke('plugins:store-uninstall', { serverDir, framework, pluginId }),

  // Devblog Archive & Merger
  getDevblogCatalog: () => ipcRenderer.invoke('devblog:catalog'),
  mergeDevblogDepots: (sourceDir: string, targetDir: string) =>
    ipcRenderer.invoke('devblog:merge-depots', { sourceDir, targetDir }),
  autoInstallDevblogServer: (options: { toolsDir: string; targetServerDir: string; devblogId: number; depots: any[] }) =>
    ipcRenderer.invoke('devblog:auto-install', options),
  autoInstallDevblogBundle: (options: {
    toolsDir: string;
    targetBaseDir: string;
    devblogId: number;
    serverDepots: any[];
    clientDepots?: any[];
    installClient?: boolean;
  }) => ipcRenderer.invoke('devblog:auto-install-bundle', options),
  launchDevblogClient: (clientDir: string, serverPort?: number) =>
    ipcRenderer.invoke('devblog:launch-client', { clientDir, serverPort }),
  assembleDevblogBundle: (options: any) =>
    ipcRenderer.invoke('devblog:assemble-bundle', options),
  patchNoSteam: (gameDir: string) =>
    ipcRenderer.invoke('devblog:patch-nosteam', gameDir),
  autoDownloadAndBuildDevblog: (options: any) =>
    ipcRenderer.invoke('devblog:auto-download-build', options),
  importDevblogLocal: (options: any) =>
    ipcRenderer.invoke('devblog:import-local', options),
  installOxide: (serverDir: string, devblogId: number) =>
    ipcRenderer.invoke('devblog:install-oxide', { serverDir, devblogId }),
  onDevblogLog: (callback: (msg: string) => void) => {
    const handler = (_: any, msg: string) => callback(msg);
    ipcRenderer.on('devblog:log', handler);
    return () => ipcRenderer.removeListener('devblog:log', handler);
  },

  // Permissions & Groups GUI
  getPermissionsData: (serverPath: string, framework: string) =>
    ipcRenderer.invoke('permissions:get-data', { serverPath, framework }),
  grantPermission: (serverPath: string, framework: string, targetType: 'group' | 'user', targetName: string, permission: string) =>
    ipcRenderer.invoke('permissions:grant', { serverPath, framework, targetType, targetName, permission }),
  revokePermission: (serverPath: string, framework: string, targetType: 'group' | 'user', targetName: string, permission: string) =>
    ipcRenderer.invoke('permissions:revoke', { serverPath, framework, targetType, targetName, permission }),

  // Bans & Inventory Management
  getBansList: (serverPath: string) => ipcRenderer.invoke('bans:list', serverPath),
  unbanPlayer: (serverPath: string, steamId: string) => ipcRenderer.invoke('bans:unban', { serverPath, steamId }),
  getPlayerInventory: (serverPath: string, steamId: string) => ipcRenderer.invoke('inventory:view', { serverPath, steamId }),

  // Dialogs & System External
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDir'),
  selectFile: (options?: any) => ipcRenderer.invoke('dialog:selectFile', options),
  openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  openUrl: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  openPath: (targetPath: string) => ipcRenderer.invoke('system:open-path', targetPath),
  setAutostart: (enabled: boolean) => ipcRenderer.invoke('system:set-autostart', enabled),

  // Event Listeners
  onLog: (callback: (data: { serverPath: string; text: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('app:log', handler);
    return () => ipcRenderer.off('app:log', handler);
  },
  onCompilerError: (callback: (data: { serverPath: string; pluginName: string; line: number; column: number; errorCode: string; message: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('app:compiler-error', handler);
    return () => ipcRenderer.off('app:compiler-error', handler);
  },
  onDownloadProgress: (callback: (data: { stage: string; percent: number }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('steamcmd:progress', handler);
    return () => ipcRenderer.off('steamcmd:progress', handler);
  },
  onProcessStatus: (callback: (data: { serverPath: string; status: string; pid?: number }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('process:status', handler);
    return () => ipcRenderer.off('process:status', handler);
  },
  onRconMessage: (callback: (data: { serverPath: string; packet: any }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('rcon:message', handler);
    return () => ipcRenderer.off('rcon:message', handler);
  },
  onChatMessage: (callback: (data: { serverPath: string; message: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('rcon:chat', handler);
    return () => ipcRenderer.off('rcon:chat', handler);
  },
  onTelemetry: (callback: (data: { serverPath: string; telemetry: any }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('rcon:telemetry', handler);
    return () => ipcRenderer.off('rcon:telemetry', handler);
  },

  // Window & Tray Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  setWindowSize: (width: number, height: number, resizable: boolean = true) =>
    ipcRenderer.send('window:set-size', { width, height, resizable }),
  minimizeToTray: () => ipcRenderer.send('window:minimize-to-tray'),
  closeWindow: () => ipcRenderer.send('window:close'),
  exitAppNow: () => ipcRenderer.send('app:exit-now'),

  // App Updates & Direct In-App Auto-Updater
  checkAppUpdates: (customRepo?: string) => ipcRenderer.invoke('app:check-updates', customRepo),
  downloadAppUpdate: (downloadUrl?: string) => ipcRenderer.invoke('app:download-update', downloadUrl),
  installAppUpdate: () => ipcRenderer.invoke('app:install-update'),
  onUpdateProgress: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('app:update-progress', handler);
    return () => ipcRenderer.off('app:update-progress', handler);
  },

  onCloseRequested: (callback: (data: { runningCount: number }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('window:close-requested', handler);
    return () => ipcRenderer.off('window:close-requested', handler);
  }
});
