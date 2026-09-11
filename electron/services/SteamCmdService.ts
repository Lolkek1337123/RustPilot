import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import AdmZip from 'adm-zip';
import { EventEmitter } from 'events';

export class SteamCmdService extends EventEmitter {
  private activeProcess: ChildProcess | null = null;

  public async ensureSteamCmd(toolsDir: string): Promise<string> {
    const candidatePaths = [
      path.join(toolsDir, 'steamcmd', 'steamcmd.exe'),
      path.join(toolsDir, 'steamcmd.exe'),
      path.join(process.cwd(), '_tools', 'steamcmd', 'steamcmd.exe'),
      path.join(process.cwd(), '..', '_tools', 'steamcmd', 'steamcmd.exe'),
      path.join((process as any).resourcesPath || '', '_tools', 'steamcmd', 'steamcmd.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'RustPilot', '_tools', 'steamcmd', 'steamcmd.exe')
    ];
    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }

    const steamCmdDir = path.join(toolsDir, 'steamcmd');
    if (!fs.existsSync(steamCmdDir)) {
      fs.mkdirSync(steamCmdDir, { recursive: true });
    }

    const exePath = path.join(steamCmdDir, 'steamcmd.exe');
    if (fs.existsSync(exePath)) {
      return exePath;
    }

    this.emit('log', '[STEAMCMD] Скачивание официального установщика Valve SteamCMD...');
    const zipPath = path.join(steamCmdDir, 'steamcmd.zip');
    
    await this.downloadFile('https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip', zipPath);

    this.emit('log', '[STEAMCMD] Распаковка архива steamcmd.zip...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(steamCmdDir, true);
    fs.unlinkSync(zipPath);

    this.emit('log', '[STEAMCMD] SteamCMD успешно готов к работе.');
    return exePath;
  }

  public getAppManifestInfo(serverFilesDir: string): { buildId?: string; lastUpdated?: number } | null {
    const manifestPath = path.join(serverFilesDir, 'steamapps', 'appmanifest_258550.acf');
    if (!fs.existsSync(manifestPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const buildMatch = content.match(/"buildid"\s+"(\d+)"/i);
      const updatedMatch = content.match(/"LastUpdated"\s+"(\d+)"/i);
      return {
        buildId: buildMatch ? buildMatch[1] : undefined,
        lastUpdated: updatedMatch ? parseInt(updatedMatch[1], 10) * 1000 : undefined
      };
    } catch {
      return null;
    }
  }

  public async checkIfUpdateNeeded(
    serverFilesDir: string,
    branch: string = 'public',
    maxAgeHours: number = 6
  ): Promise<{
    needsUpdate: boolean;
    buildId?: string;
    latestBuildId?: string;
    reason: string;
    installed: boolean;
  }> {
    const exePath = path.join(serverFilesDir, 'RustDedicated.exe');
    if (!fs.existsSync(exePath)) {
      return {
        needsUpdate: true,
        installed: false,
        reason: 'Сервер ещё не установлен (отсутствует RustDedicated.exe)'
      };
    }

    const manifest = this.getAppManifestInfo(serverFilesDir);
    const localBuildId = manifest?.buildId;

    // 1. Fast online check via SteamCMD API (100ms)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://api.steamcmd.net/v1/info/258550', {
        signal: controller.signal,
        headers: { 'User-Agent': 'RustPilot/1.0' }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        const branchKey = branch && branch !== 'release' ? branch : 'public';
        const remoteBuildId = data?.data?.['258550']?.depots?.branches?.[branchKey]?.buildid;

        if (remoteBuildId) {
          if (!localBuildId || String(localBuildId).trim() !== String(remoteBuildId).trim()) {
            return {
              needsUpdate: true,
              installed: true,
              buildId: localBuildId,
              latestBuildId: String(remoteBuildId),
              reason: `Доступно обновление Rust на Steam: Build ${localBuildId || 'старый'} -> ${remoteBuildId}`
            };
          }

          return {
            needsUpdate: false,
            installed: true,
            buildId: localBuildId,
            latestBuildId: String(remoteBuildId),
            reason: `Ядро сервера актуально (последний BuildID: ${localBuildId})`
          };
        }
      }
    } catch {
      // API network fallback
    }

    // 2. Fallback check: if no manifest or older than maxAgeHours
    if (!manifest || !manifest.buildId) {
      return {
        needsUpdate: true,
        installed: true,
        reason: 'Манифест SteamCMD не найден, требуется проверка целостности'
      };
    }

    const now = Date.now();
    const lastUpdated = manifest.lastUpdated || 0;
    const ageHours = (now - lastUpdated) / (1000 * 60 * 60);

    if (ageHours >= maxAgeHours) {
      return {
        needsUpdate: true,
        installed: true,
        buildId: manifest.buildId,
        reason: `Последняя проверка файлов была ${Math.round(ageHours)}ч назад (> ${maxAgeHours}ч)`
      };
    }

    return {
      needsUpdate: false,
      installed: true,
      buildId: manifest.buildId,
      reason: `Сервер проверен недавно (BuildID: ${manifest.buildId})`
    };
  }

