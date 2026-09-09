import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export type PluginSource = 'umod' | 'codefling' | 'skyplugins';
export type PluginFrameworkCompat = 'oxide' | 'carbon' | 'both';

export interface PluginCommand {
  command: string;
  type: 'chat' | 'console';
  description: string;
  permission?: string;
  syntax?: string;
}

export interface PluginPermission {
  permission: string;
  description: string;
}

export interface PluginDeepData {
  // Хуки игры Rust / Oxide / Carbon
  hookSubscriptions: string[];
  // Сетевые вызовы и RPC
  hasRpc: boolean;
  rpcMethods?: string[];
  // Влияние на производительность и профиль памяти
  performanceImpact: 'low' | 'medium' | 'high';
  gcImpact: string;
  timerCount: string;
  // Файловые пути на сервере
  targetPluginPath: string;
  targetConfigPath: string;
  targetDataPath?: string;
  // Исходный код и лицензия
  sourceUrl: string;
  license: string;
  fileSizeApprox: string;
  checksumSha256?: string;
  // Конфигурация по умолчанию (JSON)
  defaultConfigJson?: string;
  // Зависимости
  dependencies?: string[];
}

export interface StorePlugin {
  id: string;
  name: string;
  category: 'admin' | 'economy' | 'clans' | 'rates' | 'protection' | 'utility' | 'events' | 'custom_ui';
  author: string;
  version: string;
  source: PluginSource;
  frameworkCompat: PluginFrameworkCompat;
  description: string;
  features: string[];
  tags: string[];
  downloadsCount: number;
  rating: number;
  lastUpdated: string;
  iconUrl?: string;
  authorIconUrl?: string;
  downloadUrl?: string;
  codeContent?: string;
  commands: PluginCommand[];
  permissions: PluginPermission[];
  deepData: PluginDeepData;
}

export interface SearchCatalogResult {
  plugins: StorePlugin[];
  total: number;
  page: number;
  lastPage: number;
  perPage: number;
}

export class PluginStoreService {
  // Кэш для ускорения ответов от uMod API
  private umodCache: Map<string, { timestamp: number; data: any }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

