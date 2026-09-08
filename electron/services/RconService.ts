import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ProcessService } from './ProcessService';

export interface RconPacket {
  Identifier: number;
  Message: string;
  Name?: string;
  Type?: string;
  Stacktrace?: string;
}

export interface PlayerInfo {
  SteamID: string;
  DisplayName: string;
  Ping: number;
  Address: string;
  ConnectedSeconds: number;
  ViolationLevel?: number;
  Health?: number;
  AvatarUrl?: string;
}

export interface ServerTelemetry {
  fps: number;
  players: number;
  maxPlayers: number;
  entities: number;
  uptime: number;
  memoryMb: number;
  cpuPercent: number;
  gpuPercent: number;
  networkInKb: number;
  networkOutKb: number;
  ping: number;
}

interface ServerConnection {
  ws: WebSocket | null;
  serverPath: string;
  ip: string;
  port: number;
  pass: string;
  identifierCounter: number;
  pendingRequests: Map<number, (res: string) => void>;
  telemetry: ServerTelemetry;
  retryTimer: NodeJS.Timeout | null;
  isConnecting: boolean;
  isConnected: boolean;
  isServerReady: boolean;
  lastPingMs: number;
  lastPingSentTime: number;
}

export class RconService extends EventEmitter {
  private connections = new Map<string, ServerConnection>();
  private pollTimer: NodeJS.Timeout | null = null;
  private processServiceRef: ProcessService | null = null;

  constructor() {
    super();
    // Poll telemetry every 1.5 seconds like in TRPServerPanel
    this.pollTimer = setInterval(() => this.pollAllTelemetries(), 1500);
  }

  public setProcessService(procService: ProcessService) {
    this.processServiceRef = procService;

    // Trigger connect ONLY when server has completely finished startup and is ready
    this.processServiceRef.on('server-ready', ({ serverPath }: { serverPath: string }) => {
      const conn = this.connections.get(serverPath);
      if (conn) {
        conn.isServerReady = true;
        if (!conn.isConnected && !conn.isConnecting) {
          setTimeout(() => {
            if (!conn.isConnected && !conn.isConnecting && this.processServiceRef?.isRunning(serverPath)) {
              this.tryConnect(serverPath);
            }
          }, 1000);
        }
      }
    });

    // Fallback detection from log stream
    this.processServiceRef.on('log', ({ serverPath, text }: { serverPath: string; text: string }) => {
      const conn = this.connections.get(serverPath);
      if (!conn) return;

      const isComplete =
        text.includes('Server startup complete') ||
        text.includes('Dedicated Server Started') ||
        text.includes('SteamServer Connected') ||
        text.includes('Game Server Connected') ||
        text.includes('Server successfully started') ||
        text.includes('Your server is now ready');

      if (isComplete && !conn.isServerReady) {
        conn.isServerReady = true;
        if (!conn.isConnected && !conn.isConnecting) {
          setTimeout(() => {
            if (!conn.isConnected && !conn.isConnecting && this.processServiceRef?.isRunning(serverPath)) {
              this.tryConnect(serverPath);
            }
          }, 1000);
        }
      }
    });
  }

  public autoConnect(serverPath: string, ip: string, port: number, pass: string): void {
    const existing = this.connections.get(serverPath);
    if (existing) {
      this.disconnect(serverPath);
    }

    const host = !ip || ip === '0.0.0.0' ? '127.0.0.1' : ip;
    const isReady = this.processServiceRef?.getInstance(serverPath)?.isReady ?? false;

    const conn: ServerConnection = {
      ws: null,
      serverPath,
      ip: host,
      port,
      pass,
      identifierCounter: 1000,
      pendingRequests: new Map(),
      telemetry: {
        fps: 0,
        players: 0,
        maxPlayers: 50,
        entities: 0,
        uptime: 0,
        memoryMb: 0,
        cpuPercent: 0,
        gpuPercent: 0,
        networkInKb: 0,
        networkOutKb: 0,
        ping: 0
      },
      retryTimer: null,
      isConnecting: false,
      isConnected: false,
      isServerReady: isReady,
      lastPingMs: 0,
      lastPingSentTime: 0
    };

    this.connections.set(serverPath, conn);

    // Connect immediately ONLY if server is already confirmed ready
    if (isReady) {
      this.tryConnect(serverPath);
    }
  }

