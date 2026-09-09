export type ModalType =
  | 'players'
  | 'plugins'
  | 'updater'
  | 'settings'
  | 'appSettings'
  | 'servers'
  | 'wipe'
  | 'wizard'
  | 'commandLib'
  | 'devblogs'
  | 'configEditor'
  | 'scheduler'
  | 'backups'
  | null;
export type NavTab = string;

export type ServerStatus =
  | 'stopped'      // 1. Отключен
  | 'updating'     // 2. Обновление / Проверка
  | 'starting'     // 3. Запускается / Загрузка карты
  | 'running'      // 4. Запущен / Онлайн
  | 'wiping'       // 5. Вайпается
  | 'restarting';  // 6. Перезапускается

export type ModFramework = 'carbon_release' | 'carbon_preview' | 'oxide' | 'vanilla';

export interface ServerConfig {
  // 1. Identity & Branding
  serverPath: string;
  serverName: string;
  identity: string;
  description?: string;
  url?: string;
  headerImage?: string;
  logoImage?: string;
  tags?: string;
  favoritesEndpoint?: string;

  // 2. Network & RCON
  port: number;
  queryPort: number;
  rconPort: number;
  rconPassword: string;
  serverIp?: string;
  rconWeb?: boolean; // Enable/Disable Web RCON (default true)
  censorPlayerList?: boolean; // Mask player names on steam server query

  // 3. World & Generation
  maxPlayers: number;
  worldSize: number;
  seed: number;
  mapLevel?: string;
  levelUrl?: string;
  customMapName?: string;
  tickrate?: number; // fps.limit / tickrate

  // 4. Gameplay & Modes
  pvpEnabled?: boolean;
  stability?: boolean;
  radiation?: boolean;
  saveInterval: number;
  globalChat?: boolean;
  decayUpkeep?: boolean;
  decayScale?: number;
  craftInstant?: boolean;
  fallDamage?: boolean;
  maxTeamSize?: number;
  gamemode?: string; // survival, softcore, hardcore, primitive, weapontest

  // 5. Creative Mode (Facepunch native)
  creativeAllUsers?: boolean;
  creativeFreeBuild?: boolean;
  creativeFreePlacement?: boolean;
  creativeFreeRepair?: boolean;
  creativeUnlimitedIo?: boolean;

  // 6. Centralized Banning API
  bansServerEndpoint?: string;
  bansServerFailureMode?: number; // 0 = allow on error, 1 = reject on error
  bansServerTimeout?: number; // default 5 sec

  // 7. Reports (F7) & In-Game Moderation
  reportsServerEndpoint?: string;
  reportsServerEndpointKey?: string;
  printReportsToConsole?: boolean;

  // 8. Rust+ Companion Server
  rustPlusEnabled?: boolean;
  appPort?: number;
  appPublicIp?: string;
  appListenIp?: string;

  // 9. Wipe Timers (Native Nuclear Silo & Server Wipe)
  wipeDayOfWeek?: number; // 0=Sunday, 4=Thursday
  wipeHourOfDay?: number; // 0-23 (e.g. 19 or 14.5)
  wipeTimezone?: string; // e.g. Europe/London, GMT, UTC+3
  wipeCronOverride?: string; // cron expression
  wipeUnixTimestampOverride?: number; // exact epoch timestamp

  // 10. Security, AntiHack & Framework
  secure?: boolean;  // 7. Security & Anti-Cheat
  antihackEnabled?: boolean;
  eacEnabled?: boolean;

  // 8. Devblog & Version Lock
  isDevblog?: boolean;
  devblogId?: number;

  // 9. Startup & Performance
  framework: ModFramework;
  branch?: string;
  customArgs?: string;
  autoRestartOnCrash?: boolean;
}

export interface Player {
  SteamID: string;
  DisplayName: string;
  Ping: number;
  Address: string;
  ConnectedSeconds: number;
  Health: number;
  AvatarUrl?: string;
  Vip?: boolean;
  steamId?: string;
  displayName?: string;
  ping?: number;
  ipAddress?: string;
  connectedDuration?: number;
  health?: number;
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
  history: {
    time: string;
    fps: number;
    cpu: number;
    ram: number;
  }[];
}

export interface TelemetryPoint {
  time: string;
  fps: number;
  cpu: number;
  ramMb: number;
  netInKb: number;
  netOutKb: number;
  entities: number;
  players: number;
}