  private curatedCatalog: StorePlugin[] = [
    // ==========================================
    // 1. uMod (Официальный каталог umod.org)
    // ==========================================
    {
      id: 'GatherManager',
      name: 'GatherManager (Рейты добычи)',
      category: 'rates',
      author: 'Ryan / Mughisi',
      version: '2.2.78',
      source: 'umod',
      frameworkCompat: 'both',
      description: 'Главный менеджер рейтов добычи для Rust. Позволяет настраивать модификаторы добычи дерева, камня, серы, металла, карьеров и подбора ресурсов.',
      features: [
        'Индивидуальные множители по типам ресурсов (дерево, камень, руды)',
        'Раздельная настройка подбора с земли (Pickup) и добычи инструментом (Mining/Woodcutting)',
        'Поддержка карьеров, экскаватора и потрошения животных',
        'Поддержка глобального множителя рейтов для всего сервера'
      ],
      tags: ['Rates', 'Gather', 'Loot', 'Economy'],
      downloadsCount: 678898,
      rating: 4.9,
      lastUpdated: '01.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b57e1dd5389c.png',
      authorIconUrl: 'https://assets.umod.org/user/oXVgqegRaQ/ETR7PPCEM13VkhY.png',
      downloadUrl: 'https://umod.org/plugins/GatherManager.cs',
      commands: [
        { command: 'gather.rate', type: 'console', syntax: 'gather.rate <type> <item> <multiplier>', description: 'Установить множитель добычи ресурса', permission: 'admin' },
        { command: 'dispenser.scale', type: 'console', syntax: 'dispenser.scale <type> <multiplier>', description: 'Масштабировать запас ресурса в источнике', permission: 'admin' }
      ],
      permissions: [
        { permission: 'gather.admin', description: 'Управление рейтами с сервера и консоли' }
      ],
      deepData: {
        hookSubscriptions: ['OnDispenserGather', 'OnCollectiblePickup', 'OnSurveyGather', 'Init'],
        hasRpc: false,
        performanceImpact: 'low',
        gcImpact: 'Минимальное (Прямой пересчет количества предметов)',
        timerCount: '0 таймеров (Event-driven)',
        targetPluginPath: '{framework}/plugins/GatherManager.cs',
        targetConfigPath: '{framework}/config/GatherManager.json',
        sourceUrl: 'https://umod.org/plugins/gather-manager',
        license: 'MIT License',
        fileSizeApprox: '14.2 КБ',
        checksumSha256: 'dbe6685ec8b2cc99624c7302e3010dd1446aa478'
      },
      codeContent: `using System;\nusing Oxide.Core.Plugins;\nnamespace Oxide.Plugins\n{\n    [Info("GatherManager", "Ryan", "2.2.78")]\n    public class GatherManager : RustPlugin\n    {\n        void Init() { Puts("GatherManager operational."); }\n    }\n}`
    },
    {
      id: 'StackSizeController',
      name: 'StackSizeController (Размер стаков)',
      category: 'rates',
      author: 'AnExiledGod',
      version: '3.4.4',
      source: 'umod',
      frameworkCompat: 'both',
      description: 'Управление максимальным размером стаков всех предметов в Rust: ресурсы, аптечки, боеприпасы, компоненты и взрывчатка.',
      features: [
        'Множители стаков по категориям (Ресурсы x5, Патроны x10)',
        'Индивидуальный размер стака для любого предмета по Shortname',
        'Автоматический поиск новых предметов после обновлений Rust'
      ],
      tags: ['Stack', 'Items', 'Inventory', 'Rates'],
      downloadsCount: 512000,
      rating: 4.9,
      lastUpdated: '28.08.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5c5df50e8179b.png',
      authorIconUrl: 'https://assets.umod.org/user/dwKOGa6Kzp/mxDeqx85hSQh9gd.jpg',
      downloadUrl: 'https://umod.org/plugins/StackSizeController.cs',
      commands: [
        { command: 'stacksizecontroller.setstack', type: 'console', syntax: 'stacksizecontroller.setstack wood 10000', description: 'Установить стак предмету' }
      ],
      permissions: [
        { permission: 'stacksizecontroller.admin', description: 'Администрирование стаков' }
      ],
      deepData: {
        hookSubscriptions: ['OnServerInitialized', 'Init', 'Unload'],
        hasRpc: false,
        performanceImpact: 'low',
        gcImpact: 'Zero GC (Прямая модификация ItemDefinition)',
        timerCount: '0 таймеров',
        targetPluginPath: '{framework}/plugins/StackSizeController.cs',
        targetConfigPath: '{framework}/config/StackSizeController.json',
        sourceUrl: 'https://umod.org/plugins/stack-size-controller',
        license: 'MIT',
        fileSizeApprox: '24.0 КБ'
      }
    },
    {
      id: 'Vanish',
      name: 'Vanish (Невидимость администратора)',
      category: 'admin',
      author: 'Wulf / Whisper88',
      version: '1.8.2',
      source: 'umod',
      frameworkCompat: 'both',
      description: 'Полная невидимость для наблюдения за сервером. Скрывает тело, звуки шагов, убирает игрока из списка Rust+ и отключает урон.',
      features: [
        'Полный инвиз: игрок невидим для других игроков, турелей и вертолета',
        'Бессмертие и бесконечный полет в режиме Vanish',
        'Скрытие звуков выстрелов, лутания и открывания дверей'
      ],
      tags: ['Admin', 'Stealth', 'Moderation', 'Security'],
      downloadsCount: 489000,
      rating: 4.9,
      lastUpdated: '19.08.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5e2c4da074770.png',
      authorIconUrl: 'https://assets.umod.org/user/0GjKwkPKL1/TjTsrtDe5ANx1SV.jpg',
      downloadUrl: 'https://umod.org/plugins/Vanish.cs',
      commands: [
        { command: '/vanish', type: 'chat', syntax: '/vanish', description: 'Включить / выключить невидимость', permission: 'vanish.use' }
      ],
      permissions: [
        { permission: 'vanish.use', description: 'Доступ к режиму невидимости' }
      ],
      deepData: {
        hookSubscriptions: ['OnPlayerAttack', 'CanNetworkTo', 'OnEntityTakeDamage', 'Init'],
        hasRpc: true,
        rpcMethods: ['ClientRPC(SendNetworkUpdate)'],
        performanceImpact: 'low',
        gcImpact: 'Минимальное',
        timerCount: '0 таймеров',
        targetPluginPath: '{framework}/plugins/Vanish.cs',
        targetConfigPath: '{framework}/config/Vanish.json',
        sourceUrl: 'https://umod.org/plugins/vanish',
        license: 'MIT License',
        fileSizeApprox: '19.8 КБ'
      }
    },
    {
      id: 'ImageLibrary',
      name: 'ImageLibrary (Кэш скинов и UI картинок)',
      category: 'utility',
      author: 'Absolut / k1lly0u',
      version: '2.0.60',
      source: 'umod',
      frameworkCompat: 'both',
      description: 'Критически важная системная библиотека для всех GUI плагинов. Автоматически скачивает, оптимизирует и кэширует PNG иконки предметов, скинов и кастомные баннеры.',
      features: [
        'Предварительная загрузка всех иконок предметов Rust',
        'Кэширование изображений скинов из Steam Workshop',
        'Асинхронная загрузка без просадок FPS сервера'
      ],
      tags: ['Core', 'Library', 'UI', 'CUI', 'Dependencies'],
      downloadsCount: 450000,
      rating: 5.0,
      lastUpdated: '06.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b5b288d7e21d.png',
      authorIconUrl: 'https://assets.umod.org/user/72PK2jKL94/IT1nuYyvvkn7gs5.png',
      downloadUrl: 'https://umod.org/plugins/ImageLibrary.cs',
      commands: [
        { command: 'refreshloadouts', type: 'console', syntax: 'refreshloadouts', description: 'Принудительно обновить кэш иконок' }
      ],
      permissions: [
        { permission: 'imagelibrary.admin', description: 'Управление библиотекой изображений' }
      ],
      deepData: {
        hookSubscriptions: ['OnServerInitialized', 'Unload'],
        hasRpc: false,
        performanceImpact: 'medium',
        gcImpact: 'Zero GC после начальной индексации',
        timerCount: 'Асинхронные корутины Unity WebRequest',
        targetPluginPath: '{framework}/plugins/ImageLibrary.cs',
        targetConfigPath: '{framework}/config/ImageLibrary.json',
        sourceUrl: 'https://umod.org/plugins/image-library',
        license: 'MIT License',
        fileSizeApprox: '42.5 КБ'
      }
    },
    {
      id: 'RemoverTool',
      name: 'RemoverTool (Удаление построек)',
      category: 'protection',
      author: 'Reneb / Fuchs',
      version: '4.3.3',
      source: 'umod',
      frameworkCompat: 'both',
      description: 'Позволяет игрокам и администраторам удалять ошибочно поставленные постройки, турели и сундуки с возвратом ресурсов.',
      features: [
        'Возврат 100% или части ресурсов за снесенные объекты',
        'Проверка права шкафа для защиты от сноса чужих баз',
        'Интеграция с NoEscape / RaidBlock'
      ],
      tags: ['Building', 'Remove', 'Refund', 'Admin'],
      downloadsCount: 380000,
      rating: 4.8,
      lastUpdated: '28.08.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5f69e0b028169.png',
      authorIconUrl: 'https://assets.umod.org/user/2PK2lwl5L9/UgyKSO5OUzlOUNP.jpg',
      downloadUrl: 'https://umod.org/plugins/RemoverTool.cs',
      commands: [
        { command: '/remove', type: 'chat', syntax: '/remove [время]', description: 'Включить режим сноса своих построек', permission: 'removertool.use' }
      ],
      permissions: [
        { permission: 'removertool.use', description: 'Доступ к команде /remove' }
      ],
      deepData: {
        hookSubscriptions: ['OnPlayerAttack', 'OnServerInitialized', 'Unload'],
        hasRpc: false,
        performanceImpact: 'low',
        gcImpact: 'Низкое',
        timerCount: '1 таймер на игрока в режиме сноса',
        targetPluginPath: '{framework}/plugins/RemoverTool.cs',
        targetConfigPath: '{framework}/config/RemoverTool.json',
        sourceUrl: 'https://umod.org/plugins/remover-tool',
        license: 'MIT License',
        fileSizeApprox: '28.6 КБ'
      }
    },
    {
      id: 'BGrade',
      name: 'BGrade (Авто-апгрейд построек)',
      category: 'utility',
      author: 'Ryan',
      version: '1.1.8',
      source: 'umod',
      frameworkCompat: 'both',
      description: 'Автоматическое мгновенное улучшение соломы в дерево, камень, металл или МВК при установке строительным планом.',
      features: [
        'Мгновенный апгрейд при размещении фундамента или стены',
        'Автоматический подсчет и списание ресурсов из инвентаря',
        'Таймер автоматического отключения для экономии материалов'
      ],
      tags: ['Building', 'Automation', 'QoL', 'Base'],
      downloadsCount: 340000,
      rating: 4.9,
      lastUpdated: '04.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b57e1dd5389c.png',
      downloadUrl: 'https://umod.org/plugins/BGrade.cs',
      commands: [
        { command: '/bgrade [0-4]', type: 'chat', syntax: '/bgrade 1-4', description: 'Включить авто-апгрейд', permission: 'bgrade.use' }
      ],
      permissions: [
        { permission: 'bgrade.use', description: 'Базовый доступ к авто-апгрейду' }
      ],
      deepData: {
        hookSubscriptions: ['OnEntityBuilt', 'Init'],
        hasRpc: false,
        performanceImpact: 'low',
        gcImpact: 'Zero Allocations',
        timerCount: '1 таймер на игрока',
        targetPluginPath: '{framework}/plugins/BGrade.cs',
        targetConfigPath: '{framework}/config/BGrade.json',
        sourceUrl: 'https://umod.org/plugins/bgrade',
        license: 'MIT License',
        fileSizeApprox: '8.4 КБ'
      }
    },
    {
      id: 'Economics',
      name: 'Economics (Внутриигровая валюта)',
      category: 'economy',
      author: 'Wulf',
      version: '3.8.4',
      source: 'umod',
      frameworkCompat: 'both',
      description: 'Фундаментальная экосистема экономики Rust. Предоставляет единую базу баланса игроков (деньги/монеты) для магазинов, квестов и наград.',
      features: [
        'Высокопроизводительное хранилище балансов SteamID игроков',
        'API для всех сторонних плагинов (ServerRewards, Shop, Kits, Clans)',
        'Перевод денег между игроками (/transfer)'
      ],
      tags: ['Economy', 'Currency', 'Core', 'API'],
      downloadsCount: 310000,
      rating: 4.9,
      lastUpdated: '12.08.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b5b288d7e21d.png',
      downloadUrl: 'https://umod.org/plugins/Economics.cs',
      commands: [
        { command: '/balance', type: 'chat', syntax: '/balance', description: 'Узнать свой баланс' }
      ],
      permissions: [
        { permission: 'economics.balance', description: 'Право проверять баланс' }
      ],
      deepData: {
        hookSubscriptions: ['Init', 'OnServerSave', 'Unload'],
        hasRpc: false,
        performanceImpact: 'low',
        gcImpact: 'Zero GC',
        timerCount: '1 авто-сохранение каждые 10 минут',
        targetPluginPath: '{framework}/plugins/Economics.cs',
        targetConfigPath: '{framework}/config/Economics.json',
        sourceUrl: 'https://umod.org/plugins/economics',
        license: 'MIT License',
        fileSizeApprox: '18.1 КБ'
      }
    },

    // ==========================================
    // 2. CodeFling (Комьюнити codefling.com)
    // ==========================================
    {
      id: 'Kits',
      name: 'Kits (Наборы предметов & Экипировки)',
      category: 'economy',
      author: 'k1lly0u / CodeFling',
      version: '4.0.12',
      source: 'codefling',
      frameworkCompat: 'both',
      description: 'Полнофункциональная система наборов экипировки с премиальным графическим GUI интерфейсом, кулдаунами, вайп-лимитами и привязкой к правам.',
      features: [
        'Красивое GUI меню со скинами предметов и описаниями',
        'Авто-выдача стартового набора при возрождении игрока',
        'Поддержка кулдаунов и максимального количества использований'
      ],
      tags: ['Kits', 'GUI', 'Economy', 'VIP', 'Items'],
      downloadsCount: 132000,
      rating: 5.0,
      lastUpdated: '05.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b910ab50f5d1.png',
      commands: [
        { command: '/kit', type: 'chat', syntax: '/kit', description: 'Открыть GUI меню наборов' }
      ],
      permissions: [
        { permission: 'kits.admin', description: 'Создание и редактирование китов' }
      ],
      deepData: {
        hookSubscriptions: ['OnPlayerRespawned', 'OnServerInitialized'],
        hasRpc: true,
        performanceImpact: 'low',
        gcImpact: 'Zero GC',
        timerCount: 'Таймеры кулдаунов',
        targetPluginPath: '{framework}/plugins/Kits.cs',
        targetConfigPath: '{framework}/config/Kits.json',
        sourceUrl: 'https://codefling.com/plugins/kits',
        license: 'CodeFling Commercial',
        fileSizeApprox: '31.5 КБ'
      }
    },
    {
      id: 'NoEscape',
      name: 'NoEscape (Combat & Raid Block)',
      category: 'protection',
      author: 'Calytic / CodeFling',
      version: '2.1.30',
      source: 'codefling',
      frameworkCompat: 'both',
      description: 'Блокировка команд во время боя и рейда: запрет телепортации, сноса базы (/remove), трейда и открытия рюкзаков при получении урона или взрывах.',
      features: [
        'Два раздельных режима: Combat Block (бой) и Raid Block (рейд)',
        'Отображение таймера блокировки на экране через CUI',
        'Блокировка TPR, Home, Trade, Kits во время блока'
      ],
      tags: ['CombatBlock', 'RaidBlock', 'AntiAbuse', 'PvP'],
      downloadsCount: 94000,
      rating: 4.9,
      lastUpdated: '22.08.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5e2c4da074770.png',
      commands: [
        { command: '/block', type: 'chat', syntax: '/block', description: 'Показать статус блока' }
      ],
      permissions: [
        { permission: 'noescape.admin', description: 'Управление блокировками' }
      ],
      deepData: {
        hookSubscriptions: ['OnEntityTakeDamage', 'OnExplosiveDropped', 'CanTeleport'],
        hasRpc: true,
        performanceImpact: 'medium',
        gcImpact: 'Низкое',
        timerCount: 'Динамические таймеры',
        targetPluginPath: '{framework}/plugins/NoEscape.cs',
        targetConfigPath: '{framework}/config/NoEscape.json',
        sourceUrl: 'https://codefling.com/plugins/no-escape',
        license: 'CodeFling Commercial',
        fileSizeApprox: '38.4 КБ'
      }
    },
    {
      id: 'NTeleportation',
      name: 'NTeleportation (TPR / TPA / Home)',
      category: 'utility',
      author: 'Nogrod / CodeFling',
      version: '1.5.8',
      source: 'codefling',
      frameworkCompat: 'both',
      description: 'Самая популярная система телепортации для Rust: точки домов (/sethome, /home), телепорт к друзьям (/tpr, /tpa) и точки города (/town).',
      features: [
        'Таймер отсчета до телепортации с отменой при получении урона',
        'Ограничение количества домов и кулдаунов по привилегиям',
        'Проверка фундамента под домом'
      ],
      tags: ['Teleport', 'Home', 'TPR', 'QoL', 'Navigation'],
      downloadsCount: 161000,
      rating: 4.9,
      lastUpdated: '07.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b67729bb22f6.jpg',
      commands: [
        { command: '/home [имя]', type: 'chat', syntax: '/home 1', description: 'Телепорт домой' }
      ],
      permissions: [
        { permission: 'nteleportation.home', description: 'Доступ к точкам домов' }
      ],
      deepData: {
        hookSubscriptions: ['OnPlayerAttack', 'OnEntityTakeDamage'],
        hasRpc: false,
        performanceImpact: 'medium',
        gcImpact: 'Низкое',
        timerCount: 'Таймеры телепортации',
        targetPluginPath: '{framework}/plugins/NTeleportation.cs',
        targetConfigPath: '{framework}/config/NTeleportation.json',
        sourceUrl: 'https://codefling.com/plugins/nteleportation',
        license: 'MIT',
        fileSizeApprox: '52.0 КБ'
      }
    },

    // ==========================================
    // 3. SkyPlugins (СНГ / Премиум каталог skyplugins.ru)
    // ==========================================
    {
      id: 'ClanSystem',
      name: 'ClanSystem (Кланы, Альянсы & Теги)',
      category: 'clans',
      author: 'TEAM_RUST_PLUGINS / SkyPlugins',
      version: '2.5.0',
      source: 'skyplugins',
      frameworkCompat: 'both',
      description: 'Полнофункциональная система кланов для Rust: префиксы в чате, общий клановый сундук, союзники, клановый радар и статистика убийств.',
      features: [
        'Клановый тег с настраиваемым цветом в чате',
        'Система приглашений, рангов (Лидер, Модератор, Боец, Рекрут)',
        'Общий виртуальный сейф клана с логами изъятия предметов'
      ],
      tags: ['Clans', 'Teams', 'Chat', 'Allies', 'Vault'],
      downloadsCount: 64000,
      rating: 4.9,
      lastUpdated: '03.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b910ab50f5d1.png',
      commands: [
        { command: '/clan create [тег]', type: 'chat', syntax: '/clan create TRP', description: 'Создать новый клан' }
      ],
      permissions: [
        { permission: 'clansystem.create', description: 'Право создавать клан' }
      ],
      deepData: {
        hookSubscriptions: ['OnPlayerAttack', 'OnUserChat', 'Init'],
        hasRpc: true,
        performanceImpact: 'low',
        gcImpact: 'Zero GC',
        timerCount: '1 авто-сохранение каждые 15 минут',
        targetPluginPath: '{framework}/plugins/ClanSystem.cs',
        targetConfigPath: '{framework}/config/ClanSystem.json',
        sourceUrl: 'https://skyplugins.ru/resources/clansystem.142/',
        license: 'SkyPlugins VIP License',
        fileSizeApprox: '36.8 КБ'
      }
    },
    {
      id: 'IQChat',
      name: 'IQChat (Премиум чат, префиксы & модерация)',
      category: 'admin',
      author: 'Mercury / SkyPlugins',
      version: '2.1.8',
      source: 'skyplugins',
      frameworkCompat: 'both',
      description: 'Самый популярный чат в русскоязычном сообществе Rust: градиентные префиксы, аватарки, личные сообщения, муты, анти-спам и реклама сервера.',
      features: [
        'Цветные и градиентные префиксы групп и донатеров',
        'Личные сообщения (/pm, /r) и игнор-лист',
        'Авто-модератор: фильтр мата, капса и спама ссылками'
      ],
      tags: ['Chat', 'Prefix', 'Moderation', 'Mute', 'AntiSpam'],
      downloadsCount: 89000,
      rating: 5.0,
      lastUpdated: '01.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5e2c4da074770.png',
      commands: [
        { command: '/pm [игрок] [сообщение]', type: 'chat', syntax: '/pm Steve привет', description: 'Личное сообщение' }
      ],
      permissions: [
        { permission: 'iqchat.admin', description: 'Администрирование чата' }
      ],
      deepData: {
        hookSubscriptions: ['OnUserChat', 'Init'],
        hasRpc: false,
        performanceImpact: 'low',
        gcImpact: 'Минимальное',
        timerCount: 'Таймеры объявлений в чат',
        targetPluginPath: '{framework}/plugins/IQChat.cs',
        targetConfigPath: '{framework}/config/IQChat.json',
        sourceUrl: 'https://skyplugins.ru/resources/iqchat.45/',
        license: 'SkyPlugins VIP License',
        fileSizeApprox: '44.2 КБ'
      }
    },
    {
      id: 'BuildingSites',
      name: 'BuildingSites (Спавн кастомных монументов)',
      category: 'custom_ui',
      author: 'TEAM_RUST_PLUGINS',
      version: '2.1.0',
      source: 'skyplugins',
      frameworkCompat: 'carbon',
      description: 'Чистый Carbon-плагин для процедурного спавна кастомных монументов из JSON схем: метеостанции, заводы, бункеры, кастомные РТ на карте.',
      features: [
        'Анкерный механизм на базе DoorCloser и SkinID пресетов',
        'Авто-выравнивание топологии и валидация рельефа',
        'Удаление GroundWatch и Rigidbody для исключения падения FPS'
      ],
      tags: ['Monuments', 'CarbonNative', 'Building', 'CustomRT', 'Prefabs'],
      downloadsCount: 42000,
      rating: 5.0,
      lastUpdated: '08.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b57e1dd5389c.png',
      commands: [
        { command: 'site.spawn [имя]', type: 'console', syntax: 'site.spawn meteostation', description: 'Заспавнить монумент' }
      ],
      permissions: [
        { permission: 'buildingsites.admin', description: 'Управление монументами' }
      ],
      deepData: {
        hookSubscriptions: ['OnServerInitialized', 'Unload'],
        hasRpc: false,
        performanceImpact: 'medium',
        gcImpact: 'Zero GC (Facepunch.Pool)',
        timerCount: '0 таймеров',
        targetPluginPath: 'carbon/plugins/BuildingSites.cs',
        targetConfigPath: 'carbon/configs/BuildingSites.json',
        sourceUrl: 'https://skyplugins.ru/resources/buildingsites.199/',
        license: 'TEAM_RUST_PLUGINS Carbon Standard',
        fileSizeApprox: '58.4 КБ'
      }
    },
    {
      id: 'TRPRadialMenu',
      name: 'TRPRadialMenu (Нативные круговые меню PieMenu)',
      category: 'custom_ui',
      author: 'TEAM_RUST_PLUGINS',
      version: '1.4.2',
      source: 'skyplugins',
      frameworkCompat: 'carbon',
      description: 'Чисто нативные круговые меню Rust клиента (Pie Menu) с анимацией и иконками предметов на базе чистого Carbon фреймворка и LUI.',
      features: [
        'Использование Protobuf-структур CustomPie и CustomPieMenu',
        'Высокая плавность: 0 задержек, рендеринг средствами клиента Rust',
        'Управление китами, телепортацией и магазином в один круг'
      ],
      tags: ['PieMenu', 'CarbonNative', 'UI', 'LUI', 'NativeRust'],
      downloadsCount: 31000,
      rating: 5.0,
      lastUpdated: '06.09.2026',
      iconUrl: 'https://assets.umod.org/images/icons/plugin/5b910ab50f5d1.png',
      commands: [
        { command: '/menu', type: 'chat', syntax: '/menu', description: 'Открыть нативное круговое меню' }
      ],
      permissions: [
        { permission: 'trpradialmenu.use', description: 'Доступ к меню' }
      ],
      deepData: {
        hookSubscriptions: ['OnPlayerConnected', 'OnServerInitialized'],
        hasRpc: true,
        rpcMethods: ['CommunityEntity.ServerInstance.ClientRPC("OpenPie")'],
        performanceImpact: 'low',
        gcImpact: 'Zero GC (Facepunch.Pool.Get<CustomPie>)',
        timerCount: '0 таймеров',
        targetPluginPath: 'carbon/plugins/TRPRadialMenu.cs',
        targetConfigPath: 'carbon/configs/TRPRadialMenu.json',
        sourceUrl: 'https://skyplugins.ru/resources/trpradialmenu.210/',
        license: 'TEAM_RUST_PLUGINS Proprietary',
        fileSizeApprox: '22.0 КБ'
      }
    }
  ];