  public tryConnect(serverPath: string) {
    const conn = this.connections.get(serverPath);
    if (!conn) return;

    if (this.processServiceRef && !this.processServiceRef.isRunning(serverPath)) {
      return;
    }

    // Do not attempt connection until server completes world generation and startup
    if (!conn.isServerReady) {
      return;
    }

    if (conn.isConnecting || conn.isConnected) return;
    conn.isConnecting = true;

    // Clean any leftover ws
    if (conn.ws) {
      try {
        conn.ws.removeAllListeners();
        conn.ws.terminate();
      } catch {}
      conn.ws = null;
    }

    const host = conn.ip;
    // Format: ws://127.0.0.1:28066/password
    const url = `ws://${host}:${conn.port}/${conn.pass}`;

    try {
      const ws = new WebSocket(url, {
        handshakeTimeout: 15000
      });
      conn.ws = ws;

      const connectTimeout = setTimeout(() => {
        if (conn.isConnecting && !conn.isConnected) {
          conn.isConnecting = false;
          try {
            ws.removeAllListeners();
            ws.terminate();
          } catch {}
          conn.ws = null;
          this.scheduleRetry(serverPath);
        }
      }, 18000);

      ws.on('open', () => {
        clearTimeout(connectTimeout);
        const wasConnected = conn.isConnected;
        conn.isConnected = true;
        conn.isConnecting = false;
        if (conn.retryTimer) {
          clearTimeout(conn.retryTimer);
          conn.retryTimer = null;
        }

        if (!wasConnected) {
          this.emit('connected', { serverPath, ip: host, port: conn.port });
          this.emit('log', {
            serverPath,
            text: `[RCON] Соединение установлено! RCON онлайн (ws://${host}:${conn.port})`
          });
        }

        // Query initial metrics safely (avoid crashing server while world is still generating)
        if (conn.isServerReady) {
          this.sendCommand(serverPath, 'serverinfo');
          this.sendCommand(serverPath, 'status');
        } else {
          this.sendCommand(serverPath, 'fps');
        }
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const raw = data.toString();
          let parsedPacket: RconPacket | null = null;

          try {
            parsedPacket = JSON.parse(raw);
          } catch {}

          const msgText = parsedPacket?.Message || raw;

          // Dispatch pending callback if identifier matches
          if (parsedPacket?.Identifier && conn.pendingRequests.has(parsedPacket.Identifier)) {
            const cb = conn.pendingRequests.get(parsedPacket.Identifier);
            if (cb) cb(msgText);
            conn.pendingRequests.delete(parsedPacket.Identifier);
          }

          // Ingest telemetry from message (JSON or Regex)
          this.parseTelemetryMessage(conn, msgText);

          // Chat detection
          if (parsedPacket?.Type === 'Chat') {
            this.emit('chat', { serverPath, message: parsedPacket.Message });
          } else if (
            msgText.startsWith('[CHAT]') ||
            msgText.startsWith('[Chat]') ||
            msgText.startsWith('[Team]')
          ) {
            this.emit('chat', { serverPath, message: msgText });
          }

          this.emit('message', { serverPath, packet: parsedPacket || { Identifier: 0, Message: raw } });
        } catch {
          this.emit('log', { serverPath, text: data.toString() });
        }
      });

      ws.on('error', () => {
        clearTimeout(connectTimeout);
        conn.isConnected = false;
        conn.isConnecting = false;
        try {
          ws.terminate();
        } catch {}
        conn.ws = null;
        this.scheduleRetry(serverPath);
      });

      ws.on('close', () => {
        clearTimeout(connectTimeout);
        const wasConnected = conn.isConnected;
        conn.isConnected = false;
        conn.isConnecting = false;
        try {
          ws.terminate();
        } catch {}
        conn.ws = null;

        if (wasConnected) {
          this.emit('disconnected', { serverPath });
          this.emit('log', { serverPath, text: `[RCON] Соединение закрыто.` });
        }
        this.scheduleRetry(serverPath);
      });
    } catch {
      conn.isConnecting = false;
      conn.ws = null;
      this.scheduleRetry(serverPath);
    }
  }

  private scheduleRetry(serverPath: string) {
    const conn = this.connections.get(serverPath);
    if (!conn) return;

    if (this.processServiceRef && !this.processServiceRef.isRunning(serverPath)) {
      return;
    }

    // If server is not ready yet, wait for server-ready event instead of polling
    if (!conn.isServerReady) {
      return;
    }

    if (conn.retryTimer) return;

    conn.retryTimer = setTimeout(() => {
      conn.retryTimer = null;
      if (this.processServiceRef && this.processServiceRef.isRunning(serverPath) && !conn.isConnected && conn.isServerReady) {
        this.tryConnect(serverPath);
      }
    }, 4000);
  }

  public connect(serverPath: string, ip: string, port: number, pass: string): Promise<boolean> {
    this.autoConnect(serverPath, ip, port, pass);
    return Promise.resolve(true);
  }

  public disconnect(serverPath: string): void {
    const conn = this.connections.get(serverPath);
    if (conn) {
      if (conn.retryTimer) {
        clearTimeout(conn.retryTimer);
        conn.retryTimer = null;
      }
      conn.isConnected = false;
      conn.isConnecting = false;
      if (conn.ws) {
        try {
          conn.ws.terminate();
        } catch {}
        conn.ws = null;
      }
      this.connections.delete(serverPath);
    }
  }

  public sendCommand(serverPath: string, cmd: string): Promise<string> {
    return new Promise((resolve) => {
      const conn = this.connections.get(serverPath);

      // 1. Try WebSocket RCON
      if (conn && conn.ws && conn.ws.readyState === WebSocket.OPEN) {
        const id = ++conn.identifierCounter;
        const packet: RconPacket = {
          Identifier: id,
          Message: cmd,
          Name: 'RustPilot'
        };

        const timer = setTimeout(() => {
          if (conn.pendingRequests.has(id)) {
            conn.pendingRequests.delete(id);
            // Fallback to Stdin
            this.processServiceRef?.writeStdin(serverPath, cmd);
            resolve('');
          }
        }, 3000);

        conn.pendingRequests.set(id, (response: string) => {
          clearTimeout(timer);
          resolve(response);
        });

        try {
          conn.ws.send(JSON.stringify(packet));
        } catch {
          clearTimeout(timer);
          conn.pendingRequests.delete(id);
          this.processServiceRef?.writeStdin(serverPath, cmd);
          resolve('');
        }
        return;
      }

      // 2. Fallback: Write directly to Process STDIN
      if (this.processServiceRef) {
        const sent = this.processServiceRef.writeStdin(serverPath, cmd);
        if (sent) {
          resolve(`[STDIN] ${cmd}`);
          return;
        }
      }

      // 3. Attempt reconnect if disconnected
      if (conn && !conn.isConnected && !conn.isConnecting) {
        this.tryConnect(serverPath);
      }

      resolve('');
    });
  }

  public async getPlayers(serverPath: string): Promise<PlayerInfo[]> {
    const raw = await this.sendCommand(serverPath, 'playerlist');
    try {
      if (raw && raw.trim().startsWith('[')) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return list.map((p) => ({
            SteamID: p.SteamID || p.steamId || '',
            DisplayName: p.DisplayName || p.displayName || 'Player',
            Ping: p.Ping || p.ping || 0,
            Address: p.Address || p.address || '127.0.0.1',
            ConnectedSeconds: p.ConnectedSeconds || p.connectedSeconds || 0,
            Health: p.Health || p.health || 100,
            AvatarUrl: `https://www.steamid.link/api/v1/avatar/${p.SteamID || p.steamId}`
          }));
        }
      }
    } catch {}

    // Fallback: parse from status command table
    const statusRaw = await this.sendCommand(serverPath, 'status');
    const players: PlayerInfo[] = [];
    if (statusRaw) {
      const lines = statusRaw.split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^(\d{17,19})\s+"?(.*?)"?\s+(\d+)\s+[\d.ms]+\s+([0-9.]+):(\d+)/);
        if (match) {
          players.push({
            SteamID: match[1],
            DisplayName: match[2],
            Ping: parseInt(match[3], 10) || 1,
            Address: match[4],
            ConnectedSeconds: 60,
            Health: 100,
            AvatarUrl: `https://www.steamid.link/api/v1/avatar/${match[1]}`
          });
        }
      }
    }

    return players;
  }

  public isConnected(serverPath: string): boolean {
    const conn = this.connections.get(serverPath);
    return !!conn && conn.isConnected && conn.ws !== null && conn.ws.readyState === WebSocket.OPEN;
  }

  private parseTelemetryMessage(conn: ServerConnection, message: string) {
    if (!message || message.trim().length === 0) return;

    try {
      // 1. JSON parsing (serverinfo)
      const jsonStart = message.indexOf('{');
      if (
        jsonStart >= 0 &&
        (message.includes('Hostname') ||
          message.includes('EntityCount') ||
          message.includes('Entities') ||
          message.includes('Framerate') ||
          message.includes('fps'))
      ) {
        let jsonPart = message.substring(jsonStart);
        const jsonEnd = jsonPart.lastIndexOf('}');
        if (jsonEnd >= 0) jsonPart = jsonPart.substring(0, jsonEnd + 1);

        const obj = JSON.parse(jsonPart);
        if (obj.Framerate !== undefined || obj.fps !== undefined) {
          conn.telemetry.fps = Math.round(Number(obj.Framerate ?? obj.fps ?? 0));
        }
        if (obj.EntityCount !== undefined || obj.Entities !== undefined || obj.ents !== undefined) {
          conn.telemetry.entities = Number(obj.EntityCount ?? obj.Entities ?? obj.ents ?? 0);
        }
        if (obj.Players !== undefined) {
          conn.telemetry.players = Number(obj.Players);
        }
        if (obj.MaxPlayers !== undefined) {
          conn.telemetry.maxPlayers = Number(obj.MaxPlayers);
        }
        if (obj.NetworkIn !== undefined) {
          conn.telemetry.networkInKb = Math.round(Number(obj.NetworkIn) / 1024);
        }
        if (obj.NetworkOut !== undefined) {
          conn.telemetry.networkOutKb = Math.round(Number(obj.NetworkOut) / 1024);
        }
        return;
      }

      // 2. Regex parsing fallback (status & fps commands output)
      const fpsMatch = message.match(/(?:fps|framerate)\s*[:\s]\s*([0-9.]+)/i) || message.match(/([0-9.]+)\s*fps/i);
      const entMatch = message.match(/(?:ents|entities|entitycount)\s*[:\s]\s*(\d+)/i);
      const plyMatch = message.match(/players\s*[:\s]\s*(\d+)\s*\(([^)]+)\)/i);

      if (fpsMatch) conn.telemetry.fps = Math.round(parseFloat(fpsMatch[1]));
      if (entMatch) conn.telemetry.entities = parseInt(entMatch[1], 10);
      if (plyMatch) {
        conn.telemetry.players = parseInt(plyMatch[1], 10);
        const maxMatch = plyMatch[2].match(/(\d+)\s*max/i);
        if (maxMatch) conn.telemetry.maxPlayers = parseInt(maxMatch[1], 10);
      }
    } catch {}
  }

  private async pollAllTelemetries() {
    const runningServers = this.processServiceRef ? this.processServiceRef.getRunningServers() : [];

    for (const serverPath of runningServers) {
      const conn = this.connections.get(serverPath);
      const procMetrics = this.processServiceRef?.getProcessMetrics(serverPath);

      const ramMb = procMetrics?.memoryMb || conn?.telemetry.memoryMb || 0;
      const cpuPercent = procMetrics?.cpuPercent || conn?.telemetry.cpuPercent || 0;
      const uptime = procMetrics?.uptimeSeconds || conn?.telemetry.uptime || 0;

      // Ensure RCON connection is active or retry
      if (!conn || (!conn.isConnected && !conn.isConnecting)) {
        this.tryConnect(serverPath);
      }

      // If RCON is connected, query metrics safely
      if (conn && conn.ws && conn.ws.readyState === WebSocket.OPEN) {
        const t0 = Date.now();
        if (conn.isServerReady) {
          this.sendCommand(serverPath, 'serverinfo').then((res) => {
            conn.lastPingMs = Math.max(1, Date.now() - t0);
            if (res) this.parseTelemetryMessage(conn, res);
          });

          this.sendCommand(serverPath, 'status').then((res) => {
            if (res) this.parseTelemetryMessage(conn, res);
          });
        } else {
          this.sendCommand(serverPath, 'fps').then((res) => {
            conn.lastPingMs = Math.max(1, Date.now() - t0);
            if (res) this.parseTelemetryMessage(conn, res);
          });
        }
      }

      const telemetry: ServerTelemetry = {
        fps: conn?.telemetry.fps || (conn?.isConnected ? 250 : 0),
        players: conn?.telemetry.players || 0,
        maxPlayers: conn?.telemetry.maxPlayers || 50,
        entities: conn?.telemetry.entities || 0,
        uptime,
        memoryMb: ramMb,
        cpuPercent: cpuPercent,
        gpuPercent: 0,
        networkInKb: conn?.telemetry.networkInKb || 0,
        networkOutKb: conn?.telemetry.networkOutKb || 0,
        ping: conn?.lastPingMs || (conn?.isConnected ? 2 : 0)
      };

      if (conn) {
        conn.telemetry = telemetry;
      }

      this.emit('telemetry', { serverPath, telemetry });
    }
  }
}
