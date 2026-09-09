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
  MessageSquare,
  FolderOpen,
  HelpCircle,
  Info,
  Sparkles,
  CheckCircle2,
  UploadCloud,
  Loader2,
  CloudLightning
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
  const [selectedLocalMap, setSelectedLocalMap] = useState<string | null>(null);
  const [copyingMap, setCopyingMap] = useState<boolean>(false);
  const [copyMapMessage, setCopyMapMessage] = useState<string | null>(null);
  const [showMapGuide, setShowMapGuide] = useState<boolean>(false);
  const [uploadingToFacepunch, setUploadingToFacepunch] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccessUrl, setUploadSuccessUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleChange = (key: keyof ServerConfig, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    setForm({ ...server });
  }, [server, isOpen]);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onMapUploadProgress) return;
    const unsub = api.onMapUploadProgress((data: { percent: number }) => {
      setUploadProgress(data.percent);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handlePickLocalMap = async () => {
    const api = (window as any).electronAPI;
    if (!api?.selectFile) return;
    try {
      const filePath = await api.selectFile({
        title: 'Выберите файл кастомной карты Rust (.map)',
        filters: [
          { name: 'Кастомная карта Rust (*.map)', extensions: ['map'] },
          { name: 'Все файлы (*.*)', extensions: ['*'] }
        ]
      });
      if (filePath) {
        setSelectedLocalMap(filePath);
        setCopyMapMessage(null);
        setUploadSuccessUrl(null);
        setUploadError(null);
      }
    } catch {
      // Ignored
    }
  };

  const handleCopyMapToServer = async () => {
    if (!selectedLocalMap) return;
    const api = (window as any).electronAPI;
    if (!api?.copyMapToServer) return;
    setCopyingMap(true);
    setCopyMapMessage(null);
    try {
      const res = await api.copyMapToServer({
        mapFilePath: selectedLocalMap,
        serverDir: server.serverPath,
        identity: form.identity || 'rustserver'
      });
      if (res?.success) {
        setCopyMapMessage(res.message);
      } else {
        setCopyMapMessage(`Ошибка: ${res?.message || 'Не удалось скопировать'}`);
      }
    } catch (err: any) {
      setCopyMapMessage(`Ошибка: ${err.message}`);
    } finally {
      setCopyingMap(false);
    }
  };

  const handleUploadToFacepunch = async () => {
    if (!selectedLocalMap) return;
    const api = (window as any).electronAPI;
    if (!api?.uploadMapToFacepunch) return;
    setUploadingToFacepunch(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccessUrl(null);
    try {
      const res = await api.uploadMapToFacepunch(selectedLocalMap);
      const directUrl = typeof res?.mapUrl === 'string'
        ? res.mapUrl
        : (typeof res?.url === 'string' ? res.url : (res?.url?.mapUrl || ''));

      if (res?.success && directUrl) {
        const cleanUrl = directUrl.trim();
        setUploadSuccessUrl(cleanUrl);
        handleChange('levelUrl', cleanUrl);
        handleChange('mapLevel', 'Procedural Map');
      } else {
        setUploadError(res?.message || res?.error || 'Не удалось загрузить карту на Facepunch CDN');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Ошибка сети при загрузке карты');
    } finally {
      setUploadingToFacepunch(false);
    }
  };

  const handleLevelUrlInput = (rawVal: any) => {
    let clean = typeof rawVal === 'string' ? rawVal : (rawVal?.mapUrl || String(rawVal || ''));
    if (clean.includes('dropbox.com') && clean.includes('dl=0')) {
      clean = clean.replace('dl=0', 'dl=1');
    }
    handleChange('levelUrl', clean);
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

  if (!isOpen) return null;

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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Генерация процедурной карты и кастомные .map</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMapGuide(!showMapGuide)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium hover:bg-cyan-500/20 transition-all cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showMapGuide ? 'Скрыть справку по картам' : 'Как устроены кастомные карты?'}</span>
                </button>
              </div>

              {/* Informational Guide banner if toggled */}
              {showMapGuide && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/50 via-cyan-950/40 to-slate-900/60 border border-cyan-500/30 text-xs text-slate-300 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-bold text-cyan-300">
                    <Info className="w-4 h-4 text-[#00f0ff]" />
                    <span>Архитектура карт в движке Rust Dedicated:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                    <li>
                      <strong className="text-white">Базовая сцена Unity:</strong> В движке Rust нет внутренней сцены с названием <em>"Custom Map"</em>. Для любых пользовательских карт сервер загружает базовую сцену <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">Procedural Map</code>, а саму геометрию и монументы импортирует из файла <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">.map</code> через параметр <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">server.levelurl</code>. RustPilot автоматически настраивает эту связку.
                    </li>
                    <li>
                      <strong className="text-white">Прямая ссылка для игроков:</strong> При подключении к серверу клиент каждого игрока автоматически скачивает этот же файл карты по ссылке <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">server.levelurl</code>. Ссылка обязательно должна быть прямой (отдавать сырой поток байтов без HTML-страниц).
                    </li>
                    <li>
                      <strong className="text-white">Где разместить файл:</strong> Рекомендуется использовать <strong>Dropbox</strong> (ссылка должна оканчиваться на <code className="text-emerald-400">?dl=1</code>, RustPilot исправляет автоматически), <strong>Discord CDN</strong> (ПКМ по отправленному файлу в канале), <strong>GitHub Releases</strong> или личный веб-сервер.
                    </li>
                    <li>
                      <strong className="text-white">Размер и Сид:</strong> Параметры <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">server.worldsize</code> и <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">server.seed</code> для кастомных карт зашиты внутри заголовка файла <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">.map</code> и считываются сервером автоматически.
                    </li>
                  </ul>
                </div>
              )}

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
                    <option value="Barren">Barren (Облегченная без травы)</option>
                    <option value="HapisIsland">Hapis Island (Остров Hapis)</option>
                    <option value="Custom Map">Кастомная карта (.map URL)</option>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Размер карты (server.worldsize)
                    </label>
                    {(form.mapLevel === 'Custom Map' || !!form.levelUrl) && (
                      <span className="text-[10px] text-amber-400 font-mono">авто из .map</span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={form.worldSize}
                    onChange={(e) => handleChange('worldSize', parseInt(e.target.value) || 3000)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Сид генерации (server.seed)
                    </label>
                    {(form.mapLevel === 'Custom Map' || !!form.levelUrl) && (
                      <span className="text-[10px] text-amber-400 font-mono">авто из .map</span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={form.seed}
                    onChange={(e) => handleChange('seed', parseInt(e.target.value) || 123456)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>

              {/* Enhanced Custom Map Configuration Block */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-white/[0.03] to-cyan-950/20 border border-cyan-500/25 space-y-3.5 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Параметры кастомной карты (server.levelurl)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                    Сцена Unity: Procedural Map
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Прямая ссылка на файл карты (.map URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={typeof form.levelUrl === 'string' ? form.levelUrl : ''}
                      onChange={(e) => handleLevelUrlInput(e.target.value)}
                      placeholder="https://files.facepunch.com/.../map.map или https://www.dropbox.com/s/.../map.map?dl=1"
                      className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                    {!!form.levelUrl && (
                      <button
                        type="button"
                        onClick={() => handleChange('levelUrl', '')}
                        className="px-2.5 py-2 rounded-xl bg-white/[0.05] hover:bg-red-500/20 hover:text-red-400 text-slate-400 text-xs transition-colors cursor-pointer"
                        title="Очистить ссылку"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status Pills and Quick Presets */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {typeof form.levelUrl === 'string' && form.levelUrl.includes('dropbox.com') && form.levelUrl.includes('dl=1') && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                        <Check className="w-3 h-3" /> Dropbox direct stream (?dl=1) активен
                      </span>
                    )}

                    {typeof form.levelUrl === 'string' && form.levelUrl.toLowerCase().includes('.map') && (
                      <span className="flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-[#00f0ff]" /> Файл .map определен
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleLevelUrlInput(
                          'https://files.facepunch.com/rust/maps/c878d586e00f960f77912f22378c1655b242e4bd229464e016595efb9ecd58c2/PrototypeV1.7.9_c878d586e00f960f77912f22378c1655.map'
                        )
                      }
                      className="text-[10px] text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 rounded-lg border border-white/[0.06] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>⚡ Тестовый пресет: Facepunch Prototype (v1.7.9)</span>
                    </button>
                  </div>
                </div>

                {/* Local Map File Selector & Server Folder Tool */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Локальный файл карты на диске (.map)</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Если вы создали карту в RustEdit или скачали её на компьютер
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePickLocalMap}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{selectedLocalMap ? 'Выбрать другой .map' : 'Выбрать файл .map с диска'}</span>
                    </button>
                  </div>

                  {selectedLocalMap && (
                    <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/30 space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-slate-300 font-mono text-[11px] truncate max-w-full sm:max-w-[340px]" title={selectedLocalMap}>
                          {selectedLocalMap}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleUploadToFacepunch}
                            disabled={uploadingToFacepunch}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-[11px] shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {uploadingToFacepunch ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Загрузка ({uploadProgress}%)...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Загрузить на Facepunch CDN</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyMapToServer}
                            disabled={copyingMap}
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 text-[11px] font-medium transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="Скопировать файл в папку сервера"
                          >
                            <span>{copyingMap ? 'Копирование...' : 'В папку сервера'}</span>
                          </button>
                        </div>
                      </div>

                      {uploadingToFacepunch && (
                        <div className="space-y-1.5 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 animate-pulse">
                          <div className="flex justify-between text-[11px] font-mono text-cyan-300">
                            <span className="flex items-center gap-1.5">
                              <CloudLightning className="w-3.5 h-3.5 text-[#00f0ff]" />
                              Отправка .map файла в облачный CDN Facepunch...
                            </span>
                            <span className="font-bold">{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-cyan-500/20">
                            <div
                              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {uploadSuccessUrl && (
                        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Карта успешно опубликована на официальном CDN Facepunch!</span>
                          </div>
                          <div className="font-mono text-[10px] break-all text-slate-200 bg-black/50 p-2 rounded border border-emerald-500/20 select-all">
                            {typeof uploadSuccessUrl === 'string' ? uploadSuccessUrl : JSON.stringify(uploadSuccessUrl)}
                          </div>
                          <p className="text-[10px] text-emerald-300/90 leading-relaxed">
                            ✓ Ссылка автоматически подставлена в поле <strong>server.levelurl</strong>. Теперь любой игрок при входе на сервер будет быстро и без задержек скачивать эту карту напрямую с серверов Facepunch!
                          </p>
                        </div>
                      )}

                      {uploadError && (
                        <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                          <strong>Ошибка загрузки:</strong> {typeof uploadError === 'string' ? uploadError : JSON.stringify(uploadError)}
                        </div>
                      )}

                      {copyMapMessage && (
                        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                          {typeof copyMapMessage === 'string' ? copyMapMessage : JSON.stringify(copyMapMessage)}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 leading-relaxed">
                        <strong className="text-amber-300">Рекомендация:</strong> Нажмите <em>«Загрузить на Facepunch CDN»</em> — RustPilot напрямую отправит файл в публичный API Facepunch и сгенерирует вечную прямую ссылку, которую клиент Rust распознает нативно.
                      </div>
                    </div>
                  )}
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
