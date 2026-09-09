import path from 'path';
import fs from 'fs';
import https from 'https';
import AdmZip from 'adm-zip';

export interface FileItem {
  name: string;
  relativePath: string;
  fullPath: string;
  size: number;
  isDir: boolean;
  modified: number;
}

export class FileService {
  public listFiles(dirPath: string, subfolder = ''): FileItem[] {
    const target = path.join(dirPath, subfolder);
    if (!fs.existsSync(target)) return [];

    const entries = fs.readdirSync(target, { withFileTypes: true });
    return entries.map(e => {
      const fullPath = path.join(target, e.name);
      let size = 0;
      let modified = 0;
      try {
        const stat = fs.statSync(fullPath);
        size = stat.size;
        modified = stat.mtimeMs;
      } catch {}

      return {
        name: e.name,
        relativePath: path.join(subfolder, e.name).replace(/\\/g, '/'),
        fullPath,
        size,
        isDir: e.isDirectory(),
        modified
      };
    });
  }

  public readFile(filePath: string): string {
    if (!fs.existsSync(filePath)) throw new Error('Файл не найден');
    return fs.readFileSync(filePath, 'utf8');
  }

  public writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  public deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  }

  public detectServerConfig(dirPath: string) {
    let actualServerPath = dirPath;
    if (!fs.existsSync(path.join(dirPath, 'RustDedicated.exe')) && fs.existsSync(path.join(dirPath, 'rustds', 'RustDedicated.exe'))) {
      actualServerPath = path.join(dirPath, 'rustds');
    }

    const hasExe = fs.existsSync(path.join(actualServerPath, 'RustDedicated.exe'));
    const isCarbon = fs.existsSync(path.join(actualServerPath, 'carbon')) || fs.existsSync(path.join(actualServerPath, 'RustDedicated_Data', 'Managed', 'Carbon.Core.dll'));
    const isOxide = fs.existsSync(path.join(actualServerPath, 'oxide')) || fs.existsSync(path.join(actualServerPath, 'RustDedicated_Data', 'Managed', 'Oxide.Core.dll'));

    let framework = 'vanilla';
    if (isCarbon) framework = 'carbon_release';
    else if (isOxide) framework = 'oxide';

    let serverName = path.basename(dirPath);
    let port = 28015;
    let queryPort = 28016;
    let rconPort = 28017;
    let rconPassword = 'admin';
    let seed = 123456;
    let worldSize = 3000;
    let maxPlayers = 50;
    let identity = 'rustserver';

    // Try parsing Run_DS.bat if exists
    const batCandidates = [
      path.join(dirPath, 'Run_DS.bat'),
      path.join(actualServerPath, 'Run_DS.bat'),
      path.join(dirPath, 'start.bat'),
      path.join(actualServerPath, 'start.bat')
    ];

    for (const batFile of batCandidates) {
      if (fs.existsSync(batFile)) {
        try {
          const content = fs.readFileSync(batFile, 'utf8');
          const nameMatch = content.match(/\+server\.hostname\s+"([^"]+)"/i) || content.match(/\+server\.hostname\s+([^\s\^]+)/i);
          if (nameMatch) serverName = nameMatch[1];

          const portMatch = content.match(/\+server\.port\s+(\d+)/i);
          if (portMatch) port = parseInt(portMatch[1]);

          const queryMatch = content.match(/\+server\.queryport\s+(\d+)/i);
          if (queryMatch) queryPort = parseInt(queryMatch[1]);

          const rconPortMatch = content.match(/\+rcon\.port\s+(\d+)/i);
          if (rconPortMatch) rconPort = parseInt(rconPortMatch[1]);

          const rconPassMatch = content.match(/\+rcon\.password\s+"([^"]+)"/i) || content.match(/\+rcon\.password\s+([^\s\^]+)/i);
          if (rconPassMatch) rconPassword = rconPassMatch[1];

          const seedMatch = content.match(/\+server\.seed\s+(\d+)/i);
          if (seedMatch) seed = parseInt(seedMatch[1]);

          const worldMatch = content.match(/\+server\.worldsize\s+(\d+)/i);
          if (worldMatch) worldSize = parseInt(worldMatch[1]);

          const identMatch = content.match(/\+server\.identity\s+"([^"]+)"/i) || content.match(/\+server\.identity\s+([^\s\^]+)/i);
          if (identMatch) identity = identMatch[1];

          const maxMatch = content.match(/\+server\.maxplayers\s+(\d+)/i);
          if (maxMatch) maxPlayers = parseInt(maxMatch[1]);
          break;
        } catch {}
      }
    }

    return {
      isValid: hasExe,
      serverPath: actualServerPath,
      serverName,
      port,
      queryPort,
      rconPort,
      rconPassword,
      seed,
      worldSize,
      maxPlayers,
      identity,
      framework,
      saveInterval: 300,
      autoRestartOnCrash: true
    };
  }

  public validateServers(serverPaths: string[]): Record<string, { exists: boolean; hasExe: boolean }> {
    const results: Record<string, { exists: boolean; hasExe: boolean }> = {};
    for (const sp of serverPaths) {
      if (!sp || typeof sp !== 'string') continue;
      const exists = fs.existsSync(sp);
      let hasExe = false;
      if (exists) {
        hasExe = fs.existsSync(path.join(sp, 'RustDedicated.exe')) ||
                 fs.existsSync(path.join(sp, 'rustds', 'RustDedicated.exe'));
      }
      results[sp] = { exists, hasExe };
    }
    return results;
  }

  public autoDiscoverServers(): any[] {
    const candidates: string[] = [
      'Z:\\ai\\apps\\CarbonRustReactTest\\rustds',
      'Z:\\ai\\apps\\CarbonRustReactTest',
      path.resolve(__dirname, '../../../CarbonRustReactTest/rustds'),
      path.resolve(__dirname, '../../../CarbonRustReactTest'),
      'C:\\RustServer\\rustds',
      'C:\\RustServer',
      'D:\\RustServer\\rustds',
      'D:\\RustServer',
      'C:\\rustds',
      'D:\\rustds'
    ];

    try {
      const parentDir = path.resolve(process.cwd(), '..');
      if (fs.existsSync(parentDir)) {
        const siblings = fs.readdirSync(parentDir, { withFileTypes: true });
        for (const s of siblings) {
          if (s.isDirectory()) {
            candidates.push(path.join(parentDir, s.name));
            candidates.push(path.join(parentDir, s.name, 'rustds'));
          }
        }
      }
    } catch {}

    const foundConfigs: any[] = [];
    const visited = new Set<string>();

    for (const p of candidates) {
      try {
        if (!fs.existsSync(p)) continue;
        const normalized = path.resolve(p).toLowerCase();
        if (visited.has(normalized)) continue;
        visited.add(normalized);

        const detected = this.detectServerConfig(p);
        if (detected && detected.isValid) {
          const actualNorm = path.resolve(detected.serverPath).toLowerCase();
          if (!visited.has(actualNorm)) {
            visited.add(actualNorm);
            foundConfigs.push(detected);
          }
        }
      } catch {}
    }

    return foundConfigs;
  }

  public createBackup(serverDir: string, backupDestDir: string, backupName: string): string {
    if (!fs.existsSync(backupDestDir)) {
      fs.mkdirSync(backupDestDir, { recursive: true });
    }

    const zip = new AdmZip();
    const saveDir = path.join(serverDir, 'server');
    const carbonDir = path.join(serverDir, 'carbon');
    const oxideDir = path.join(serverDir, 'oxide');

    if (fs.existsSync(saveDir)) zip.addLocalFolder(saveDir, 'server');
    if (fs.existsSync(carbonDir)) zip.addLocalFolder(carbonDir, 'carbon');
    if (fs.existsSync(oxideDir)) zip.addLocalFolder(oxideDir, 'oxide');

    const cleanName = backupName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipPath = path.join(backupDestDir, `${cleanName}_${timestamp}.zip`);
    zip.writeZip(zipPath);
    return zipPath;
  }

  public listPluginConfigs(serverDir: string) {
    const results: Array<{
      id: string;
      name: string;
      pluginName: string;
      category: 'config' | 'data' | 'server_cfg';
      framework: 'oxide' | 'carbon' | 'rust';
      fullPath: string;
      relativePath: string;
      size: number;
      modified: number;
    }> = [];

    const dirsToScan = [
      { p: path.join(serverDir, 'oxide', 'config'), cat: 'config' as const, fw: 'oxide' as const },
      { p: path.join(serverDir, 'carbon', 'configs'), cat: 'config' as const, fw: 'carbon' as const },
      { p: path.join(serverDir, 'carbon', 'config'), cat: 'config' as const, fw: 'carbon' as const },
      { p: path.join(serverDir, 'oxide', 'data'), cat: 'data' as const, fw: 'oxide' as const },
      { p: path.join(serverDir, 'carbon', 'data'), cat: 'data' as const, fw: 'carbon' as const }
    ];

    for (const d of dirsToScan) {
      if (fs.existsSync(d.p)) {
        try {
          const files = fs.readdirSync(d.p, { withFileTypes: true });
          for (const f of files) {
            if (f.isFile() && f.name.endsWith('.json')) {
              const fullPath = path.join(d.p, f.name);
              const stat = fs.statSync(fullPath);
              const pluginName = f.name.replace(/\.json$/i, '');
              results.push({
                id: `${d.fw}_${d.cat}_${f.name}`,
                name: f.name,
                pluginName,
                category: d.cat,
                framework: d.fw,
                fullPath,
                relativePath: path.relative(serverDir, fullPath).replace(/\\/g, '/'),
                size: stat.size,
                modified: stat.mtimeMs
              });
            }
          }
        } catch {}
      }
    }

    // Also scan server.cfg
    try {
      const serverBase = path.join(serverDir, 'server');
      if (fs.existsSync(serverBase)) {
        const identities = fs.readdirSync(serverBase, { withFileTypes: true });
        for (const ident of identities) {
          if (ident.isDirectory()) {
            const cfgPath = path.join(serverBase, ident.name, 'cfg', 'server.cfg');
            if (fs.existsSync(cfgPath)) {
              const stat = fs.statSync(cfgPath);
              results.push({
                id: `server_cfg_${ident.name}`,
                name: `server.cfg (${ident.name})`,
                pluginName: 'server.cfg',
                category: 'server_cfg',
                framework: 'rust',
                fullPath: cfgPath,
                relativePath: path.relative(serverDir, cfgPath).replace(/\\/g, '/'),
                size: stat.size,
                modified: stat.mtimeMs
              });
            }
          }
        }
      }
    } catch {}

    return results;
  }

  public listBackups(backupDestDir: string) {
    if (!fs.existsSync(backupDestDir)) return [];
    try {
      const files = fs.readdirSync(backupDestDir, { withFileTypes: true });
      return files
        .filter((f) => f.isFile() && f.name.endsWith('.zip'))
        .map((f) => {
          const fullPath = path.join(backupDestDir, f.name);
          const stat = fs.statSync(fullPath);
          return {
            fileName: f.name,
            fullPath,
            sizeBytes: stat.size,
            sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
            created: stat.mtimeMs
          };
        })
        .sort((a, b) => b.created - a.created);
    } catch {
      return [];
    }
  }

  public restoreBackup(zipPath: string, targetServerDir: string): boolean {
    if (!fs.existsSync(zipPath)) throw new Error('Архив бэкапа не найден');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(targetServerDir, true);
    return true;
  }

  /**
   * Upload a valid Rust .map file directly to Facepunch Public Map Storage CDN
   * Endpoint: PUT https://api.facepunch.com/api/public/rust-map-upload/<fileName>
   * Response: https://files.facepunch.com/rust/maps/<sha256>/<fileName>
   */
  public async uploadMapToFacepunch(
    filePath: string,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; mapUrl?: string; message: string }> {
    return new Promise((resolve) => {
      if (!fs.existsSync(filePath)) {
        return resolve({ success: false, message: 'Файл карты (.map) не найден на диске.' });
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      if (fileSize < 1000) {
        return resolve({ success: false, message: 'Файл карты поврежден или имеет неверный размер.' });
      }

      const fileName = path.basename(filePath);
      const options: https.RequestOptions = {
        hostname: 'api.facepunch.com',
        port: 443,
        path: `/api/public/rust-map-upload/${encodeURIComponent(fileName)}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileSize
        }
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200 && responseBody.trim().startsWith('http')) {
            const cdnUrl = responseBody.trim();
            resolve({
              success: true,
              mapUrl: cdnUrl,
              message: `Карта успешно загружена на официальный CDN Facepunch: ${cdnUrl}`
            });
          } else {
            resolve({
              success: false,
              message: `Facepunch API отклонил загрузку (код ${res.statusCode}): ${responseBody.trim() || res.statusMessage}`
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          message: `Сетевая ошибка при загрузке карты на Facepunch CDN: ${err.message}`
        });
      });

      let uploadedBytes = 0;
      const readStream = fs.createReadStream(filePath);
      readStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        if (onProgress && fileSize > 0) {
          const percent = Math.round((uploadedBytes / fileSize) * 100);
          onProgress(percent);
        }
      });

      readStream.pipe(req);
    });
  }
}

