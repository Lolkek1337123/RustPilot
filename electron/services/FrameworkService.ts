import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import AdmZip from 'adm-zip';
import { EventEmitter } from 'events';

export type ModFramework = 'carbon_release' | 'carbon_preview' | 'oxide' | 'vanilla';

export class FrameworkService extends EventEmitter {
  public static readonly CARBON_RELEASE_URL = 'https://github.com/CarbonCommunity/Carbon/releases/download/production_build/Carbon.Windows.Release.zip';
  public static readonly CARBON_PREVIEW_URL = 'https://github.com/CarbonCommunity/Carbon/releases/download/preview_build/Carbon.Windows.Debug.zip';
  public static readonly OXIDE_URL = 'https://umod.org/games/rust/download';

  public isFrameworkInstalled(serverDir: string, framework: ModFramework): boolean {
    if (framework === 'vanilla') return true;
    if (framework.startsWith('carbon')) {
      const dllPath = path.join(serverDir, 'RustDedicated_Data', 'Managed', 'Carbon.Core.dll');
      const carbonDir = path.join(serverDir, 'carbon');
      return fs.existsSync(dllPath) || fs.existsSync(carbonDir);
    }
    if (framework === 'oxide') {
      const dllPath = path.join(serverDir, 'RustDedicated_Data', 'Managed', 'Oxide.Core.dll');
      const oxideDir = path.join(serverDir, 'oxide');
      return fs.existsSync(dllPath) || fs.existsSync(oxideDir);
    }
    return false;
  }

  public async installFramework(serverDir: string, framework: ModFramework): Promise<{ success: boolean; message: string }> {
    if (framework === 'vanilla') {
      this.emit('log', '[MOD] Выбран чистый режим Vanilla (без модов).');
      return { success: true, message: 'Выбран режим Vanilla.' };
    }

    let downloadUrl = '';
    let label = '';

    if (framework === 'carbon_release') {
      downloadUrl = FrameworkService.CARBON_RELEASE_URL;
      label = 'Carbon (Production Release)';
    } else if (framework === 'carbon_preview') {
      downloadUrl = FrameworkService.CARBON_PREVIEW_URL;
      label = 'Carbon (Preview/Edge)';
    } else if (framework === 'oxide') {
      downloadUrl = FrameworkService.OXIDE_URL;
      label = 'Oxide / uMod';
    }

    this.emit('log', `\x1b[1;36m[UPDATER] Скачивание последней актуальной версии ${label}...\x1b[0m`);
    this.emit('log', `[UPDATER] URL: ${downloadUrl}`);

    const tempZip = path.join(serverDir, `_temp_mod_${Date.now()}.zip`);

    try {
      await this.downloadFileWithRedirect(downloadUrl, tempZip);
      this.emit('log', `[UPDATER] Распаковка и обновление файлов ${label} в каталог сервера...`);

      const zip = new AdmZip(tempZip);
      zip.extractAllTo(serverDir, true);

      try {
        fs.unlinkSync(tempZip);
      } catch {}

      // Create essential directory structure
      if (framework.startsWith('carbon')) {
        fs.mkdirSync(path.join(serverDir, 'carbon', 'plugins'), { recursive: true });
        fs.mkdirSync(path.join(serverDir, 'carbon', 'configs'), { recursive: true });
        fs.mkdirSync(path.join(serverDir, 'carbon', 'data'), { recursive: true });
      } else if (framework === 'oxide') {
        fs.mkdirSync(path.join(serverDir, 'oxide', 'plugins'), { recursive: true });
        fs.mkdirSync(path.join(serverDir, 'oxide', 'config'), { recursive: true });
        fs.mkdirSync(path.join(serverDir, 'oxide', 'data'), { recursive: true });
      }

      this.emit('log', `\x1b[1;32m[SUCCESS] Фреймворк ${label} успешно обновлен до последней сборки!\x1b[0m`);
      return { success: true, message: `${label} успешно обновлен.` };
    } catch (err: any) {
      this.emit('log', `\x1b[1;31m[MOD ERROR] Ошибка обновления ${label}: ${err.message}\x1b[0m`);
      if (fs.existsSync(tempZip)) {
        try { fs.unlinkSync(tempZip); } catch {}
      }
      return { success: false, message: err.message };
    }
  }

  private downloadFileWithRedirect(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const getter = url.startsWith('https') ? https : http;

      const makeRequest = (targetUrl: string, depth = 0) => {
        if (depth > 8) {
          reject(new Error('Слишком много редиректов при скачивании'));
          return;
        }

        const req = getter.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RustPilot/1.0',
            'Accept': '*/*'
          }
        }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            makeRequest(res.headers.location, depth + 1);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP Ошибка: ${res.statusCode} (${res.statusMessage})`));
            return;
          }

          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        });

        req.on('error', (err) => {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          reject(err);
        });
      };

      makeRequest(url);
    });
  }
}
