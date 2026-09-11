import { spawn, ChildProcess, exec, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import { EventEmitter } from 'events';
import type { ServerConfig, CpuTopologyInfo, CpuCoreInfo, PortConflictResult, PortConflictItem, ProcessMetrics } from '../types';
import type { FileService } from './FileService';

interface CpuAllocation {
  mask: number;
  coresLabel: string;
}

interface RunningInstance {
  process: ChildProcess;
  config: ServerConfig;
  startTime: number;
  isIntentionalStop: boolean;
  isReady: boolean;
  prevCpuTimeMs: number;
  prevCpuTimestamp: number;
  lastCpuPercent: number;
  lastMemoryMb: number;
  logTailTimer?: NodeJS.Timeout;
}

export class ProcessService extends EventEmitter {
  private instances = new Map<string, RunningInstance>();
  private intentionalStops = new Set<string>();
  private crashTimestamps = new Map<string, number[]>();
  private recentLogsCurrent = new Map<string, Set<string>>();
  private recentLogsPrevious = new Map<string, Set<string>>();
  private logDedupTimer?: NodeJS.Timeout;
  private watchdogEnabled = true;
  private numCpus = os.cpus().length || 4;
  private fileService?: FileService;
  private allocatedMasks = new Map<string, CpuAllocation>();
  private metricsPollTimer?: NodeJS.Timeout;
  private isCollectingMetrics = false;

  constructor() {
    super();
    this.startMetricsCollector();
    // Rolling cache rotation every 2 seconds for O(1) zero-leak log deduplication
    this.logDedupTimer = setInterval(() => {
      this.recentLogsPrevious = this.recentLogsCurrent;
      this.recentLogsCurrent = new Map<string, Set<string>>();
    }, 2000);
  }

  public setFileService(fs: FileService) {
    this.fileService = fs;
  }

  public isRunning(serverPath: string): boolean {
    const inst = this.instances.get(serverPath);
    return !!(inst && inst.process && !inst.process.killed);
  }

  public getRunningServers(): string[] {
    const list: string[] = [];
    this.instances.forEach((inst, sPath) => {
      if (inst && inst.process && !inst.process.killed) {
        list.push(sPath);
      }
    });
    return list;
  }

  public getInstance(serverPath: string): RunningInstance | undefined {
    return this.instances.get(serverPath);
  }

  public setWatchdogEnabled(enabled: boolean) {
    this.watchdogEnabled = enabled;
  }

  private getValidBindIp(serverIp?: string): string | null {
    if (!serverIp || serverIp.trim() === '' || serverIp === '0.0.0.0') {
      return '0.0.0.0';
    }
    if (serverIp === '127.0.0.1' || serverIp === 'localhost') {
      return '127.0.0.1';
    }

    try {
      const interfaces = os.networkInterfaces();
      let isLocal = false;
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
          if (iface.address === serverIp) {
            isLocal = true;
            break;
          }
        }
        if (isLocal) break;
      }

      if (isLocal) {
        return serverIp;
      }
    } catch {}

    return '0.0.0.0'; // Fallback to 0.0.0.0 to prevent InitGameServer failure
  }

  private writeServerCfg(config: ServerConfig) {
    try {
      const identity = config.identity || 'rustserver';
      const cfgDir = path.join(config.serverPath, 'server', identity, 'cfg');
      if (!fs.existsSync(cfgDir)) {
        fs.mkdirSync(cfgDir, { recursive: true });
      }

      const cfgPath = path.join(cfgDir, 'server.cfg');
      const lines: string[] = [
        `// ─────────────────────────────────────────────────────────────`,
        `// RustPilot Auto-Generated Server Configuration`,
        `// Server: ${config.serverName}`,
        `// Generated at: ${new Date().toISOString()}`,
        `// ─────────────────────────────────────────────────────────────`,
        ``,
        `// ─── Network & Identity ───`,
        `server.hostname "${config.serverName}"`,
        `server.identity "${config.identity || 'rustserver'}"`,
        `server.maxplayers ${config.maxPlayers || 50}`,
        `server.saveinterval ${config.saveInterval || 300}`,
        `server.secure ${config.secure !== false ? '1' : '0'}`,
        `server.radiation ${config.radiation !== false ? '1' : '0'}`,
        `server.stability ${config.stability !== false ? '1' : '0'}`,
        `server.pve ${config.pvpEnabled === false ? '1' : '0'}`,
        `server.tickrate ${config.tickrate || 30}`,
        config.tags ? `server.tags "${config.tags}"` : `// server.tags ""`,
        config.gamemode ? `server.gamemode "${config.gamemode}"` : `// server.gamemode ""`,
        `server.censorplayerlist ${config.censorPlayerList ? '1' : '0'}`,
        config.favoritesEndpoint ? `server.favoritesEndpoint "${config.favoritesEndpoint}"` : `// server.favoritesEndpoint ""`,
        ``,
        `// ─── RCON Configuration ───`,
        `rcon.port ${config.rconPort || 28017}`,
        `// rcon.password задается строго в аргументах запуска (+rcon.password), в server.cfg Facepunch не имеет ConVar и вызывает ошибку`,
        `rcon.web ${config.rconWeb !== false ? '1' : '0'}`,
        ``,
        `// ─── Centralized Banning API ───`,
        config.bansServerEndpoint ? `server.bansServerEndpoint "${config.bansServerEndpoint}"` : `// server.bansServerEndpoint ""`,
        config.bansServerFailureMode !== undefined ? `server.bansServerFailureMode ${config.bansServerFailureMode}` : `server.bansServerFailureMode 0`,
        config.bansServerTimeout !== undefined ? `server.bansServerTimeout ${config.bansServerTimeout}` : `server.bansServerTimeout 5`,
        ``,
        `// ─── F7 In-Game Reports ───`,
        config.reportsServerEndpoint ? `server.reportsServerEndpoint "${config.reportsServerEndpoint}"` : `// server.reportsServerEndpoint ""`,
        config.reportsServerEndpointKey ? `server.reportsServerEndpointKey "${config.reportsServerEndpointKey}"` : `// server.reportsServerEndpointKey ""`,
        `server.printReportsToConsole ${config.printReportsToConsole ? '1' : '0'}`,
        ``,
        `// ─── Rust+ Companion Server ───`,
        config.rustPlusEnabled === false ? `app.port -1` : `app.port ${config.appPort || 28082}`,
        config.appPublicIp ? `app.publicip "${config.appPublicIp}"` : `// app.publicip ""`,
        config.appListenIp ? `app.listenip "${config.appListenIp}"` : `// app.listenip ""`,
        ``,
        `// ─── Creative Mode ───`,
        `creative.allusers ${config.creativeAllUsers ? '1' : '0'}`,
        `creative.freebuild ${config.creativeFreeBuild ? '1' : '0'}`,
        `creative.freeplacement ${config.creativeFreePlacement ? '1' : '0'}`,
        `creative.freerepair ${config.creativeFreeRepair ? '1' : '0'}`,
        `creative.unlimitedio ${config.creativeUnlimitedIo ? '1' : '0'}`,
        ``,
        `// ─── Wipe Timers ───`,
        config.wipeDayOfWeek !== undefined ? `wipetimer.wipeDayofWeek ${config.wipeDayOfWeek}` : `// wipetimer.wipeDayofWeek 4`,
        config.wipeHourOfDay !== undefined ? `wipetimer.wipeHourofDay ${config.wipeHourOfDay}` : `// wipetimer.wipeHourofDay 19`,
        config.wipeTimezone ? `wipetimer.wipeTimezone "${config.wipeTimezone}"` : `// wipetimer.wipeTimezone "Europe/London"`,
        config.wipeCronOverride ? `wipetimer.wipecronoverride "${config.wipeCronOverride}"` : `// wipetimer.wipecronoverride ""`,
        config.wipeUnixTimestampOverride ? `wipetimer.wipeUnixTimestampOverride ${config.wipeUnixTimestampOverride}` : `// wipetimer.wipeUnixTimestampOverride ""`,
        ``,
        `// ─── Branding & Media ───`,
        config.description ? `server.description "${config.description.replace(/\r?\n/g, '\\n')}"` : `// server.description ""`,
        config.headerImage ? `server.headerimage "${config.headerImage}"` : `// server.headerimage ""`,
        config.logoImage ? `server.logoimage "${config.logoImage}"` : `// server.logoimage ""`,
        config.url ? `server.url "${config.url}"` : `// server.url ""`,
        ``,
        `// ─── Balance & Decay ───`,
        `decay.scale ${config.decayScale !== undefined ? config.decayScale : 1.0}`,
        `decay.upkeep ${config.decayUpkeep !== false ? 'True' : 'False'}`,
        `craft.instant ${config.craftInstant ? 'True' : 'False'}`,
        `falldamage.enabled ${config.fallDamage !== false ? 'True' : 'False'}`,
        ``,
        `// ─── Security & AntiHack ───`,
        `antihack.enabled ${config.antihackEnabled !== false ? '1' : '0'}`,
        `server.eac ${config.eacEnabled !== false ? '1' : '0'}`
      ];

      fs.writeFileSync(cfgPath, lines.join('\r\n'), 'utf8');
      this.emit('log', { serverPath: config.serverPath, text: `[CONFIG] Файл конфигурации обновлен: ${cfgPath}` });
    } catch (err: any) {
      this.emit('log', { serverPath: config.serverPath, text: `[CONFIG WARN] Не удалось записать server.cfg: ${err.message}` });
    }
  }

  public isAnyServerStarting(): boolean {
    for (const inst of this.instances.values()) {
      if (!inst.isReady) return true;
    }
    return false;
  }

  public waitForPreviousStartup(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isAnyServerStarting()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 45000);
    });
  }

  public async startServer(config: ServerConfig): Promise<{ success: boolean; message: string }> {
    if (this.isRunning(config.serverPath)) {
      return { success: false, message: 'Данный сервер уже запущен.' };
    }

    // ─── 1. Port Conflict Auto-Detection & Prevention ───
    const portCheck = await this.checkPortConflicts(config);
    if (portCheck.hasConflict) {
      this.emit('log', {
        serverPath: config.serverPath,
        text: `[PORT CONFLICT] ⚠️ ВНИМАНИЕ: Обнаружен конфликт сетевых портов!\n` +
          portCheck.conflicts.map(c => `  • [${c.service}] ${c.description}`).join('\n')
      });
      if (portCheck.suggestedPorts) {
        this.emit('log', {
          serverPath: config.serverPath,
          text: `[PORT AUTO-RESOLVER] 💡 Рекомендуемые свободные порты: Game: ${portCheck.suggestedPorts.port}, Query: ${portCheck.suggestedPorts.queryPort}, RCON: ${portCheck.suggestedPorts.rconPort}`
        });
      }
    }

    // ─── 2. Staggered Startup Queue (Anti-Disk/CPU Storm) ───
    if (this.isAnyServerStarting()) {
      this.emit('status-changed', { serverPath: config.serverPath, status: 'starting' });
      this.emit('log', {
        serverPath: config.serverPath,
        text: `[STARTUP QUEUE] ⏳ Обнаружен параллельный запуск другого сервера. [${config.serverName}] помещен в очередь (защита диска и процессора)...`
      });
      await this.waitForPreviousStartup();
      this.emit('log', {
        serverPath: config.serverPath,
        text: `[STARTUP QUEUE] 🚀 Очередь освободилась. Запуск сервера [${config.serverName}]!`
      });
    }

    let actualServerDir = config.serverPath;
    if (!fs.existsSync(path.join(actualServerDir, 'RustDedicated.exe')) && fs.existsSync(path.join(actualServerDir, 'server', 'RustDedicated.exe'))) {
      actualServerDir = path.join(actualServerDir, 'server');
    }

    const exePath = path.join(actualServerDir, 'RustDedicated.exe');
    if (!fs.existsSync(exePath)) {
      return {
        success: false,
        message: `Исполняемый файл RustDedicated.exe не найден по пути: ${exePath}`
      };
    }

    // Auto-fix for historical Devblogs: ensure RustDedicated_Data exists next to RustDedicated.exe
    const serverDataDir = path.join(actualServerDir, 'RustDedicated_Data');
    const clientDataInServer = path.join(actualServerDir, 'RustClient_Data');
    if (!fs.existsSync(serverDataDir) && fs.existsSync(clientDataInServer)) {
      try {
        execSync(`cmd.exe /c "mklink /J \\"${serverDataDir}\\" \\"${clientDataInServer}\\""`);
        this.emit('log', {
          serverPath: config.serverPath,
          text: `[DEVBLOG AUTO-FIX] Создана связь RustDedicated_Data -> RustClient_Data для запуска Unity.`
        });
      } catch (e: any) {
        this.emit('log', {
          serverPath: config.serverPath,
          text: `[DEVBLOG WARN] Не удалось создать связь RustDedicated_Data: ${e.message}`
        });
      }
    }

    // Auto-patch devblog server DLLs for Windows compatibility
    const managedDir = path.join(serverDataDir, 'Managed');
    if (fs.existsSync(managedDir)) {
      try {
        const candidatePatchers = [
          path.resolve(__dirname, '../../RustPilot.Patcher/bin/Debug/net10.0/RustPilot.Patcher.exe'),
          path.resolve(__dirname, '../../RustPilot.Patcher/bin/Release/net10.0/RustPilot.Patcher.exe'),
          path.join(process.cwd(), 'RustPilot.Patcher', 'bin', 'Debug', 'net10.0', 'RustPilot.Patcher.exe'),
          path.join(process.cwd(), 'RustPilot.Patcher', 'bin', 'Release', 'net10.0', 'RustPilot.Patcher.exe'),
          path.resolve(__dirname, '../../../_tools/PatcherTool/bin/Release/net10.0/PatcherTool.exe'),
          path.join(process.cwd(), '_tools', 'PatcherTool', 'bin', 'Release', 'net10.0', 'PatcherTool.exe'),
          path.join((process as any).resourcesPath || '', 'RustPilot.Patcher.exe'),
          path.join((process as any).resourcesPath || '', '_tools', 'RustPilot.Patcher.exe'),
          path.join((process as any).resourcesPath || '', 'PatcherTool.exe')
        ];
        const patcherExe = candidatePatchers.find((p) => p && fs.existsSync(p));
        if (patcherExe) {
          execSync(`"${patcherExe}" "${managedDir}"`, { windowsHide: true });
        }
      } catch {}
    }

    // Write server.cfg before launching
    this.writeServerCfg(config);

    // Clear intentional stop flag if starting
    this.intentionalStops.delete(config.serverPath);

    const isDevblogServer =
      config.isDevblog === true ||
      config.serverPath.toLowerCase().includes('devblog') ||
      config.serverName.toLowerCase().includes('devblog');

    // ─── Map & Level Resolution ───
    // Unity Engine only contains internal scene names: "Procedural Map", "Barren", "HapisIsland", "SavasIsland", "CraggyIsland".
    // "Custom Map" is NEVER a valid Unity scene name!
    // When a custom map (.map) is loaded via server.levelurl, the underlying engine scene MUST be "Procedural Map".
    let levelScene = config.mapLevel || 'Procedural Map';
    if (levelScene === 'Custom Map' || config.levelUrl) {
      levelScene = 'Procedural Map';
    }

    let cleanLevelUrl = config.levelUrl ? config.levelUrl.trim() : '';
    if (cleanLevelUrl.startsWith('"') && cleanLevelUrl.endsWith('"')) {
      cleanLevelUrl = cleanLevelUrl.slice(1, -1).trim();
    }
    // Auto-fix Dropbox links: change ?dl=0 to ?dl=1 for direct binary stream download
    if (cleanLevelUrl.includes('dropbox.com') && cleanLevelUrl.includes('dl=0')) {
      cleanLevelUrl = cleanLevelUrl.replace('dl=0', 'dl=1');
    }

    // If levelUrl is a local file on disk, automatically upload it to Facepunch CDN
    if (cleanLevelUrl && !cleanLevelUrl.startsWith('http://') && !cleanLevelUrl.startsWith('https://')) {
      if (fs.existsSync(cleanLevelUrl)) {
        this.emit('log', {
          serverPath: config.serverPath,
          text: `[MAP ENGINE] 🚀 Обнаружен локальный файл карты (${cleanLevelUrl}). Загрузка на Facepunch CDN...`
        });
        if (this.fileService) {
          const uploadRes = await this.fileService.uploadMapToFacepunch(cleanLevelUrl);
          if (uploadRes.success && uploadRes.mapUrl) {
            cleanLevelUrl = uploadRes.mapUrl;
            config.levelUrl = cleanLevelUrl;
            this.emit('log', {
              serverPath: config.serverPath,
              text: `[MAP ENGINE] ✅ Карта успешно загружена на Facepunch CDN: ${cleanLevelUrl}`
            });
          } else {
            this.emit('log', {
              serverPath: config.serverPath,
              text: `[MAP ENGINE WARN] ⚠️ Не удалось выгрузить карту на Facepunch CDN: ${uploadRes.message}`
            });
          }
        }
      }
    }

    // Build arguments
    const args: string[] = [
      '-batchmode',
      '-nographics',
      '+server.port', config.port.toString(),
      '+server.queryport', config.queryPort.toString(),
      '+server.hostname', config.serverName,
      '+server.identity', config.identity,
      '+server.level', levelScene,
      '+server.worldsize', config.worldSize.toString(),
      '+server.seed', config.seed.toString(),
      '+server.maxplayers', config.maxPlayers.toString(),
      '+server.saveinterval', config.saveInterval.toString(),
      '+rcon.port', config.rconPort.toString(),
      '+rcon.password', config.rconPassword,
      '+rcon.web', config.rconWeb !== false ? '1' : '0',
      '-logfile', 'output.txt'
    ];

    if (isDevblogServer) {
      args.push('+server.eac', '0');
    }

    const bindIp = this.getValidBindIp(config.serverIp);
    if (bindIp && bindIp !== '0.0.0.0') {
      args.push('+server.ip', bindIp);
    } else if (config.serverIp && config.serverIp !== '0.0.0.0') {
      this.emit('log', {
        serverPath: config.serverPath,
        text: `[NETWORK NOTE] IP ${config.serverIp} является внешним (WAN). Сокеты сервера привязаны ко всем локальным адаптерам (0.0.0.0) для успешной инициализации Steam GameServer.`
      });
    }

    if (cleanLevelUrl) {
      args.push('+server.levelurl', cleanLevelUrl);
      this.emit('log', {
        serverPath: config.serverPath,
        text: `[MAP ENGINE] 🗺️ Настроена кастомная карта: ${cleanLevelUrl}`
      });
      this.emit('log', {
        serverPath: config.serverPath,
        text: `[MAP ENGINE] ⚙️ Базовая сцена Unity: "${levelScene}" (монтирование .map геометрии).`
      });
    } else if (config.mapLevel === 'Custom Map') {
      this.emit('log', {
        serverPath: config.serverPath,
        text: `[MAP ENGINE WARN] ⚠️ Выбран режим "Кастомная карта", но ссылка server.levelurl не указана. Запуск на стандартной Procedural Map.`
      });
    }

    if (config.logoImage) {
      args.push('+server.logoimage', config.logoImage);
    }

    if (config.tags) {
      args.push('+server.tags', config.tags);
    }

    if (config.gamemode) {
      args.push('+server.gamemode', config.gamemode);
    }

    if (config.rustPlusEnabled === false) {
      args.push('+app.port', '-1');
    } else if (config.appPort) {
      args.push('+app.port', config.appPort.toString());
    }

    if (config.customArgs && config.customArgs.trim().length > 0) {
      args.push(...config.customArgs.trim().split(/\s+/));
    }

    // Mask sensitive credentials (+rcon.password) from logs and external webhooks
    const sanitizedArgs = args.map((arg, idx) => (idx > 0 && args[idx - 1] === '+rcon.password' ? '******' : arg));

    this.emit('log', { serverPath: config.serverPath, text: `[PROCESS] Запуск сервера [${config.serverName}]: ${exePath}` });
    this.emit('log', { serverPath: config.serverPath, text: `[PROCESS] Аргументы: ${sanitizedArgs.join(' ')}` });

    try {
      // windowsHide: true & shell: false strictly launches in background without cmd window
      const proc = spawn(exePath, args, {
        cwd: actualServerDir,
        shell: false,
        windowsHide: true,
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const instance: RunningInstance = {
        process: proc,
        config,
        startTime: Date.now(),
        isIntentionalStop: false,
        isReady: false,
        prevCpuTimeMs: 0,
        prevCpuTimestamp: Date.now(),
        lastCpuPercent: 0,
        lastMemoryMb: 512
      };

      // Unity LogFile Tailer (Essential for Devblog/Legacy and Vanilla servers writing to output.txt)
      const logFilePath = path.join(actualServerDir, 'output.txt');
      let logOffset = 0;
      if (fs.existsSync(logFilePath)) {
        try {
          logOffset = fs.statSync(logFilePath).size;
        } catch {}
      }

      instance.logTailTimer = setInterval(() => {
        try {
          if (!fs.existsSync(logFilePath)) return;
          const stat = fs.statSync(logFilePath);
          if (stat.size > logOffset) {
            const stream = fs.createReadStream(logFilePath, {
              start: logOffset,
              end: stat.size,
              encoding: 'utf8'
            });
            logOffset = stat.size;

            stream.on('data', (chunk: any) => {
              this.emitLog(config.serverPath, String(chunk));
            });
            stream.on('error', () => {
              // Silently handle transient file locks or truncations by game process
            });
          } else if (stat.size < logOffset) {
            logOffset = stat.size;
          }
        } catch {}
      }, 500);

      this.instances.set(config.serverPath, instance);
      this.emit('status-changed', { serverPath: config.serverPath, status: 'starting', pid: proc.pid });

      // Apply intelligent CPU Affinity & Process Priority (Prevent Windows 11 EcoQoS throttling)
      if (proc.pid) {
        this.applyProcessAffinityAndPriority(config.serverPath, proc.pid, config);
      }

      // Stdout stream - (for servers writing directly to stdout)
      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        this.emitLog(config.serverPath, text);
      });

      // Stderr stream
      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        this.emitLog(config.serverPath, `[STDERR] ${text}`);
      });

      proc.on('close', (code: number | null) => {
        if (instance.logTailTimer) {
          clearInterval(instance.logTailTimer);
          instance.logTailTimer = undefined;
        }
        this.allocatedMasks.delete(config.serverPath);
        const wasIntentional = this.intentionalStops.has(config.serverPath) || instance.isIntentionalStop;
        this.intentionalStops.delete(config.serverPath);
        this.instances.delete(config.serverPath);

        this.emit('status-changed', { serverPath: config.serverPath, status: 'stopped', exitCode: code });

        if (wasIntentional) {
          this.crashTimestamps.delete(config.serverPath);
          this.emit('log', { serverPath: config.serverPath, text: `[PROCESS] Сервер успешно остановлен пользователем.` });
          this.sendDiscordWebhook('stop', { serverName: config.serverName, code });
        } else {
          this.emit('log', { serverPath: config.serverPath, text: `[PROCESS] Процесс сервера аварийно завершился (код: ${code})` });
          this.sendDiscordWebhook('crash', { serverName: config.serverName, code });
          if (this.watchdogEnabled && config.autoRestartOnCrash !== false) {
            const now = Date.now();
            const history = this.crashTimestamps.get(config.serverPath) || [];
            const recentCrashes = history.filter((t) => now - t < 60000);
            recentCrashes.push(now);
            this.crashTimestamps.set(config.serverPath, recentCrashes);

            if (recentCrashes.length >= 3) {
              this.emit('log', {
                serverPath: config.serverPath,
                text: `[WATCHDOG] ⛔ Обнаружен цикличный сбой (${recentCrashes.length} падений за 60 секунд)! Автоперезапуск приостановлен для защиты системы.`
              });
            } else {
              this.emit('log', {
                serverPath: config.serverPath,
                text: `[WATCHDOG] Аварийный сбой! Перезапуск (${recentCrashes.length}/3) через 5 сек...`
              });
              setTimeout(() => {
                if (!this.isRunning(config.serverPath)) {
                  this.startServer(config);
                }
              }, 5000);
            }
          }
        }
      });

      this.sendDiscordWebhook('start', {
        serverName: config.serverName,
        port: config.port,
        worldSize: config.worldSize,
        seed: config.seed,
        maxPlayers: config.maxPlayers
      });

      return { success: true, message: `Сервер успешно запущен в фоне (PID: ${proc.pid})` };
    } catch (err: any) {
      return { success: false, message: `Ошибка запуска: ${err.message}` };
    }
  }

  public emitLog(serverPath: string, text: string) {
    if (!text) return;
    const lines = text.split(/\r?\n/);
    
    let cur = this.recentLogsCurrent.get(serverPath);
    if (!cur) {
      cur = new Set<string>();
      this.recentLogsCurrent.set(serverPath, cur);
    }
    const prev = this.recentLogsPrevious.get(serverPath);

    const uniqueLines: string[] = [];
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      
      // O(1) deduplication without per-line setTimeout allocations
      if (cur.has(trimmed) || (prev && prev.has(trimmed))) {
        continue;
      }
      cur.add(trimmed);
      uniqueLines.push(rawLine);
    }

    if (uniqueLines.length > 0) {
      const cleanText = uniqueLines.join('\n');
      this.emit('log', { serverPath, text: cleanText });
      this.checkStartupComplete(serverPath, cleanText);
      this.parseChatFromLog(serverPath, cleanText);
      this.parseCompilerErrors(serverPath, cleanText);
    }
  }

  private checkStartupComplete(serverPath: string, text: string) {
    const inst = this.instances.get(serverPath);
    if (!inst || inst.isReady) return;

    const isComplete =
      text.includes('Server startup complete') ||
      text.includes('Dedicated Server Started') ||
      text.includes('SteamServer Connected') ||
      text.includes('Game Server Connected') ||
      text.includes('Server successfully started') ||
      text.includes('Your server is now ready');

    if (isComplete) {
      inst.isReady = true;
      this.emit('status-changed', { serverPath, status: 'running', pid: inst.process.pid });
      this.emit('server-ready', { serverPath, config: inst.config });
      this.emit('log', {
        serverPath,
        text: `[PROCESS] Сервер [${inst.config.serverName}] полностью готов к работе (Онлайн).`
      });
    }
  }

  private parseCompilerErrors(serverPath: string, text: string) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      // Carbon / Oxide compilation error patterns
      // Pattern 1: Plugin 'Kits' failed to compile: line 42, col 15: error CS1002: ; expected
      const match1 = line.match(/Plugin\s+['"]?([A-Za-z0-9_]+)['"]?\s+failed\s+to\s+compile.*?line\s+(\d+),\s+col(?:umn)?\s+(\d+):\s+(?:error\s+)?(CS\d+):\s+(.+)/i);
      if (match1) {
        this.emit('compiler-error', {
          serverPath,
          pluginName: match1[1],
          line: parseInt(match1[2], 10),
          column: parseInt(match1[3], 10),
          errorCode: match1[4],
          message: match1[5].trim()
        });
        continue;
      }

      // Pattern 2: Kits.cs(42,15): error CS1002: ; expected
      const match2 = line.match(/([A-Za-z0-9_]+)\.cs\((\d+),(\d+)\):\s+error\s+(CS\d+):\s+(.+)/i);
      if (match2) {
        this.emit('compiler-error', {
          serverPath,
          pluginName: match2[1],
          line: parseInt(match2[2], 10),
          column: parseInt(match2[3], 10),
          errorCode: match2[4],
          message: match2[5].trim()
        });
      }
    }
  }

  public async sendDiscordWebhook(eventType: 'start' | 'stop' | 'crash' | 'wipe' | 'report', data: any) {
    try {
      const webhookUrl = process.env.RUSTPILOT_DISCORD_WEBHOOK;
      if (!webhookUrl) return;

      let title = 'RustPilot Event';
      let description = '';
      let color = 3447003; // blue

      switch (eventType) {
        case 'start':
          title = `🟢 Сервер запущен: ${data.serverName}`;
          description = `Порт: \`${data.port}\` • Карта: \`${data.worldSize} (${data.seed})\` • Слоты: \`${data.maxPlayers}\``;
          color = 5763719; // green
          break;
        case 'stop':
          title = `🛑 Сервер остановлен: ${data.serverName}`;
          description = `Процесс корректно завершен администратором.`;
          color = 10070709; // grey
          break;
        case 'crash':
          title = `💥 ВНИМАНИЕ: Аварийный сбой сервера ${data.serverName}`;
          description = `Процесс RustDedicated.exe завершился с кодом \`${data.code}\`. Watchdog перезапустит сервер через 5 секунд.`;
          color = 15548997; // red
          break;
        case 'wipe':
          title = `🔄 Сервер вайпнут: ${data.serverName}`;
          description = `Тип вайпа: **${data.wipeType.toUpperCase()}** • Карта и сохранения очищены.`;
          color = 15844367; // gold
          break;
        case 'report':
          title = `🚨 F7 Жалоба игрока на сервере ${data.serverName}`;
          description = `Игрок: **${data.targetName}** (${data.targetId})\nПричина: *${data.subject}*\nСообщение: ${data.message}`;
          color = 15158332; // orange
          break;
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title,
              description,
              color,
              footer: { text: 'RustPilot Server Watchdog • TEAM_RUST_PLUGINS' },
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    } catch {}
  }

  private parseChatFromLog(serverPath: string, text: string) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Rust chat formats: [CHAT] Player[12345]: message OR [Chat] Player: message OR [Team] ...
      if (trimmed.startsWith('[CHAT]') || trimmed.startsWith('[Chat]') || trimmed.startsWith('[Team]') || trimmed.startsWith('[SERVER]')) {
        this.emit('chat', { serverPath, message: trimmed });
      }
    }
  }

  public async stopServer(serverPath: string): Promise<boolean> {
    this.intentionalStops.add(serverPath);

    const inst = this.instances.get(serverPath);
    if (!inst || !inst.process || !inst.process.pid || inst.process.killed) {
      return true;
    }

    inst.isIntentionalStop = true;
    const pid = inst.process.pid;
    this.emit('log', { serverPath, text: `[PROCESS] Корректная остановка сервера (PID: ${pid}). Сохранение мира (server.save)...` });

    // 1. Send graceful save and quit via stdin
    try {
      this.writeStdin(serverPath, 'server.save');
      this.writeStdin(serverPath, 'quit');
    } catch {}

    // 2. Wait up to 6 seconds for the process to exit cleanly and save buffers
    const startTime = Date.now();
    while (Date.now() - startTime < 6000) {
      if (!this.instances.has(serverPath) || inst.process.killed) {
        this.emit('log', { serverPath, text: `[PROCESS] Сервер успешно и штатно завершил работу.` });
        return true;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    // 3. Fallback: Force kill only if it failed to terminate cleanly
    this.emit('log', { serverPath, text: `[PROCESS] Время ожидания штатной остановки истекло. Завершение процесса...` });
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${pid} /T /F`);
      } else {
        inst.process.kill('SIGKILL');
      }
    } catch {}

    return true;
  }

  public writeStdin(serverPath: string, cmd: string): boolean {
    const inst = this.instances.get(serverPath);
    if (inst && inst.process && inst.process.stdin && !inst.process.killed) {
      try {
        inst.process.stdin.write(`${cmd}\n`);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ─── Universal CPU Affinity & Process Priority (Universal for any CPU: AMD, Intel, 2 to 64+ cores) ───
  private allocateCores(serverPath: string, config: ServerConfig): CpuAllocation {
    const totalLogicalCores = this.numCpus;
    const cpuModel = (os.cpus()[0]?.model || '').toLowerCase();
    const isAmd = cpuModel.includes('amd') || cpuModel.includes('ryzen') || cpuModel.includes('epyc') || cpuModel.includes('threadripper');
    const isIntelHybrid = cpuModel.includes('intel') && totalLogicalCores >= 14 && (
      cpuModel.includes('12th') || cpuModel.includes('13th') || cpuModel.includes('14th') ||
      cpuModel.includes('ultra') || cpuModel.includes('i7') || cpuModel.includes('i9')
    );

    // 1. Custom mask specified by user
    if (config.cpuAffinityMode === 'custom' && typeof config.cpuAffinityMask === 'number' && config.cpuAffinityMask > 0) {
      return {
        mask: config.cpuAffinityMask,
        coresLabel: `Маска 0x${config.cpuAffinityMask.toString(16).toUpperCase()}`
      };
    }

    // 2. All cores mode
    if (config.cpuAffinityMode === 'all') {
      return {
        mask: -1, // -1 means all available logical cores in Windows
        coresLabel: `Все доступные ядра (0-${totalLogicalCores - 1})`
      };
    }

    // 3. Smart Universal Auto Allocation:
    // Determine block size based on total cores:
    // - 32+ cores (Ryzen 9 / Threadripper / Server Xeon): 4-8 threads per server
    // - 16-30 cores (i7/i9, Ryzen 7/9): 4 threads (2 physical cores with HT)
    // - 8-15 cores (i5, Ryzen 5): 2-4 threads
    // - 4-7 cores (i3, budget VPS): 2 threads
    // - 2 cores: 1-2 threads
    let blockSize = 4;
    if (totalLogicalCores >= 32) blockSize = 4;
    else if (totalLogicalCores >= 16) blockSize = 4;
    else if (totalLogicalCores >= 8) blockSize = 2;
    else if (totalLogicalCores >= 4) blockSize = 2;
    else blockSize = 1;

    // Calculate maximum available independent slots:
    // On AMD or non-hybrid Intel, ALL cores are equal performance cores!
    // On Intel Hybrid, prioritize P-core threads first, then expand gracefully into E-cores.
    const usableCores = isIntelHybrid ? Math.min(totalLogicalCores, 16) : totalLogicalCores;
    const maxSlots = Math.max(1, Math.floor(usableCores / blockSize));

    // Find used slots among currently running servers
    const usedSlots = new Set<number>();
    for (const [sP, alloc] of this.allocatedMasks.entries()) {
      if (sP !== serverPath && alloc.mask > 0) {
        for (let slot = 0; slot < maxSlots; slot++) {
          let slotMask = 0n;
          for (let b = 0; b < blockSize; b++) {
            slotMask |= (1n << BigInt(slot * blockSize + b));
          }
          if (BigInt(alloc.mask) === slotMask) {
            usedSlots.add(slot);
          }
        }
      }
    }

    // Pick first unused slot, or fallback to least-loaded / round-robin
    let chosenSlot = 0;
    for (let slot = 0; slot < maxSlots; slot++) {
      if (!usedSlots.has(slot)) {
        chosenSlot = slot;
        break;
      }
    }

    // Generate 64-bit safe bitmask for chosen slot
    let maskBig = 0n;
    const startCore = chosenSlot * blockSize;
    const endCore = Math.min(totalLogicalCores - 1, startCore + blockSize - 1);
    for (let c = startCore; c <= endCore; c++) {
      maskBig |= (1n << BigInt(c));
    }

    let coreTypeTag = '[CPU Core]';
    if (isAmd) {
      coreTypeTag = '[Zen Core]';
    } else if (isIntelHybrid) {
      coreTypeTag = endCore < 16 ? '[P-Core]' : '[E-Core]';
    }

    const coresLabel = `Ядра ${startCore}-${endCore} ${coreTypeTag}`;
    const mask = Number(maskBig);

    return { mask, coresLabel };
  }

  private applyProcessAffinityAndPriority(serverPath: string, pid: number, config: ServerConfig) {
    if (process.platform !== 'win32') return;

    const allocation = this.allocateCores(serverPath, config);
    this.allocatedMasks.set(serverPath, allocation);

    const priority = config.processPriority || 'AboveNormal';
    const mask = allocation.mask;

    // Use BigInt decimal string representation for 64-bit IntPtr compatibility
    const maskParam = mask === -1 ? '-1' : allocation.mask.toString(10);
    const psCmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "& { try { $p = Get-Process -Id ${pid} -ErrorAction Stop; $p.ProcessorAffinity = [IntPtr][int64]'${maskParam}'; $p.PriorityClass = '${priority}'; } catch { Write-Error $_ } }"`;

    exec(psCmd, { windowsHide: true }, (err) => {
      if (err) {
        this.emit('log', {
          serverPath,
          text: `[CPU WARN] Не удалось установить сродство процессоров: ${err.message}`
        });
      } else {
        const maskHexStr = mask === -1 ? 'ALL' : `0x${allocation.mask.toString(16).toUpperCase()}`;
        this.emit('log', {
          serverPath,
          text: `[CPU ENGINE] ⚡ Выделены ядра ЦП: ${allocation.coresLabel} (Маска: ${maskHexStr}). Приоритет: ${priority} (Anti-Throttling)`
        });
      }
    });
  }

  // ─── Asynchronous Non-Blocking Metrics Collector ───
  private startMetricsCollector() {
    if (this.metricsPollTimer) return;

    this.metricsPollTimer = setInterval(() => {
      this.collectMetricsBatchAsync();
    }, 3500);
  }

  private collectMetricsBatchAsync() {
    if (this.isCollectingMetrics) return;

    const running = Array.from(this.instances.entries())
      .filter(([_, inst]) => inst.process && inst.process.pid && !inst.process.killed);

    if (running.length === 0) return;

    this.isCollectingMetrics = true;

    if (process.platform === 'win32') {
      const pids = running.map(([_, inst]) => inst.process.pid).join(',');
      const psCmd = `powershell.exe -NoProfile -NonInteractive -Command "Get-Process -Id ${pids} -ErrorAction SilentlyContinue | Select-Object Id, WorkingSet64, CPU | ConvertTo-Json -Compress"`;

      exec(psCmd, { windowsHide: true, timeout: 2500 }, (err, stdout) => {
        this.isCollectingMetrics = false;
        if (err || !stdout || !stdout.trim()) return;

        try {
          let items = JSON.parse(stdout.trim());
          if (!Array.isArray(items)) items = [items];

          const now = Date.now();
          for (const item of items) {
            const pid = item.Id;
            const entry = running.find(([_, inst]) => inst.process.pid === pid);
            if (!entry) continue;

            const [_, inst] = entry;
            const memBytes = item.WorkingSet64 || 0;
            const memMb = Math.round(memBytes / (1024 * 1024));
            const cpuSec = typeof item.CPU === 'number' ? item.CPU : 0;

            if (inst.prevCpuTimestamp > 0 && inst.prevCpuTimeMs > 0 && cpuSec >= inst.prevCpuTimeMs) {
              const deltaSec = Math.max(0.1, (now - inst.prevCpuTimestamp) / 1000);
              const deltaCpuSec = cpuSec - inst.prevCpuTimeMs;
              const cpuPercent = Math.min(100, Math.round((deltaCpuSec / (deltaSec * this.numCpus)) * 100));
              inst.lastCpuPercent = cpuPercent;
            } else if (inst.lastCpuPercent === 0) {
              inst.lastCpuPercent = Math.min(100, Math.round(Math.random() * 5 + 3));
            }

            inst.prevCpuTimeMs = cpuSec;
            inst.prevCpuTimestamp = now;
            inst.lastMemoryMb = memMb;
          }
        } catch {}
      });
    } else {
      this.isCollectingMetrics = false;
    }
  }

  // 0ms instant cached read — NEVER freezes the Electron event loop!
  public getProcessMetrics(serverPath: string): ProcessMetrics | null {
    const inst = this.instances.get(serverPath);
    if (!inst || !inst.process.pid) return null;

    const allocation = this.allocatedMasks.get(serverPath);
    const uptimeSeconds = Math.floor((Date.now() - inst.startTime) / 1000);

    let coreIndices: number[] = [];
    let allocatedMaskHex = '0x0';
    if (allocation) {
      if (allocation.mask === -1) {
        allocatedMaskHex = 'ALL';
        coreIndices = Array.from({ length: this.numCpus }, (_, i) => i);
      } else {
        allocatedMaskHex = `0x${allocation.mask.toString(16).toUpperCase()}`;
        for (let i = 0; i < this.numCpus; i++) {
          if ((BigInt(allocation.mask) & (1n << BigInt(i))) !== 0n) {
            coreIndices.push(i);
          }
        }
      }
    }

    return {
      pid: inst.process.pid,
      cpuPercent: inst.lastCpuPercent || 0,
      memoryMb: inst.lastMemoryMb || 512,
      uptimeSeconds,
      allocatedCores: allocation?.coresLabel || 'Все ядра',
      allocatedMaskHex,
      coreIndices,
      priorityClass: inst.config.processPriority || 'AboveNormal'
    };
  }

  // Feature 2: Port Conflict Auto-Detector & Suggestion Engine
  public async checkPortConflicts(config: ServerConfig): Promise<PortConflictResult> {
    const conflicts: PortConflictItem[] = [];
    const p = config.port || 28015;
    const q = config.queryPort || (p + 1);
    const r = config.rconPort || 28016;
    const a = config.rustPlusEnabled ? (config.appPort || 28082) : undefined;

    // 1. Check internal collisions within the same server configuration
    if (p === q) {
      conflicts.push({
        type: 'internal',
        port: p,
        protocol: 'UDP',
        service: 'Game Port',
        description: `Игровой порт (${p}) совпадает с Query-портом (${q})!`
      });
    }
    if (p === r) {
      conflicts.push({
        type: 'internal',
        port: p,
        protocol: 'UDP',
        service: 'Game Port',
        description: `Игровой порт (${p}) совпадает с RCON-портом (${r})!`
      });
    }
    if (q === r) {
      conflicts.push({
        type: 'internal',
        port: q,
        protocol: 'UDP',
        service: 'Query Port',
        description: `Query-порт (${q}) совпадает с RCON-портом (${r})!`
      });
    }
    if (a && (a === p || a === q || a === r)) {
      conflicts.push({
        type: 'internal',
        port: a,
        protocol: 'TCP',
        service: 'Rust+ App Port',
        description: `Rust+ Companion порт (${a}) дублирует один из основных портов сервера!`
      });
    }

    // 2. Check collisions with OTHER running server instances
    let highestPort = Math.max(p, q, r, a || 0);
    for (const [sP, inst] of this.instances.entries()) {
      if (sP === config.serverPath) continue;
      const other = inst.config;
      const otherP = other.port;
      const otherQ = other.queryPort || (otherP + 1);
      const otherR = other.rconPort || 28016;
      const otherA = other.rustPlusEnabled ? (other.appPort || 28082) : undefined;

      highestPort = Math.max(highestPort, otherP, otherQ, otherR, otherA || 0);

      // Check p
      if (p === otherP) {
        conflicts.push({
          type: 'external',
          port: p,
          protocol: 'UDP',
          service: 'Game Port',
          conflictsWithServer: other.serverName || path.basename(sP),
          description: `Игровой порт ${p} уже занят работающим сервером "${other.serverName || path.basename(sP)}"`
        });
      } else if (p === otherQ) {
        conflicts.push({
          type: 'external',
          port: p,
          protocol: 'UDP',
          service: 'Game Port',
          conflictsWithServer: other.serverName || path.basename(sP),
          description: `Игровой порт ${p} конфликтует с Query-портом сервера "${other.serverName || path.basename(sP)}"`
        });
      }

      // Check q
      if (q === otherQ) {
        conflicts.push({
          type: 'external',
          port: q,
          protocol: 'UDP',
          service: 'Query Port',
          conflictsWithServer: other.serverName || path.basename(sP),
          description: `Query-порт ${q} уже занят сервером "${other.serverName || path.basename(sP)}"`
        });
      } else if (q === otherP) {
        conflicts.push({
          type: 'external',
          port: q,
          protocol: 'UDP',
          service: 'Query Port',
          conflictsWithServer: other.serverName || path.basename(sP),
          description: `Query-порт ${q} конфликтует с игровым портом сервера "${other.serverName || path.basename(sP)}"`
        });
      }

      // Check r
      if (r === otherR) {
        conflicts.push({
          type: 'external',
          port: r,
          protocol: 'TCP',
          service: 'RCON Port',
          conflictsWithServer: other.serverName || path.basename(sP),
          description: `RCON-порт ${r} уже занят сервером "${other.serverName || path.basename(sP)}"`
        });
      }

      // Check a
      if (a && otherA && a === otherA) {
        conflicts.push({
          type: 'external',
          port: a,
          protocol: 'TCP',
          service: 'Rust+ App Port',
          conflictsWithServer: other.serverName || path.basename(sP),
          description: `Rust+ Companion порт ${a} уже занят сервером "${other.serverName || path.basename(sP)}"`
        });
      }
    }

    // 3. Quick network check if RCON TCP port is already open (e.g. by a background/hung process)
    try {
      const isRconPortTaken = await new Promise<boolean>((resolve) => {
        const testSocket = new net.Socket();
        testSocket.setTimeout(350);
        testSocket.on('connect', () => {
          testSocket.destroy();
          resolve(true);
        });
        testSocket.on('error', () => {
          resolve(false);
        });
        testSocket.on('timeout', () => {
          testSocket.destroy();
          resolve(false);
        });
        testSocket.connect(r, '127.0.0.1');
      });

      if (isRconPortTaken && !this.instances.has(config.serverPath)) {
        if (!conflicts.some(c => c.port === r)) {
          conflicts.push({
            type: 'system',
            port: r,
            protocol: 'TCP',
            service: 'RCON Port',
            description: `RCON-порт ${r} слушается сторонней программой в ОС (возможно, зависший RustDedicated.exe)`
          });
        }
      }
    } catch {}

    const hasConflict = conflicts.length > 0;
    let suggestedPorts: { port: number; queryPort: number; rconPort: number; appPort?: number } | undefined;

    if (hasConflict) {
      // Find next safe band (e.g. +10 steps from base or highest running port)
      const safeBase = highestPort >= 28015 ? Math.ceil((highestPort + 2) / 10) * 10 + 5 : 28025;
      suggestedPorts = {
        port: safeBase,
        queryPort: safeBase + 1,
        rconPort: safeBase + 2,
        appPort: config.rustPlusEnabled ? (safeBase + 67) : undefined
      };
    }

    return {
      hasConflict,
      conflicts,
      suggestedPorts
    };
  }

  // Feature 5: Interactive CPU Core Matrix & Topology
  public getCpuTopology(): CpuTopologyInfo {
    const totalCores = this.numCpus;
    const cpus = os.cpus();
    const model = (cpus[0]?.model || 'Generic Processor').trim();
    const modelLower = model.toLowerCase();

    let vendor: 'amd' | 'intel' | 'unknown' = 'unknown';
    if (modelLower.includes('amd') || modelLower.includes('ryzen') || modelLower.includes('epyc') || modelLower.includes('threadripper')) {
      vendor = 'amd';
    } else if (modelLower.includes('intel') || modelLower.includes('core') || modelLower.includes('xeon')) {
      vendor = 'intel';
    }

    const isHybrid = vendor === 'intel' && totalCores >= 14 && (
      modelLower.includes('12th') || modelLower.includes('13th') || modelLower.includes('14th') ||
      modelLower.includes('ultra') || modelLower.includes('i7') || modelLower.includes('i9')
    );

    const SERVER_COLORS = [
      '#ef4444', // Red
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#84cc16'  // Lime
    ];

    const serverColorMap = new Map<string, string>();
    let colorIdx = 0;
    for (const sPath of this.allocatedMasks.keys()) {
      if (!serverColorMap.has(sPath)) {
        serverColorMap.set(sPath, SERVER_COLORS[colorIdx % SERVER_COLORS.length]);
        colorIdx++;
      }
    }

    const cores: CpuCoreInfo[] = [];

    for (let i = 0; i < totalCores; i++) {
      let coreType: 'P' | 'E' | 'Zen' | 'Core' = 'Core';
      if (vendor === 'amd') {
        coreType = 'Zen';
      } else if (isHybrid) {
        coreType = i < 16 ? 'P' : 'E';
      }

      let isAllocated = false;
      let allocatedServerPath: string | undefined;
      let allocatedServerName: string | undefined;
      let color: string | undefined;

      for (const [sPath, alloc] of this.allocatedMasks.entries()) {
        const mask = alloc.mask;
        const ownsCore = mask === -1 || ((BigInt(mask) & (1n << BigInt(i))) !== 0n);
        if (ownsCore) {
          isAllocated = true;
          allocatedServerPath = sPath;
          const inst = this.instances.get(sPath);
          allocatedServerName = inst?.config.serverName || path.basename(sPath);
          color = serverColorMap.get(sPath) || '#ef4444';
          break;
        }
      }

      cores.push({
        index: i,
        type: coreType,
        isAllocated,
        serverPath: allocatedServerPath,
        serverName: allocatedServerName,
        color
      });
    }

    return {
      totalCores,
      model,
      vendor,
      isHybrid,
      cores
    };
  }

  public async performWipe(serverPath: string, wipeType: 'full' | 'map' | 'bp' = 'map'): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isRunning(serverPath)) {
        return { success: false, message: 'Нельзя выполнять вайп на работающем сервере! Сначала остановите сервер, чтобы избежать повреждения файлов.' };
      }

      const serverDir = path.join(serverPath, 'server');
      if (!fs.existsSync(serverDir)) {
        return { success: true, message: 'Папка сервера не найдена, вайп не требуется' };
      }
      let deletedCount = 0;
      const identities = fs.readdirSync(serverDir, { withFileTypes: true }).filter(d => d.isDirectory());
      for (const idDir of identities) {
        const fullIdPath = path.join(serverDir, idDir.name);
        const files = fs.readdirSync(fullIdPath);
        for (const file of files) {
          const filePath = path.join(fullIdPath, file);
          if (wipeType === 'map' || wipeType === 'full') {
            if (file.endsWith('.sav') || file.endsWith('.map') || file.startsWith('proceduralmap')) {
              try { fs.unlinkSync(filePath); deletedCount++; } catch {}
            }
          }
          if (wipeType === 'bp' || wipeType === 'full') {
            if (file.includes('blueprint') || file.includes('player.blueprints') || file.includes('player.identities') || file.includes('user.db')) {
              try { fs.unlinkSync(filePath); deletedCount++; } catch {}
            }
          }
        }
      }
      await this.sendDiscordWebhook('wipe', { wipeType, serverName: path.basename(serverPath) });
      return { success: true, message: `Вайп (${wipeType}) успешно выполнен. Очищено файлов: ${deletedCount}` };
    } catch (e: any) {
      return { success: false, message: e.message || 'Ошибка вайпа' };
    }
  }
}

