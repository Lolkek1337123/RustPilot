import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import AdmZip from 'adm-zip';

// In Electron, the default 'fs' module is monkey-patched to treat any path ending in '.asar'
// as a read-only virtual archive. Creating write streams or copying raw .asar files via standard 'fs'
// throws "Error: Invalid package <path>".
// Electron provides 'original-fs' (the unpatched Node.js fs module) specifically to read and write
// .asar archives as standard binary files on disk.
let rawFs: typeof fs = fs;
try {
  if (typeof process !== 'undefined' && process.versions && 'electron' in process.versions) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ofs = require('original-fs');
    if (ofs && typeof ofs.createWriteStream === 'function') {
      rawFs = ofs;
    }
  }
} catch {
  rawFs = fs;
}

export interface UpdateServiceOptions {
  appVersion?: string;
  isPackaged?: boolean;
  exePath?: string;
  resourcesPath?: string;
  tempPath?: string;
  quitApp?: () => void;
}

export interface AppUpdateProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
  transferredFormatted: string;
  totalFormatted: string;
  speed: string;
  stage: 'downloading' | 'extracting' | 'ready' | 'error';
  error?: string;
}

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName?: string;
  releaseDate?: string;
  releaseNotes?: string;
  htmlUrl?: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  assetSizeFormatted?: string;
  assetType?: 'asar' | 'zip' | 'exe' | 'other';
  canDirectUpdate?: boolean;
  repository?: string;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 МБ';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} МБ`;
  const kb = bytes / 1024;
  return `${Math.round(kb)} КБ`;
}

export class UpdateService extends EventEmitter {
  private currentVersion: string = '1.0.0';
  private options: UpdateServiceOptions;
  private defaultRepoList: string[] = [
    'Lolkek1337123/RustPilot',
    'Lolkek1337123/TRPServerPanel'
  ];

  private latestUpdateInfo: AppUpdateInfo | null = null;
  private stagingDir: string | null = null;
  private stagedAssetType: 'asar' | 'zip' | 'exe' | 'full' = 'asar';
  private isDownloading: boolean = false;

  constructor(optionsOrVersion?: UpdateServiceOptions | string) {
    super();
    if (typeof optionsOrVersion === 'string') {
      this.options = { appVersion: optionsOrVersion };
      this.currentVersion = optionsOrVersion.replace(/^[^0-9]*/, '');
    } else {
      this.options = optionsOrVersion || {};
      if (this.options.appVersion) {
        this.currentVersion = this.options.appVersion.replace(/^[^0-9]*/, '');
      }
    }
  }

  public setOptions(options: Partial<UpdateServiceOptions>): void {
    this.options = { ...this.options, ...options };
    if (options.appVersion) {
      this.currentVersion = options.appVersion.replace(/^[^0-9]*/, '');
    }
  }

  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  public getLatestUpdateInfo(): AppUpdateInfo | null {
    return this.latestUpdateInfo;
  }

  private parseSemVer(v: string): number[] {
    const clean = v.replace(/^[^0-9]*/, '').trim();
    const parts = clean.split(/[-+.]/).map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
    return parts.length > 0 ? parts : [0];
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const l = this.parseSemVer(latest);
    const c = this.parseSemVer(current);
    const maxLen = Math.max(l.length, c.length);
    for (let i = 0; i < maxLen; i++) {
      const lPart = l[i] ?? 0;
      const cPart = c[i] ?? 0;
      if (lPart > cPart) return true;
      if (lPart < cPart) return false;
    }
    return false;
  }

  public async checkGitHubUpdates(customRepo?: string): Promise<AppUpdateInfo> {
    const reposToTry = customRepo?.trim()
      ? [customRepo.trim(), ...this.defaultRepoList]
      : this.defaultRepoList;

    let lastError: string | null = null;

    for (const repo of reposToTry) {
      try {
        const url = `https://api.github.com/repos/${repo}/releases/latest`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'RustPilot-App/1.0',
            Accept: 'application/vnd.github.v3+json'
          }
        });
        clearTimeout(timeout);

