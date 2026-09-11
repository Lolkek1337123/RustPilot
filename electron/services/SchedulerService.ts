import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { ProcessService } from './ProcessService';
import { RconService } from './RconService';
import { FileService } from './FileService';

export interface ScheduledTask {
  id: string;
  serverPath: string;
  type: 'restart' | 'wipe' | 'broadcast' | 'backup';
  enabled: boolean;
  time?: string; // HH:mm format, e.g. "05:00"
  dayOfWeek?: number; // 0=Sun, 1=Mon, ..., 4=Thu
  intervalMinutes?: number; // for repeating broadcasts/backups
  message?: string; // for broadcast
  wipeType?: 'full' | 'map' | 'bp';
  lastRunTimestamp?: number;
}

export class SchedulerService extends EventEmitter {
  private tasks: ScheduledTask[] = [];
  private ticker: NodeJS.Timeout | null = null;
  private processService: ProcessService | null = null;
  private rconService: RconService | null = null;
  private fileService: FileService | null = null;
  private storageFile: string;

  constructor() {
    super();
    this.storageFile = path.join(
      app ? app.getPath('userData') : process.cwd(),
      'scheduler_tasks.json'
    );
    this.loadFromDisk();
    this.ticker = setInterval(() => this.checkSchedule(), 30000); // Check every 30s
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.tasks = parsed;
        }
      }
    } catch {}
  }

  private persistToDisk(): void {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.tasks, null, 2), 'utf8');
    } catch {}
  }

  public initServices(proc: ProcessService, rcon: RconService, file: FileService) {
    this.processService = proc;
    this.rconService = rcon;
    this.fileService = file;
  }

  public getTasks(serverPath?: string): ScheduledTask[] {
    if (serverPath) {
      return this.tasks.filter((t) => t.serverPath === serverPath);
    }
    return this.tasks;
  }

  public saveTasks(tasks: ScheduledTask[]): void {
    this.tasks = tasks;
    this.persistToDisk();
  }

  public addTask(task: ScheduledTask): void {
    this.tasks.push(task);
    this.persistToDisk();
  }

  public removeTask(taskId: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    this.persistToDisk();
  }

  public toggleTask(taskId: string, enabled: boolean): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.enabled = enabled;
      this.persistToDisk();
    }
  }

  private async checkSchedule() {
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const currentDay = now.getDay();
    const nowMs = now.getTime();

    for (const task of this.tasks) {
      if (!task.enabled) continue;
      if (!this.processService?.isRunning(task.serverPath)) continue;

      // 1. Specific Time-based tasks (Restart & Wipe)
      if (task.time === currentTimeStr) {
        // Prevent running multiple times in the same minute
        if (task.lastRunTimestamp && nowMs - task.lastRunTimestamp < 90000) {
          continue;
        }

        // Check day of week if specified
        if (task.dayOfWeek !== undefined && task.dayOfWeek !== currentDay) {
          continue;
        }

        task.lastRunTimestamp = nowMs;
        this.executeTask(task);
      }

      // 2. Interval-based tasks (Broadcast & Backup)
      if (task.intervalMinutes && task.intervalMinutes > 0) {
        const intervalMs = task.intervalMinutes * 60 * 1000;
        if (!task.lastRunTimestamp || nowMs - task.lastRunTimestamp >= intervalMs) {
          task.lastRunTimestamp = nowMs;
          this.executeTask(task);
        }
      }
    }
  }

  private async executeTask(task: ScheduledTask) {
    const sPath = task.serverPath;

    switch (task.type) {
      case 'restart': {
        this.emit('task-triggered', { task, message: 'Запуск планового авто-рестарта сервера' });
        // Warning messages before restart
        if (this.rconService) {
          await this.rconService.sendCommand(sPath, 'say "⚠️ [АВТО-РЕСТАРТ] Сервер перезагружается по расписанию через 10 секунд! Сохранение мира..."');
          await this.rconService.sendCommand(sPath, 'server.save');
        }

        setTimeout(async () => {
          if (this.processService) {
            const inst = this.processService.getInstance(sPath);
            if (inst) {
              const cfg = inst.config;
              await this.processService.stopServer(sPath);
              setTimeout(() => {
                this.processService?.startServer(cfg);
              }, 4000);
            }
          }
        }, 10000);
        break;
      }

      case 'wipe': {
        this.emit('task-triggered', { task, message: 'Запуск планового вайпа сервера' });
        if (this.rconService) {
          await this.rconService.sendCommand(sPath, 'say "☢️ [ПЛАНОВЫЙ ВАЙП] Сервер уходит на вайп через 10 секунд!"');
        }
        setTimeout(async () => {
          if (this.processService) {
            const inst = this.processService.getInstance(sPath);
            if (inst) {
              const cfg = { ...inst.config, seed: Math.floor(Math.random() * 999999) + 100000 };
              await this.processService.stopServer(sPath);
              await this.processService.performWipe(sPath, task.wipeType || 'map');
              setTimeout(() => {
                this.processService?.startServer(cfg);
              }, 4000);
            }
          }
        }, 10000);
        break;
      }

      case 'broadcast': {
        if (task.message && this.rconService) {
          await this.rconService.sendCommand(sPath, `say "${task.message}"`);
        }
        break;
      }

      case 'backup': {
        if (this.fileService) {
          const defaultBackupDir = path.resolve(sPath, '..', '_backups');
          try {
            this.fileService.createBackup(sPath, defaultBackupDir, 'AutoBackup');
            this.emit('task-triggered', { task, message: 'Автоматический бэкап сервера успешно создан' });
          } catch (err: any) {
            console.error(`[Scheduler] AutoBackup failed for ${sPath}:`, err);
            this.emit('task-triggered', { task, error: true, message: `Ошибка создания автобэкапа: ${err.message}` });
          }
        }
        break;
      }
    }
  }
}