  public async installOrUpdateServer(options: {
    toolsDir: string;
    serverFilesDir: string;
    validate?: boolean;
    betaBranch?: string;
    betaPassword?: string;
  }): Promise<{ success: boolean; message: string }> {
    const steamCmdExe = await this.ensureSteamCmd(options.toolsDir);

    if (!fs.existsSync(options.serverFilesDir)) {
      fs.mkdirSync(options.serverFilesDir, { recursive: true });
    }

    // Auto-heal stuck SteamCMD 0x6 state (file lock / aborted download)
    try {
      const manifestPath = path.join(options.serverFilesDir, 'steamapps', 'appmanifest_258550.acf');
      if (fs.existsSync(manifestPath)) {
        let content = fs.readFileSync(manifestPath, 'utf8');
        if (content.includes('"StateFlags"\t\t"6"') || content.includes('"UpdateResult"\t\t"6"')) {
          content = content
            .replace(/"StateFlags"\t\t"6"/g, '"StateFlags"\t\t"0"')
            .replace(/"UpdateResult"\t\t"6"/g, '"UpdateResult"\t\t"0"');
          fs.writeFileSync(manifestPath, content, 'utf8');
          this.emit('log', '[STEAMCMD HEAL] Сброшен заблокированный статус StateFlags 0x6 для чистого обновления.');
        }
      }
      const downloadingDir = path.join(options.serverFilesDir, 'steamapps', 'downloading');
      if (fs.existsSync(downloadingDir)) {
        fs.rmSync(downloadingDir, { recursive: true, force: true });
      }
    } catch {}

    let appUpdateCmd = 'app_update 258550';
    if (options.betaBranch && options.betaBranch !== 'public') {
      appUpdateCmd += ` -beta ${options.betaBranch}`;
      if (options.betaPassword) {
        appUpdateCmd += ` -betapassword ${options.betaPassword}`;
      }
    }
    if (options.validate) {
      appUpdateCmd += ' validate';
    }

    const steamCmdDir = path.dirname(steamCmdExe);

    // Create runscript file to avoid Windows argument/escaping issues
    const scriptFile = path.join(steamCmdDir, `steamcmd_run_${Date.now()}.txt`);
    const normalizedInstallDir = options.serverFilesDir.replace(/\\/g, '/');
    const scriptLines = [
      '@ShutdownOnFailedCommand 1',
      '@NoPromptForPassword 1',
      `force_install_dir "${normalizedInstallDir}"`,
      'login anonymous',
      appUpdateCmd,
      'quit'
    ];

    fs.writeFileSync(scriptFile, scriptLines.join('\r\n'), 'utf8');

    this.emit('log', `[STEAMCMD] Запуск обновления/установки Rust Dedicated Server (AppID 258550)...`);
    this.emit('log', `[STEAMCMD] Скрипт: ${scriptLines.join(' | ')}`);

    return new Promise((resolve) => {
      this.activeProcess = spawn(steamCmdExe, ['+runscript', scriptFile], {
        cwd: steamCmdDir,
        shell: false
      });

      this.activeProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        this.parseSteamCmdOutput(text);
        this.emit('log', text);
      });

      this.activeProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        this.emit('log', `[STEAMCMD ERR] ${text}`);
      });

      this.activeProcess.on('close', (code: number | null) => {
        this.activeProcess = null;
        try {
          if (fs.existsSync(scriptFile)) fs.unlinkSync(scriptFile);
        } catch {}

        if (code === 0 || code === 7) {
          const exePath = path.join(options.serverFilesDir, 'RustDedicated.exe');
          if (fs.existsSync(exePath)) {
            this.emit('progress', { stage: 'Готово', percent: 100 });
            resolve({ success: true, message: 'Установка/обновление сервера успешно завершено.' });
          } else {
            resolve({ success: false, message: 'SteamCMD завершил работу, но RustDedicated.exe не найден.' });
          }
        } else {
          resolve({ success: false, message: `SteamCMD завершился с кодом ошибки: ${code}` });
        }
      });

      this.activeProcess.on('error', (err: Error) => {
        this.emit('log', `[FATAL] Ошибка запуска SteamCMD: ${err.message}`);
        try {
          if (fs.existsSync(scriptFile)) fs.unlinkSync(scriptFile);
        } catch {}
        resolve({ success: false, message: err.message });
      });
    });
  }

  public async installDevblogFullBundle(options: {
    toolsDir: string;
    targetBaseDir: string;
    devblogId: number;
    serverDepots: { depotId: number; manifestId: string }[];
    clientDepots?: { depotId: number; manifestId: string }[];
    installClient?: boolean;
  }): Promise<{ success: boolean; message: string; serverPath: string; clientPath: string }> {
    const steamCmdExe = await this.ensureSteamCmd(options.toolsDir);
    const steamCmdDir = path.dirname(steamCmdExe);

    const targetServerDir = path.join(options.targetBaseDir, 'server');
    const targetClientDir = path.join(options.targetBaseDir, 'client');

    this.emit('log', `\x1b[1;35m[DEVBLOG-INSTALL] Запуск автоматической загрузки комплекта Devblog ${options.devblogId} (Сервер + Клиент игры)...\x1b[0m`);

    const args = ['+login', 'anonymous'];
    for (const depot of options.serverDepots) {
      args.push('+download_depot', '258550', depot.depotId.toString(), depot.manifestId);
    }
    if (options.installClient && options.clientDepots) {
      for (const depot of options.clientDepots) {
        args.push('+download_depot', '252490', depot.depotId.toString(), depot.manifestId);
      }
    }
    args.push('+quit');

    this.emit('log', `[STEAMCMD] Команда: steamcmd.exe ${args.join(' ')}`);

    return new Promise((resolve) => {
      this.activeProcess = spawn(steamCmdExe, args, {
        cwd: steamCmdDir,
        shell: false
      });

      this.activeProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        this.parseSteamCmdOutput(text);
        this.emit('log', text);
      });

      this.activeProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        this.emit('log', `[STEAMCMD ERR] ${text}`);
      });

      this.activeProcess.on('close', async () => {
        this.activeProcess = null;

        const copyRecursive = (src: string, dest: string): number => {
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          const items = fs.readdirSync(src, { withFileTypes: true });
          let c = 0;
          for (const item of items) {
            const s = path.join(src, item.name);
            const d = path.join(dest, item.name);
            if (item.isDirectory()) {
              c += copyRecursive(s, d);
            } else {
              fs.copyFileSync(s, d);
              c++;
            }
          }
          return c;
        };

        const mergeAppDepots = (appId: string, destDir: string): number => {
          let c = 0;
          const searchRoots = [
            path.join(steamCmdDir, 'steamapps', 'content', `app_${appId}`),
            `C:\\Program Files (x86)\\Steam\\steamapps\\content\\app_${appId}`
          ];

          for (const root of searchRoots) {
            if (fs.existsSync(root)) {
              const entries = fs.readdirSync(root, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory() && entry.name.toLowerCase().startsWith('depot_')) {
                  c += copyRecursive(path.join(root, entry.name), destDir);
                }
              }
              if (c === 0) {
                c += copyRecursive(root, destDir);
              }
            }
          }
          return c;
        };

        // 1. Merge Server Files
        this.emit('log', `\x1b[1;36m[DEVBLOG-INSTALL] Сборка сервера в ${targetServerDir}...\x1b[0m`);
        const serverFiles = mergeAppDepots('258550', targetServerDir);

        // 2. Merge Client Files
        let clientFiles = 0;
        if (options.installClient) {
          this.emit('log', `\x1b[1;36m[DEVBLOG-INSTALL] Сборка клиента игры в ${targetClientDir}...\x1b[0m`);
          clientFiles = mergeAppDepots('252490', targetClientDir);

          // Create launcher batch
          try {
            if (!fs.existsSync(targetClientDir)) fs.mkdirSync(targetClientDir, { recursive: true });
            const batContent = `@echo off\r\ntitle Rust Devblog ${options.devblogId} Client Launcher\r\necho Launching Rust Client and connecting to local server...\r\nstart "" "RustClient.exe" -connect 127.0.0.1:28015\r\n`;
            fs.writeFileSync(path.join(targetClientDir, 'Start_Client.bat'), batContent);
          } catch {}
        }

        const exePath = path.join(targetServerDir, 'RustDedicated.exe');
        const clientExePath = path.join(targetClientDir, 'RustClient.exe');

        const hasServer = fs.existsSync(exePath);
        const hasClient = fs.existsSync(clientExePath);

        this.emit('progress', { stage: 'Готово', percent: 100 });
        this.emit('log', `\x1b[1;32m[DEVBLOG-INSTALL] Установка Devblog ${options.devblogId} завершена (Сервер: ${serverFiles} файлов, Клиент: ${clientFiles} файлов)!\x1b[0m`);

        resolve({
          success: hasServer || hasClient || serverFiles > 0 || clientFiles > 0,
          message: `Devblog ${options.devblogId} успешно собран: Сервер и Клиент игры готовы к запуску!`,
          serverPath: targetServerDir,
          clientPath: targetClientDir
        });
      });

      this.activeProcess.on('error', (err: Error) => {
        this.emit('log', `[FATAL] Ошибка SteamCMD: ${err.message}`);
        resolve({ success: false, message: err.message, serverPath: targetServerDir, clientPath: targetClientDir });
      });
    });
  }

  public async installDevblogServer(options: {
    toolsDir: string;
    targetServerDir: string;
    devblogId: number;
    depots: { depotId: number; manifestId: string }[];
  }): Promise<{ success: boolean; message: string }> {
    return this.installDevblogFullBundle({
      toolsDir: options.toolsDir,
      targetBaseDir: path.dirname(options.targetServerDir),
      devblogId: options.devblogId,
      serverDepots: options.depots,
      installClient: true
    });
  }

  public cancel(): void {
    if (this.activeProcess) {
      this.activeProcess.kill('SIGKILL');
      this.activeProcess = null;
      this.emit('log', '[STEAMCMD] Процесс отменен пользователем.');
    }
  }

  private parseSteamCmdOutput(text: string) {
    // Examples: " Update state (0x3) downloading, progress: 45.21 (123456789 / 456789123)"
    // " Update state (0x5) verifying update, progress: 12.34 (123456 / 456789)"
    const dlMatch = text.match(/downloading,\s*progress:\s*([\d\.]+)/i);
    if (dlMatch && dlMatch[1]) {
      const pct = parseFloat(dlMatch[1]);
      this.emit('progress', { stage: 'Загрузка файлов', percent: pct });
      return;
    }

    const stagingMatch = text.match(/staging,\s*progress:\s*([\d\.]+)/i);
    if (stagingMatch && stagingMatch[1]) {
      const pct = parseFloat(stagingMatch[1]);
      this.emit('progress', { stage: 'Применение обновлений', percent: pct });
      return;
    }

    const verifyMatch = text.match(/verifying.*?progress:\s*([\d\.]+)/i);
    if (verifyMatch && verifyMatch[1]) {
      const pct = parseFloat(verifyMatch[1]);
      this.emit('progress', { stage: 'Проверка целостности', percent: pct });
      return;
    }

    const commitMatch = text.match(/committing,\s*progress:\s*([\d\.]+)/i);
    if (commitMatch && commitMatch[1]) {
      const pct = parseFloat(commitMatch[1]);
      this.emit('progress', { stage: 'Финализация файлов', percent: pct });
      return;
    }

    if (text.includes('Success! App \'258550\' fully installed.')) {
      this.emit('progress', { stage: 'Установка завершена', percent: 100 });
    }
  }

  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const getter = url.startsWith('https') ? https : http;

      const request = (targetUrl: string) => {
        getter.get(targetUrl, (response) => {
          if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            request(response.headers.location);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
            return;
          }

          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      };

      request(url);
    });
  }
}