        if (response.status === 404) {
          continue;
        }

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          continue;
        }

        const data: any = await response.json();
        if (!data || !data.tag_name) {
          continue;
        }

        const rawTag = String(data.tag_name);
        const cleanTag = rawTag.replace(/^v/i, '').trim();
        const hasUpdate = this.isNewerVersion(cleanTag, this.currentVersion);

        // Analyze and prioritize release assets
        let downloadUrl = data.html_url;
        let assetName: string | undefined;
        let assetSize: number | undefined;
        let assetType: 'asar' | 'zip' | 'exe' | 'other' = 'other';
        let canDirectUpdate = false;

        if (Array.isArray(data.assets) && data.assets.length > 0) {
          const isCompatibleAsset = (asset: any) => {
            if (!asset || typeof asset.name !== 'string') return false;
            const n = asset.name.toLowerCase();
            // Exclude obsolete C# WPF TRPServerPanel releases
            if (n.includes('trpserverpanel')) return false;
            return true;
          };

          // 1. Prefer app.asar (ultra fast, direct atomic bundle swap, ~2-3 MB)
          const asarAsset = data.assets.find(
            (a: any) => typeof a.name === 'string' && a.name.toLowerCase() === 'app.asar'
          );

          // 2. Prefer zip bundle
          const zipAsset = data.assets.find(
            (a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.zip') && isCompatibleAsset(a)
          );

          // 3. Executable / installer
          const exeAsset = data.assets.find(
            (a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe') && isCompatibleAsset(a)
          );

          const chosenAsset = asarAsset || zipAsset || exeAsset;
          if (chosenAsset?.browser_download_url) {
            downloadUrl = chosenAsset.browser_download_url;
            assetName = chosenAsset.name;
            assetSize = chosenAsset.size;
            canDirectUpdate = true;

            if (chosenAsset === asarAsset) assetType = 'asar';
            else if (chosenAsset === zipAsset) assetType = 'zip';
            else if (chosenAsset === exeAsset) assetType = 'exe';
          }
        }

        const info: AppUpdateInfo = {
          hasUpdate,
          currentVersion: `v${this.currentVersion}`,
          latestVersion: rawTag.startsWith('v') ? rawTag : `v${rawTag}`,
          releaseName: data.name || rawTag,
          releaseDate: data.published_at ? new Date(data.published_at).toLocaleDateString('ru-RU') : undefined,
          releaseNotes: data.body || 'Свежее обновление RustPilot на GitHub с новыми функциями и оптимизациями.',
          htmlUrl: data.html_url,
          downloadUrl,
          assetName,
          assetSize,
          assetSizeFormatted: assetSize ? formatBytes(assetSize) : undefined,
          assetType,
          canDirectUpdate,
          repository: repo
        };

        this.latestUpdateInfo = info;
        return info;
      } catch (err: any) {
        lastError = err?.message || 'Сетевая ошибка при обращении к GitHub';
      }
    }

    const fallbackInfo: AppUpdateInfo = {
      hasUpdate: false,
      currentVersion: `v${this.currentVersion}`,
      latestVersion: `v${this.currentVersion}`,
      canDirectUpdate: false,
      error: lastError || 'Релизы на GitHub не найдены'
    };

    this.latestUpdateInfo = fallbackInfo;
    return fallbackInfo;
  }

  public async downloadUpdate(
    downloadUrl?: string,
    onProgress?: (progress: AppUpdateProgress) => void
  ): Promise<{ success: boolean; error?: string; stagingDir?: string; assetType?: string }> {
    if (this.isDownloading) {
      return { success: false, error: 'Загрузка уже выполняется' };
    }

    const targetUrl = downloadUrl || this.latestUpdateInfo?.downloadUrl;
    if (!targetUrl) {
      return { success: false, error: 'Ссылка для скачивания обновления не найдена' };
    }

    this.isDownloading = true;

    try {
      const tempBase = this.options.tempPath || os.tmpdir();
      const staging = path.join(tempBase, 'rustpilot-update-staging');

      if (rawFs.existsSync(staging)) {
        try {
          rawFs.rmSync(staging, { recursive: true, force: true });
        } catch {
          // ignore lock on old folder
        }
      }
      rawFs.mkdirSync(staging, { recursive: true });

      onProgress?.({
        percent: 0,
        transferredBytes: 0,
        totalBytes: 0,
        transferredFormatted: '0 МБ',
        totalFormatted: 'Определение...',
        speed: '0 КБ/с',
        stage: 'downloading'
      });

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'RustPilot-App/1.0',
          Accept: 'application/octet-stream, application/vnd.github.v3+json, */*'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки с GitHub: HTTP ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : (this.latestUpdateInfo?.assetSize || 0);

      // Extract original filename
      let fileName = this.latestUpdateInfo?.assetName || 'app.asar';
      try {
        const parsedUrl = new URL(targetUrl);
        const segments = parsedUrl.pathname.split('/');
        const last = segments[segments.length - 1];
        if (last && (last.endsWith('.asar') || last.endsWith('.zip') || last.endsWith('.exe'))) {
          fileName = decodeURIComponent(last);
        }
      } catch {}

      // Write to a temporary .tmp file so Electron's asar hook doesn't intercept it during download
      const tempDownloadPath = path.join(staging, 'update-download.payload.tmp');

      if (!response.body) {
        throw new Error('Ответ сервера не содержит данных (пустой поток)');
      }

      // Stream with speed & progress calculation
      const nodeStream = Readable.fromWeb(response.body as any);
      let transferred = 0;
      let lastTime = Date.now();
      let lastTransferred = 0;
      let speedStr = '0 КБ/с';

      nodeStream.on('data', (chunk: Buffer) => {
        transferred += chunk.length;
        const now = Date.now();
        if (now - lastTime >= 250) {
          const bytesDiff = transferred - lastTransferred;
          const secDiff = Math.max(0.01, (now - lastTime) / 1000);
          const bytesPerSec = bytesDiff / secDiff;

          if (bytesPerSec >= 1024 * 1024) {
            speedStr = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} МБ/с`;
          } else {
            speedStr = `${Math.round(bytesPerSec / 1024)} КБ/с`;
          }

          lastTime = now;
          lastTransferred = transferred;

          const pct = totalBytes > 0 ? Math.min(99, Math.round((transferred / totalBytes) * 100)) : 0;
          onProgress?.({
            percent: pct,
            transferredBytes: transferred,
            totalBytes,
            transferredFormatted: formatBytes(transferred),
            totalFormatted: formatBytes(totalBytes),
            speed: speedStr,
            stage: 'downloading'
          });
        }
      });

      await pipeline(nodeStream, rawFs.createWriteStream(tempDownloadPath));

      if (!rawFs.existsSync(tempDownloadPath) || rawFs.statSync(tempDownloadPath).size === 0) {
        throw new Error('Файл обновления не был загружен или имеет нулевой размер');
      }

      // Processing stage
      onProgress?.({
        percent: 99,
        transferredBytes: transferred,
        totalBytes,
        transferredFormatted: formatBytes(transferred),
        totalFormatted: formatBytes(totalBytes),
        speed: 'Завершено',
        stage: 'extracting'
      });

      const lower = fileName.toLowerCase();
      if (lower.endsWith('.zip')) {
        const zipTarget = path.join(staging, fileName);
        if (rawFs.existsSync(zipTarget)) {
          try { rawFs.unlinkSync(zipTarget); } catch {}
        }
        rawFs.renameSync(tempDownloadPath, zipTarget);

        const extractDir = path.join(staging, 'extracted');
        rawFs.mkdirSync(extractDir, { recursive: true });

        const zip = new AdmZip(zipTarget);
        zip.extractAllTo(extractDir, true);

        // Check if app.asar is inside the unzipped bundle
        const findAsar = (dir: string): string | null => {
          try {
            const entries = rawFs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullP = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                const sub = findAsar(fullP);
                if (sub) return sub;
              } else if (entry.name.toLowerCase() === 'app.asar') {
                return fullP;
              }
            }
          } catch {
            // ignore access errors
          }
          return null;
        };

        const foundAsar = findAsar(extractDir);
        if (foundAsar) {
          const asarTarget = path.join(staging, 'app.asar');
          if (rawFs.existsSync(asarTarget)) {
            try { rawFs.unlinkSync(asarTarget); } catch {}
          }
          rawFs.copyFileSync(foundAsar, asarTarget);
          this.stagedAssetType = 'asar';
        } else {
          this.stagedAssetType = 'full';
        }
      } else if (lower.endsWith('.asar') || this.latestUpdateInfo?.assetType === 'asar') {
        const asarTarget = path.join(staging, 'app.asar');
        if (rawFs.existsSync(asarTarget)) {
          try { rawFs.unlinkSync(asarTarget); } catch {}
        }
        rawFs.renameSync(tempDownloadPath, asarTarget);
        this.stagedAssetType = 'asar';
      } else if (lower.endsWith('.exe')) {
        const exeTarget = path.join(staging, fileName);
        if (rawFs.existsSync(exeTarget)) {
          try { rawFs.unlinkSync(exeTarget); } catch {}
        }
        rawFs.renameSync(tempDownloadPath, exeTarget);
        this.stagedAssetType = 'exe';
      } else {
        const fileTarget = path.join(staging, fileName);
        if (rawFs.existsSync(fileTarget)) {
          try { rawFs.unlinkSync(fileTarget); } catch {}
        }
        rawFs.renameSync(tempDownloadPath, fileTarget);
        this.stagedAssetType = 'full';
      }

      this.stagingDir = staging;
      this.isDownloading = false;

      onProgress?.({
        percent: 100,
        transferredBytes: transferred,
        totalBytes: transferred,
        transferredFormatted: formatBytes(transferred),
        totalFormatted: formatBytes(transferred),
        speed: 'Готово',
        stage: 'ready'
      });

      return {
        success: true,
        stagingDir: staging,
        assetType: this.stagedAssetType
      };
    } catch (err: any) {
      this.isDownloading = false;
      const errMsg = err?.message || 'Ошибка загрузки обновления';
      onProgress?.({
        percent: 0,
        transferredBytes: 0,
        totalBytes: 0,
        transferredFormatted: '0 МБ',
        totalFormatted: '0 МБ',
        speed: '0 КБ/с',
        stage: 'error',
        error: errMsg
      });
      return { success: false, error: errMsg };
    }
  }

  public async installAndRestart(): Promise<{ success: boolean; error?: string }> {
    if (!this.stagingDir || !rawFs.existsSync(this.stagingDir)) {
      return { success: false, error: 'Файлы обновления не найдены в кэше. Скачайте обновление повторно.' };
    }

    const isPackaged = this.options.isPackaged ?? false;
    const exePath = this.options.exePath || process.execPath;
    const currentPid = process.pid;
    const targetDir = path.dirname(exePath);
    const resourcesDir = this.options.resourcesPath || path.join(targetDir, 'resources');

    // If running in development (npm run dev), staging is prepared but we do not swap running electron.exe
    if (!isPackaged) {
      console.log('[UpdateService] Dev mode: update staged at', this.stagingDir);
      return {
        success: true,
        error: undefined
      };
    }

    const updaterBatPath = path.join(this.stagingDir, 'apply-update.bat');

    let copyCommands = '';
    const stagedAsar = path.join(this.stagingDir, 'app.asar');
    const targetAsar = path.join(resourcesDir, 'app.asar');
    const oldAsar = path.join(resourcesDir, 'app.asar.old');

    if (this.stagedAssetType === 'asar' && rawFs.existsSync(stagedAsar)) {
      copyCommands = `
set RETRY=0
:COPY_ASAR_LOOP
if exist "${oldAsar}" del /f /q "${oldAsar}" >nul 2>&1
if exist "${targetAsar}" ren "${targetAsar}" "app.asar.old" >nul 2>&1
copy /y "${stagedAsar}" "${targetAsar}" >nul 2>&1
if not exist "${targetAsar}" (
    set /a RETRY+=1
    if !RETRY! leq 5 (
        timeout /t 1 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 2 >nul 2>&1
        goto COPY_ASAR_LOOP
    )
)
`;
    } else if (this.stagedAssetType === 'full') {
      const srcExtract = rawFs.existsSync(path.join(this.stagingDir, 'extracted'))
        ? path.join(this.stagingDir, 'extracted')
        : this.stagingDir;
      copyCommands = `
xcopy /s /e /y /q "${srcExtract}\\*" "${targetDir}\\" >nul 2>&1
`;
    } else {
      // Direct file copy
      copyCommands = `
copy /y "${this.stagingDir}\\*" "${targetDir}\\" >nul 2>&1
`;
    }

    const batContent = `@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title RustPilot Update Installer
cls
echo ========================================================
echo    RustPilot — Применение обновления...
echo ========================================================
echo.
echo [1/3] Закрытие предыдущей версии приложения (PID: ${currentPid})...

:: Wait for process to exit cleanly without hanging pipes
timeout /t 2 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 3 >nul 2>&1
taskkill /F /PID ${currentPid} >nul 2>&1
timeout /t 1 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 2 >nul 2>&1

echo [2/3] Замена обновленных файлов программы...
${copyCommands}

echo [3/3] Запуск обновленной версии RustPilot...
start "" "${exePath}"

echo.
echo Обновление успешно установлено!
timeout /t 1 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 2 >nul 2>&1
exit
`;

    rawFs.writeFileSync(updaterBatPath, batContent, 'utf-8');

    // Spawn detached updater batch script
    const child = spawn('cmd.exe', ['/c', updaterBatPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();

    setTimeout(() => {
      if (this.options.quitApp) {
        this.options.quitApp();
      } else {
        process.exit(0);
      }
    }, 400);

    return { success: true };
  }
}
