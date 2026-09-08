import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Server,
  Network,
  Globe,
  Image,
  Gamepad2,
  Shield,
  Cpu,
  Check,
  Radio,
  Clock,
  Hammer,
  Ban,
  MessageSquare
} from 'lucide-react';
import { ServerConfig, ModFramework } from '../../types';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: ServerConfig;
  onUpdateConfig: (config: ServerConfig) => void;
  onSaveConfig: () => void;
}

type TabType =
  | 'network'
  | 'branding'
  | 'world'
  | 'gameplay'
  | 'creative'
  | 'banning'
  | 'rustplus'
  | 'wipetimer'
  | 'security';

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  server,
  onUpdateConfig,
  onSaveConfig
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('network');
  const [form, setForm] = useState<ServerConfig>({ ...server });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setForm({ ...server });
  }, [server, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: keyof ServerConfig, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdateConfig(form);
    onSaveConfig();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'network', label: 'Сеть и RCON', icon: Network },
    { id: 'branding', label: 'Брендинг и Теги', icon: Image },
    { id: 'world', label: 'Карта и Мир', icon: Globe },
    { id: 'gameplay', label: 'Режимы и Баланс', icon: Gamepad2 },
    { id: 'creative', label: 'Creative Mode', icon: Hammer },
    { id: 'banning', label: 'Бан-лист и Репорты', icon: Ban },
    { id: 'rustplus', label: 'Rust+ Companion', icon: Radio },
    { id: 'wipetimer', label: 'Таймеры вайпа', icon: Clock },
    { id: 'security', label: 'Движок и Моды', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-5xl h-[88vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#2563eb] flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <Server className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit']">
                Полные настройки сервера Rust
              </h2>
              <p className="text-xs text-[#94a3b8] font-mono">
                {form.serverName} ({form.serverPath})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-cyan-500/15 bg-black/20 px-3 overflow-x-auto gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#00f0ff] text-[#00f0ff] bg-cyan-500/10'
                    : 'border-transparent text-[#94a3b8] hover:text-slate-200 hover:bg-cyan-500/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00f0ff]' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. NETWORK & RCON */}
          {activeTab === 'network' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>Сетевые порты, RCON и подключение</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Имя сервера (Hostname)
                  </label>
                  <input
                    type="text"
                    value={form.serverName}
                    onChange={(e) => handleChange('serverName', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Идентификатор (server.identity)
                  </label>
                  <input
                    type="text"
                    value={form.identity}
                    onChange={(e) => handleChange('identity', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Игровой порт (server.port UDP)
                  </label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => handleChange('port', parseInt(e.target.value) || 28015)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Steam Query Port (server.queryport UDP)
                  </label>
                  <input
                    type="number"
                    value={form.queryPort}
                    onChange={(e) => handleChange('queryPort', parseInt(e.target.value) || 28016)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    RCON Порт (rcon.port TCP)
                  </label>
                  <input
                    type="number"
                    value={form.rconPort}
                    onChange={(e) => handleChange('rconPort', parseInt(e.target.value) || 28017)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    RCON Пароль (rcon.password)
                  </label>
                  <input
                    type="text"
                    value={form.rconPassword}
                    onChange={(e) => handleChange('rconPassword', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Привязка IP (server.ip)
                  </label>
                  <input
                    type="text"
                    value={form.serverIp || ''}
                    onChange={(e) => handleChange('serverIp', e.target.value)}
                    placeholder="0.0.0.0 (Все интерфейсы)"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    DNS Избранного (server.favoritesEndpoint)
                  </label>
                  <input
                    type="text"
                    value={form.favoritesEndpoint || ''}
                    onChange={(e) => handleChange('favoritesEndpoint', e.target.value)}
                    placeholder="play.myserver.com"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Включить Web RCON (rcon.web 1)</div>
                    <div className="text-[11px] text-slate-400">
                      Использует современный протокол WebSocket для удаленного управления и мониторинга RustPilot.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.rconWeb !== false}
                    onChange={(e) => handleChange('rconWeb', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div>
                    <div className="text-xs font-bold text-white">Скрывать имена игроков (server.censorplayerlist)</div>
                    <div className="text-[11px] text-slate-400">
                      Маскирует список никнеймов игроков от внешних парсеров и сканеров BattleMetrics/Steam.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.censorPlayerList}
                    onChange={(e) => handleChange('censorPlayerList', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. BRANDING & TAGS */}
          {activeTab === 'branding' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-400" />
                <span>Брендинг, логотипы и теги в браузере Facepunch</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Теги браузера серверов (server.tags)
                  </label>
                  <input
                    type="text"
                    value={form.tags || ''}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="weekly,vanilla,roleplay,EU,modded"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Допустимые теги: weekly, biweekly, monthly, vanilla, hardcore, softcore, pve, roleplay, creative, minigame, battlefield, EU, NA, modded
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Иконка сервера / Логотип 256x256 (server.logoimage URL)
                  </label>
                  <input
                    type="text"
                    value={form.logoImage || ''}
                    onChange={(e) => handleChange('logoImage', e.target.value)}
                    placeholder="https://mysite.com/logo.png"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Отображается в мобильном приложении Rust+ и в круглой плашке списка серверов Facepunch.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Изображение баннера шапки (server.headerimage URL 512x256 / 1024x512)
                  </label>
                  <input
                    type="text"
                    value={form.headerImage || ''}
                    onChange={(e) => handleChange('headerImage', e.target.value)}
                    placeholder="https://mysite.com/header.jpg"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Веб-сайт / Discord ссылка (server.url)
                  </label>
                  <input
                    type="text"
                    value={form.url || ''}
                    onChange={(e) => handleChange('url', e.target.value)}
                    placeholder="https://discord.gg/myserver"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Описание сервера (server.description)
                  </label>
                  <textarea
                    rows={4}
                    value={form.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Добро пожаловать на наш сервер Rust! Вайп каждую пятницу..."
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. WORLD & MAP */}
          {activeTab === 'world' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Генерация процедурной карты и кастомные .map</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Тип карты (server.level)
                  </label>
                  <select
                    value={form.mapLevel || 'Procedural Map'}
                    onChange={(e) => handleChange('mapLevel', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  >
                    <option value="Procedural Map">Procedural Map (Стандартная)</option>
                    <option value="Barren">Barren</option>
                    <option value="HapisIsland">Hapis Island</option>
                    <option value="Custom Map">Custom Map (.map URL)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Максимум слотов (server.maxplayers)
                  </label>
                  <input
                    type="number"
                    value={form.maxPlayers}
                    onChange={(e) => handleChange('maxPlayers', parseInt(e.target.value) || 50)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Размер карты (server.worldsize 1000-6000)
                  </label>
                  <input
                    type="number"
                    value={form.worldSize}
                    onChange={(e) => handleChange('worldSize', parseInt(e.target.value) || 3000)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Сид генерации (server.seed)
                  </label>
                  <input
                    type="number"
                    value={form.seed}
                    onChange={(e) => handleChange('seed', parseInt(e.target.value) || 123456)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Прямая ссылка на кастомную карту (server.levelurl)
                  </label>
                  <input
                    type="text"
                    value={form.levelUrl || ''}
                    onChange={(e) => handleChange('levelUrl', e.target.value)}
                    placeholder="https://mysite.com/maps/custom_monuments.map"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ссылка должна быть прямой (direct download link .map). При указании levelurl параметры seed и worldsize игнорируются.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. GAMEPLAY & BALANCE */}
          {activeTab === 'gameplay' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-purple-400" />
                <span>Игровой режим, баланс и параметры выживания</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Игровой режим (server.gamemode)
                  </label>
                  <select
                    value={form.gamemode || 'survival'}
                    onChange={(e) => handleChange('gamemode', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  >
                    <option value="survival">Survival (Классический)</option>
                    <option value="softcore">Softcore (Облегченный лут/респаун)</option>
                    <option value="hardcore">Hardcore (Без карты, компаса и Rust+)</option>
                    <option value="primitive">Primitive (Примитивная эра)</option>
                    <option value="weapontest">Weapon Test</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Интервал автосохранения (server.saveinterval сек)
                  </label>
                  <input
                    type="number"
                    value={form.saveInterval}
                    onChange={(e) => handleChange('saveInterval', parseInt(e.target.value) || 300)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Лимит тикрейта сервера (server.tickrate / fps.limit)
                  </label>
                  <input
                    type="number"
                    value={form.tickrate || 30}
                    onChange={(e) => handleChange('tickrate', parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Множитель гниения построек (decay.scale)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.decayScale !== undefined ? form.decayScale : 1.0}
                    onChange={(e) => handleChange('decayScale', parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">PvP Режим включен</span>
                  <input
                    type="checkbox"
                    checked={form.pvpEnabled !== false}
                    onChange={(e) => handleChange('pvpEnabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">Стабильность построек (server.stability)</span>
                  <input
                    type="checkbox"
                    checked={form.stability !== false}
                    onChange={(e) => handleChange('stability', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">Радиация на монументах (server.radiation)</span>
                  <input
                    type="checkbox"
                    checked={form.radiation !== false}
                    onChange={(e) => handleChange('radiation', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">Содержание шкафа (decay.upkeep)</span>
                  <input
                    type="checkbox"
                    checked={form.decayUpkeep !== false}
                    onChange={(e) => handleChange('decayUpkeep', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">Мгновенный крафт (craft.instant)</span>
                  <input
                    type="checkbox"
                    checked={!!form.craftInstant}
                    onChange={(e) => handleChange('craftInstant', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">Урон от падения (falldamage.enabled)</span>
                  <input
                    type="checkbox"
                    checked={form.fallDamage !== false}
                    onChange={(e) => handleChange('fallDamage', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 5. CREATIVE MODE */}
          {activeTab === 'creative' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Hammer className="w-4 h-4 text-orange-400" />
                <span>Встроенный режим творчества Facepunch (Creative Mode)</span>
              </h3>

              <p className="text-xs text-slate-400">
                Нативные переменные Facepunch для строительных серверов и тестирования построек без ограничений ресурсов.
              </p>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Креатив для всех игроков (creative.allusers)</div>
                    <div className="text-[11px] text-slate-400">Автоматически включает режим строителя каждому вошедшему игроку.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.creativeAllUsers}
                    onChange={(e) => handleChange('creativeAllUsers', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Бесплатная стройка блоков (creative.freebuild)</div>
                    <div className="text-[11px] text-slate-400">Позволяет строить строительные блоки без затрат ресурсов из инвентаря.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.creativeFreeBuild}
                    onChange={(e) => handleChange('creativeFreeBuild', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Свободное размещение (creative.freeplacement)</div>
                    <div className="text-[11px] text-slate-400">Отключает все проверки коллизий при установке деплояблов и объектов.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.creativeFreePlacement}
                    onChange={(e) => handleChange('creativeFreePlacement', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Мгновенный бесплатный ремонт (creative.freerepair)</div>
                    <div className="text-[11px] text-slate-400">Снимает 30-секундный кулдаун урона и позволяет чинить объекты бесплатно киянкой.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.creativeFreeRepair}
                    onChange={(e) => handleChange('creativeFreeRepair', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Бесконечные электрические провода / IO (creative.unlimitedio)</div>
                    <div className="text-[11px] text-slate-400">Убирает лимиты длины проводов и шлангов электроники и гидравлики.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.creativeUnlimitedIo}
                    onChange={(e) => handleChange('creativeUnlimitedIo', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 6. CENTRALIZED BANNING & REPORTS */}
          {activeTab === 'banning' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400" />
                <span>Централизованный бан-лист (Centralized Banning API) и F7 репорты</span>
              </h3>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                <div className="text-xs font-bold text-white">Настройка Centralized Banning API:</div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    API Эндпоинт внешнего бан-листа (server.bansServerEndpoint)
                  </label>
                  <input
                    type="text"
                    value={form.bansServerEndpoint || ''}
                    onChange={(e) => handleChange('bansServerEndpoint', e.target.value)}
                    placeholder="https://bans.mydomain.com/api/rustBans/"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Сервер Rust при входе игрока отправляет GET запрос: <code className="text-cyan-400">/api/rustBans/&#123;steamID64&#125;</code>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Режим сбоя API (server.bansServerFailureMode)
                    </label>
                    <select
                      value={form.bansServerFailureMode || 0}
                      onChange={(e) => handleChange('bansServerFailureMode', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                    >
                      <option value={0}>0 — Пропускать игроков при недоступности API</option>
                      <option value={1}>1 — Блокировать вход при недоступности API</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Таймаут запроса к API (server.bansServerTimeout сек)
                    </label>
                    <input
                      type="number"
                      value={form.bansServerTimeout || 5}
                      onChange={(e) => handleChange('bansServerTimeout', parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    >
                    </input>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span>Прием внутриигровых репортов игроков (F7 Dialog):</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Эндпоинт приема репортов (server.reportsServerEndpoint)
                  </label>
                  <input
                    type="text"
                    value={form.reportsServerEndpoint || ''}
                    onChange={(e) => handleChange('reportsServerEndpoint', e.target.value)}
                    placeholder="https://myserver.com/api/reports"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Секретный ключ авторизации репортов (server.reportsServerEndpointKey)
                  </label>
                  <input
                    type="text"
                    value={form.reportsServerEndpointKey || ''}
                    onChange={(e) => handleChange('reportsServerEndpointKey', e.target.value)}
                    placeholder="SecretKey123..."
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <label className="flex items-center justify-between pt-2 border-t border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">Выводить репорты в консоль (server.printReportsToConsole)</span>
                  <input
                    type="checkbox"
                    checked={form.printReportsToConsole !== false}
                    onChange={(e) => handleChange('printReportsToConsole', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 7. RUST+ COMPANION */}
          {activeTab === 'rustplus' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Настройка мобильного приложения Rust+ Companion Server</span>
              </h3>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Включить сервис Rust+ Companion</div>
                    <div className="text-[11px] text-slate-400">
                      Позволяет игрокам сопрягать мобильное приложение Rust+, получать пуш-уведомления и управлять умными переключателями.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.rustPlusEnabled !== false}
                    onChange={(e) => handleChange('rustPlusEnabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                {form.rustPlusEnabled !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/[0.06]">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Порт Rust+ (app.port TCP &gt;= 10000)
                      </label>
                      <input
                        type="number"
                        value={form.appPort || 28082}
                        onChange={(e) => handleChange('appPort', parseInt(e.target.value) || 28082)}
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Публичный IP для приложения (app.publicip)
                      </label>
                      <input
                        type="text"
                        value={form.appPublicIp || ''}
                        onChange={(e) => handleChange('appPublicIp', e.target.value)}
                        placeholder="185.51.x.x"
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. WIPE TIMERS (NUCLEAR SILO) */}
          {activeTab === 'wipetimer' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Синхронизация таймера Nuclear Silo и расписания вайпов</span>
              </h3>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                <div className="text-xs font-bold text-white">Таймер монумента Nuclear Silo и события эндгейма (F-15E / Bradley):</div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      День недели (wipetimer.wipeDayofWeek)
                    </label>
                    <select
                      value={form.wipeDayOfWeek !== undefined ? form.wipeDayOfWeek : 4}
                      onChange={(e) => handleChange('wipeDayOfWeek', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                    >
                      <option value={0}>0 — Воскресенье</option>
                      <option value={1}>1 — Понедельник</option>
                      <option value={2}>2 — Вторник</option>
                      <option value={3}>3 — Среда</option>
                      <option value={4}>4 — Четверг (Default)</option>
                      <option value={5}>5 — Пятница</option>
                      <option value={6}>6 — Суббота</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Час вайпа (wipetimer.wipeHourofDay 0-23)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.wipeHourOfDay !== undefined ? form.wipeHourOfDay : 19}
                      onChange={(e) => handleChange('wipeHourOfDay', parseFloat(e.target.value) || 19)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Часовой пояс (wipetimer.wipeTimezone)
                    </label>
                    <input
                      type="text"
                      value={form.wipeTimezone || 'Europe/London'}
                      onChange={(e) => handleChange('wipeTimezone', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/[0.06]">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Cron Выражение (wipetimer.wipecronoverride)
                    </label>
                    <input
                      type="text"
                      value={form.wipeCronOverride || ''}
                      onChange={(e) => handleChange('wipeCronOverride', e.target.value)}
                      placeholder="0 14 1-7,15-21 * 4"
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Unix Timestamp Override (wipetimer.wipeUnixTimestampOverride)
                    </label>
                    <input
                      type="number"
                      value={form.wipeUnixTimestampOverride || ''}
                      onChange={(e) => handleChange('wipeUnixTimestampOverride', parseInt(e.target.value) || undefined)}
                      placeholder="1745000000"
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. SECURITY & MOD FRAMEWORK */}
          {activeTab === 'security' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Фреймворк модов, EasyAntiCheat и авто-перезапуск</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Мод-фреймворк
                  </label>
                  <select
                    value={form.framework}
                    onChange={(e) => handleChange('framework', e.target.value as ModFramework)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  >
                    <option value="carbon_release">Carbon (Production Release)</option>
                    <option value="carbon_preview">Carbon (Preview / Edge)</option>
                    <option value="oxide">Oxide / uMod (Legacy)</option>
                    <option value="vanilla">Vanilla (Без модификаций)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Авто-перезапуск при сбое процесса
                  </label>
                  <select
                    value={form.autoRestartOnCrash !== false ? 'true' : 'false'}
                    onChange={(e) => handleChange('autoRestartOnCrash', e.target.value === 'true')}
                    className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  >
                    <option value="true">Включен (Watchdog перезапустит через 5 сек)</option>
                    <option value="false">Отключен (Не перезапускать автоматически)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Дополнительные аргументы запуска CLI
                  </label>
                  <input
                    type="text"
                    value={form.customArgs || ''}
                    onChange={(e) => handleChange('customArgs', e.target.value)}
                    placeholder="-crossplay +server.tags test"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">EasyAntiCheat Защита (server.eac / server.secure)</span>
                  <input
                    type="checkbox"
                    checked={form.secure !== false}
                    onChange={(e) => handleChange('secure', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <span className="text-xs text-white font-semibold">Серверный AntiHack (antihack.enabled)</span>
                  <input
                    type="checkbox"
                    checked={form.antihackEnabled !== false}
                    onChange={(e) => handleChange('antihackEnabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-cyan-500/20 bg-cyan-500/5 flex items-center justify-between">
          <div className="text-xs text-[#94a3b8]">
            {savedSuccess ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                Настройки успешно применены в server.cfg и память!
              </span>
            ) : (
              <span>Изменения будут сохранены в `server.cfg` и применены при следующем старте.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
            >
              Закрыть
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-lg shadow-cyan-950/40 transition-all border border-cyan-300/30 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить настройки</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
