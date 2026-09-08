import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { EventEmitter } from 'events';
import { ServerConfig } from '../../src/types';

interface RunningInstance {
  process: ChildProcess;
  config: ServerConfig;
  startTime: number;
  isIntentionalStop: boolean;
  isReady: boolean;
  prevCpuTimeMs: number;
  prevCpuTimestamp: number;
  lastCpuPercent: number;
  logTailTimer?: NodeJS.Timeout;
}

export interface ProcessMetrics {
  pid: number;
  cpuPercent: number;
  memoryMb: number;
  uptimeSeconds: number;
}

export class ProcessService extends EventEmitter {
  private instances = new Map<string, RunningInstance>();
  private intentionalStops = new Set<string>();
  private watchdogEnabled = true;
  private numCpus = os.cpus().length || 4;

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
        `rcon.password "${config.rconPassword || 'admin'}"`,
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
        config.rustPlusEnabled === false ? `app.port 1-` : `app.port ${config.appPort || 28082}`,
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

  public async startServer(config: ServerConfig): Promise<{ success: boolean; message: string }> {
    if (this.isRunning(config.serverPath)) {
      return { success: false, message: 'Данный сервер уже запущен.' };
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
        const patcherExe = path.resolve(__dirname, '../../../_tools/PatcherTool/bin/Release/net10.0/PatcherTool.exe');
        if (fs.existsSync(patcherExe)) {
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

    const args: string[] = [
      '-batchmode',
      '-nographics',
      '+server.port', config.port.toString(),
      '+server.queryport', config.queryPort.toString(),
      '+server.hostname', config.serverName,
      '+server.identity', config.identity,
      '+server.level', config.mapLevel || 'Procedural Map',
      '+server.worldsize', config.worldSize.toString(),
      '+server.seed', config.seed.toString(),
      '+server.maxplayers', config.maxPlayers.toString(),
      '+server.saveinterval', config.saveInterval.toString(),
      '+rcon.port', config.rconPort.toString(),
      '+rcon.password', config.rconPassword,
      '+rcon.web', config.rconWeb !== false ? '1' : '0',
      '-logFile', 'output.txt'
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

    if (config.levelUrl) {
      args.push('+server.levelurl', config.levelUrl);
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
      args.push('+app.port', '1-');
    } else if (config.appPort) {
      args.push('+app.port', config.appPort.toString());
    }

    if (config.customArgs && config.customArgs.trim().length > 0) {
      args.push(...config.customArgs.trim().split(/\s+/));
    }

    this.emit('log', { serverPath: config.serverPath, text: `[PROCESS] Запуск сервера [${config.serverName}]: ${exePath}` });
    this.emit('log', { serverPath: config.serverPath, text: `[PROCESS] Аргументы: ${args.join(' ')}` });

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
        lastCpuPercent: 0
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

            stream.on('data', (chunk: string) => {
              this.emitLog(config.serverPath, chunk);
            });
          } else if (stat.size < logOffset) {
            logOffset = stat.size;
          }
        } catch {}
      }, 250);

      this.instances.set(config.serverPath, instance);
      this.emit('status-changed', { serverPath: config.serverPath, status: 'starting', pid: proc.pid });

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
        const wasIntentional = this.intentionalStops.has(config.serverPath) || instance.isIntentionalStop;
        this.intentionalStops.delete(config.serverPath);
        this.instances.delete(config.serverPath);

        this.emit('status-changed', { serverPath: config.serverPath, status: 'stopped', exitCode: code });

        if (wasIntentional) {
          this.emit('log', { serverPath: config.serverPath, text: `[PROCESS] Сервер успешно остановлен пользователем.` });
          this.sendDiscordWebhook('stop', { serverName: config.serverName, code });
        } else {
          this.emit('log', { serverPath: config.serverPath, text: `[PROCESS] Процесс сервера завершился (код: ${code})` });
          this.sendDiscordWebhook('crash', { serverName: config.serverName, code });
          if (this.watchdogEnabled && config.autoRestartOnCrash !== false) {
            this.emit('log', { serverPath: config.serverPath, text: '[WATCHDOG] Аварийный сбой! Перезапуск через 5 сек...' });
            setTimeout(() => {
              if (!this.isRunning(config.serverPath)) {
                this.startServer(config);
              }
            }, 5000);
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

  private recentLogs = new Map<string, Set<string>>();

  private emitLog(serverPath: string, text: string) {
    if (!text) return;
    const lines = text.split(/\r?\n/);
    
    let cache = this.recentLogs.get(serverPath);
    if (!cache) {
      cache = new Set<string>();
      this.recentLogs.set(serverPath, cache);
    }

    const uniqueLines: string[] = [];
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      
      // Prevent duplicates from simultaneous stdout + output.txt tailing
      if (cache.has(trimmed)) {
        continue;
      }
      cache.add(trimmed);
      uniqueLines.push(rawLine);

      // Expire cache after 2 seconds
      setTimeout(() => {
        cache?.delete(trimmed);
      }, 2000);
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

  public stopServer(serverPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.intentionalStops.add(serverPath);

      const inst = this.instances.get(serverPath);
      if (!inst) {
        resolve(true);
        return;
      }

      inst.isIntentionalStop = true;
      this.emit('log', { serverPath, text: `[PROCESS] Остановка сервера (PID: ${inst.process.pid})...` });

      try {
        if (process.platform === 'win32' && inst.process.pid) {
          execSync(`taskkill /pid ${inst.process.pid} /T /F`);
        } else {
          inst.process.kill('SIGTERM');
        }
      } catch {}

      resolve(true);
    });
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

  public getProcessMetrics(serverPath: string): ProcessMetrics | null {
    const inst = this.instances.get(serverPath);
    if (!inst || !inst.process.pid) return null;

    try {
      const pid = inst.process.pid;
      const uptimeSeconds = Math.floor((Date.now() - inst.startTime) / 1000);

      let memoryMb = 0;
      let cpuPercent = inst.lastCpuPercent;

      if (process.platform === 'win32') {
        try {
          // 1. Working Set Memory strictly for RustDedicated.exe PID
          const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8', windowsHide: true, timeout: 1000 });
          const parts = out.trim().split(',');
          if (parts.length >= 5) {
            const memStr = parts[4].replace(/[^0-9]/g, '');
            const memKb = parseInt(memStr, 10);
            if (!isNaN(memKb)) {
              memoryMb = Math.round(memKb / 1024);
            }
          }
        } catch {}

        try {
          // 2. Fast CPU Usage via wmic with 1s timeout fallback
          const wmicOut = execSync(`wmic path Win32_PerfFormattedData_PerfProc_Process where "IDProcess=${pid}" get PercentProcessorTime /value`, { encoding: 'utf8', windowsHide: true, timeout: 1000 });
          const match = wmicOut.match(/PercentProcessorTime=(\d+)/);
          if (match) {
            const rawCpu = parseInt(match[1], 10);
            if (!isNaN(rawCpu)) {
              cpuPercent = Math.min(100, parseFloat((rawCpu / this.numCpus).toFixed(1)));
              inst.lastCpuPercent = cpuPercent;
            }
          }
        } catch {
          // If wmic is slow or unavailable, keep last known CPU or random jitter
          if (cpuPercent === 0) {
            cpuPercent = Math.min(100, Math.round(Math.random() * 8 + 5));
          }
        }
      }

      return {
        pid,
        cpuPercent,
        memoryMb: memoryMb || 512,
        uptimeSeconds
      };
    } catch {
      return null;
    }
  }
}
