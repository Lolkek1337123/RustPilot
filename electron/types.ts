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
  rconWeb?: boolean;
  censorPlayerList?: boolean;

  // 3. World & Generation
  maxPlayers: number;
  worldSize: number;
  seed: number;
  mapLevel?: string;
  levelUrl?: string;
  customMapName?: string;
  tickrate?: number;

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
  gamemode?: string;

  // 5. Creative Mode
  creativeAllUsers?: boolean;
  creativeFreeBuild?: boolean;
  creativeFreePlacement?: boolean;
  creativeFreeRepair?: boolean;
  creativeUnlimitedIo?: boolean;

  // 6. Centralized Banning API
  bansServerEndpoint?: string;
  bansServerFailureMode?: number;
  bansServerTimeout?: number;

  // 7. Reports (F7) & In-Game Moderation
  reportsServerEndpoint?: string;
  reportsServerEndpointKey?: string;
  printReportsToConsole?: boolean;

  // 8. Rust+ Companion Server
  rustPlusEnabled?: boolean;
  appPort?: number;
  appPublicIp?: string;
  appListenIp?: string;

  // 9. Wipe Timers
  wipeDayOfWeek?: number;
  wipeHourOfDay?: number;
  wipeTimezone?: string;
  wipeCronOverride?: string;
  wipeUnixTimestampOverride?: number;

  // 10. Security, AntiHack & Framework
  secure?: boolean;
  antihackEnabled?: boolean;
  eacEnabled?: boolean;

  // 11. Devblog & Version Lock
  isDevblog?: boolean;
  devblogId?: number;

  // 12. Startup & Performance
  framework: ModFramework;
  customArgs?: string;
  autoRestartOnCrash?: boolean;
  cheats?: boolean;
  officialServer?: boolean;
  branch?: 'release' | 'staging' | 'prerelease' | 'aux01' | 'aux02';
  customSteamArgs?: string;
  customStartupArgs?: string;
  autoUpdateOnStart?: boolean;
}