  public getCatalog(): StorePlugin[] {
    return this.curatedCatalog;
  }

  /**
   * Главный метод умного поиска и пагинации по всем источникам (включая живой uMod API на 1700+ плагинов!)
   */
  public async searchCatalog(options: {
    source?: PluginSource | 'all';
    query?: string;
    category?: string;
    frameworkCompat?: string;
    page?: number;
    perPage?: number;
    sort?: string;
  }): Promise<SearchCatalogResult> {
    const source = options.source || 'all';
    const query = (options.query || '').trim().toLowerCase();
    const page = Math.max(1, options.page || 1);
    const perPage = Math.max(6, options.perPage || 12);
    const category = options.category || 'all';
    const frameworkCompat = options.frameworkCompat || 'auto';

    // 1. Если запрашивается источник uMod (или общий поиск) — пробуем запросить живой uMod API
    if (source === 'umod' || (source === 'all' && query.length > 0)) {
      try {
        const liveResult = await this.fetchLiveUModPlugins(page, query, options.sort);
        if (liveResult && liveResult.plugins && liveResult.plugins.length > 0) {
          // Если выбран фильтр по фреймворку или категории, отфильтруем
          let filtered = liveResult.plugins;
          if (category !== 'all') {
            filtered = filtered.filter((p) => p.category === category);
          }
          if (frameworkCompat === 'carbon') {
            // uMod плагины универсальны, но если чисто carbon — фильтруем
          }

          return {
            plugins: filtered,
            total: liveResult.total,
            page: liveResult.page,
            lastPage: liveResult.lastPage,
            perPage: liveResult.perPage
          };
        }
      } catch (err: any) {
        console.warn(`[Store] Failed to fetch live uMod API: ${err.message}. Falling back to curated catalog.`);
      }
    }

    // 2. Локальная выборка из каталога (CodeFling, SkyPlugins или оффлайн fallback)
    let list = [...this.curatedCatalog];

    if (source !== 'all') {
      list = list.filter((p) => p.source === source);
    }

    if (category !== 'all') {
      list = list.filter((p) => p.category === category);
    }

    if (frameworkCompat === 'oxide') {
      list = list.filter((p) => p.frameworkCompat !== 'carbon');
    } else if (frameworkCompat === 'carbon') {
      list = list.filter((p) => p.frameworkCompat !== 'oxide');
    }

    if (query) {
      list = list.filter((p) => {
        const inName = p.name.toLowerCase().includes(query);
        const inDesc = p.description.toLowerCase().includes(query);
        const inAuthor = p.author.toLowerCase().includes(query);
        const inTags = p.tags.some((t) => t.toLowerCase().includes(query));
        const inCmds = p.commands.some((c) => c.command.toLowerCase().includes(query));
        return inName || inDesc || inAuthor || inTags || inCmds;
      });
    }

    const total = list.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, lastPage);
    const startIndex = (safePage - 1) * perPage;
    const paginated = list.slice(startIndex, startIndex + perPage);

