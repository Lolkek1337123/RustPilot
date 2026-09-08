import os from 'os';

export class SystemService {
  private previousCpuInfo = this.getCpuSnapshot();

  public getCpuUsage(): number {
    const current = this.getCpuSnapshot();
    const idleDiff = current.idle - this.previousCpuInfo.idle;
    const totalDiff = current.total - this.previousCpuInfo.total;
    this.previousCpuInfo = current;

    if (totalDiff === 0) return 0;
    const usage = 100 - (100 * idleDiff) / totalDiff;
    return Math.max(0, Math.min(100, Math.round(usage * 10) / 10));
  }

  public getMemoryUsage(): { totalMb: number; freeMb: number; usedMb: number; usedPercent: number } {
    const total = Math.round(os.totalmem() / (1024 * 1024));
    const free = Math.round(os.freemem() / (1024 * 1024));
    const used = total - free;
    const usedPercent = Math.round((used / total) * 100);
    return { totalMb: total, freeMb: free, usedMb: used, usedPercent };
  }

  private getCpuSnapshot(): { idle: number; total: number } {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += (cpu.times as any)[type];
      }
      idle += cpu.times.idle;
    }

    return { idle, total };
  }
}