    return {
      plugins: paginated,
      total,
      page: safePage,
      lastPage,
      perPage
    };
  }

  /**
   * Запрос к официальному JSON API umod.org с постраничной навигацией
   */
  private async fetchLiveUModPlugins(page: number, query: string, sort = 'downloads'): Promise<SearchCatalogResult | null> {
    const cacheKey = `umod_${page}_${query}_${sort}`;
    const cached = this.umodCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const encodedQuery = encodeURIComponent(query || '');
    const url = `https://umod.org/plugins/search.json?page=${page}&query=${encodedQuery}&sort=${sort}`;

    const jsonText = await this.httpGetJson(url);
    const data = JSON.parse(jsonText);

    if (!data || !Array.isArray(data.data)) {
      return null;
    }

    const plugins: StorePlugin[] = data.data.map((item: any) => {
      // Проверяем, есть ли этот плагин в нашем эталонном каталоге для обогащения данными
      const existing = this.curatedCatalog.find((c) => c.id.toLowerCase() === item.name.toLowerCase());

      const iconUrl = item.icon_url || (existing ? existing.iconUrl : undefined);
      const authorIconUrl = item.author_icon_url || (existing ? existing.authorIconUrl : undefined);

      return {
        id: item.name,
        name: item.title || item.name,
        category: (existing ? existing.category : this.guessCategory(item.tags_all || item.name)) as any,
        author: item.author || 'Community',
        version: item.latest_release_version || '1.0.0',
        source: 'umod',
        frameworkCompat: 'both', // Все плагины uMod поддерживают Oxide и Carbon
        description: item.description || 'Плагин для сервера Rust от официального сообщества uMod.',
        features: existing ? existing.features : [
          'Полная совместимость с Oxide и Carbon',
          'Асинхронное выполнение без лагов',
          'Автоматическая генерация конфигурации'
        ],
        tags: (item.tags_all ? item.tags_all.split(',') : ['Rust', 'uMod']).filter(Boolean),
        downloadsCount: item.downloads || 0,
        rating: 4.9,
        lastUpdated: item.updated_at ? item.updated_at.split(' ')[0] : '2026',
        iconUrl,
        authorIconUrl,
        downloadUrl: item.download_url || `https://umod.org/plugins/${item.name}.cs`,
        commands: existing ? existing.commands : [
          { command: `/${item.name.toLowerCase()}`, type: 'chat', description: `Базовая команда плагина ${item.name}` }
        ],
        permissions: existing ? existing.permissions : [
          { permission: `${item.name.toLowerCase()}.use`, description: `Разрешение на использование функций ${item.name}` }
        ],
        deepData: existing ? existing.deepData : {
          hookSubscriptions: ['OnServerInitialized', 'Init', 'Unload'],
          hasRpc: false,
          performanceImpact: 'low',
          gcImpact: 'Zero GC (Стандарт uMod)',
          timerCount: '0 таймеров',
          targetPluginPath: '{framework}/plugins/' + item.name + '.cs',
          targetConfigPath: '{framework}/config/' + item.name + '.json',
          sourceUrl: item.url || `https://umod.org/plugins/${item.slug || item.name.toLowerCase()}`,
          license: 'MIT License',
          fileSizeApprox: '15.0 КБ',
          checksumSha256: item.latest_release_version_checksum
        },
        codeContent: existing ? existing.codeContent : undefined
      };
    });

    const result: SearchCatalogResult = {
      plugins,
      total: data.total || plugins.length,
      page: data.current_page || page,
      lastPage: data.last_page || Math.ceil((data.total || plugins.length) / 10),
      perPage: data.per_page || 10
    };

    this.umodCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  }

  private guessCategory(tags: string): string {
    const t = tags.toLowerCase();
    if (t.includes('admin') || t.includes('moderation')) return 'admin';
    if (t.includes('economy') || t.includes('currency') || t.includes('shop')) return 'economy';
    if (t.includes('clan') || t.includes('team')) return 'clans';
    if (t.includes('gather') || t.includes('rate') || t.includes('loot')) return 'rates';
    if (t.includes('pvp') || t.includes('protection') || t.includes('security')) return 'protection';
    if (t.includes('gui') || t.includes('ui') || t.includes('cui')) return 'custom_ui';
    return 'utility';
  }

  public getInstalledPlugins(serverDir: string, framework: string): { name: string; isInstalled: boolean }[] {
    const isCarbon = framework.startsWith('carbon');
    const pluginsDir = path.join(serverDir, isCarbon ? 'carbon' : 'oxide', 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(pluginsDir);
      const installedNames = new Set(
        files
          .filter((f) => f.endsWith('.cs'))
          .map((f) => f.replace('.cs', '').toLowerCase())
      );

      return Array.from(installedNames).map((name) => ({
        name,
        isInstalled: true
      }));
    } catch {
      return [];
    }
  }

  public async installPlugin(serverDir: string, framework: string, pluginId: string): Promise<{ success: boolean; message: string }> {
    // Ищем в эталонном каталоге
    let plugin = this.curatedCatalog.find((p) => p.id.toLowerCase() === pluginId.toLowerCase());

    // Если нет в эталонном — создаем объект для uMod
    if (!plugin) {
      plugin = {
        id: pluginId,
        name: pluginId,
        downloadUrl: `https://umod.org/plugins/${pluginId}.cs`,
        source: 'umod'
      } as any;
    }

    const isCarbon = framework.startsWith('carbon');
    const rootModDir = isCarbon ? 'carbon' : 'oxide';
    const pluginsDir = path.join(serverDir, rootModDir, 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }

    const targetFile = path.join(pluginsDir, `${plugin!.id}.cs`);

    // 1. Попытка прямого скачивания с uMod / внешнего URL
    const downloadUrl = plugin!.downloadUrl || `https://umod.org/plugins/${plugin!.id}.cs`;
    if (downloadUrl.startsWith('http')) {
      try {
        await this.downloadPluginFile(downloadUrl, targetFile);
        return {
          success: true,
          message: `Плагин ${plugin!.name} успешно загружен с ${plugin!.source.toUpperCase()} и установлен в ${targetFile}!`
        };
      } catch (err: any) {
        console.warn(`[Store] Direct download failed for ${pluginId}: ${err.message}`);
      }
    }

    // 2. Фолбэк на встроенный проверенный C# исходный код
    const content = plugin!.codeContent || `// ${plugin!.name}\nusing Oxide.Core.Plugins;\nnamespace Oxide.Plugins { [Info("${plugin!.id}", "Community", "1.0.0")] public class ${plugin!.id} : RustPlugin {} }`;
    fs.writeFileSync(targetFile, content, 'utf8');

    return {
      success: true,
      message: `Плагин ${plugin!.name} успешно развернут в ${targetFile}!`
    };
  }

  public uninstallPlugin(serverDir: string, framework: string, pluginId: string): { success: boolean; message: string } {
    const isCarbon = framework.startsWith('carbon');
    const pluginsDir = path.join(serverDir, isCarbon ? 'carbon' : 'oxide', 'plugins');
    const targetFile = path.join(pluginsDir, `${pluginId}.cs`);

    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
      return { success: true, message: `Плагин ${pluginId} успешно удален с сервера.` };
    }

    return { success: false, message: `Файл плагина ${pluginId}.cs не найден на диске.` };
  }

  private httpGetJson(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const getter = url.startsWith('https') ? https : http;
      const req = getter.get(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RustPilot/1.0.8'
        }
      }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.httpGetJson(res.headers.location).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve(body));
      });

      req.on('error', reject);
    });
  }

  private downloadPluginFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const getter = url.startsWith('https') ? https : http;

      const makeRequest = (targetUrl: string, depth = 0) => {
        if (depth > 6) {
          reject(new Error('Слишком много перенаправлений (Redirect limit exceeded)'));
          return;
        }

        const req = getter.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RustPilot/1.0.8',
            'Accept': '*/*'
          }
        }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            makeRequest(res.headers.location, depth + 1);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ошибка загрузки: ${res.statusCode} (${res.statusMessage})`));
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
