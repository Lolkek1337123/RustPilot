import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Folder,
  Bell,
  HardDrive,
  ShieldCheck,
  Sparkles,
  Send,
  Sliders,
  LogOut,
  Check,
  Palette,
  Terminal,
  Save,
  Radio,
  Lock,
  User,
  Volume2,
  Info,
  Code2,
  Heart,
  ExternalLink,
  Cpu,
  Globe,
  RefreshCw,
  FlaskConical,
  Download,
  RotateCw,
  Zap
} from 'lucide-react';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'tray' | 'discord' | 'appearance' | 'updates' | 'about';

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // General & Paths
  const [defaultDir, setDefaultDir] = useState(() => localStorage.getItem('rustpilot_default_dir') || 'C:\\RustServers');
  const [backupDir, setBackupDir] = useState(() => localStorage.getItem('rustpilot_backup_dir') || 'C:\\RustServers\\_backups');
  const [toolsDir, setToolsDir] = useState(() => localStorage.getItem('rustpilot_tools_dir') || 'C:\\RustServers\\_tools');
  const [autoBackupOnWipe, setAutoBackupOnWipe] = useState(() => localStorage.getItem('rustpilot_auto_backup_wipe') !== 'false');
  const [maxBackupCount, setMaxBackupCount] = useState(() => parseInt(localStorage.getItem('rustpilot_max_backups') || '10', 10));

  // Tray & Window Behavior
  const [closeToTray, setCloseToTray] = useState(() => localStorage.getItem('rustpilot_close_to_tray') !== 'false');
  const [autoStartWindows, setAutoStartWindows] = useState(() => localStorage.getItem('rustpilot_autostart_windows') === 'true');
  const [minimizeOnStart, setMinimizeOnStart] = useState(() => localStorage.getItem('rustpilot_minimize_start') === 'true');
  const [promptOnExitRunning, setPromptOnExitRunning] = useState(() => localStorage.getItem('rustpilot_prompt_exit') !== 'false');

  // Discord & Notifications
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(() => localStorage.getItem('rustpilot_discord_webhook') || '');
  const [notifyOnStart, setNotifyOnStart] = useState(() => localStorage.getItem('rustpilot_notify_start') !== 'false');
  const [notifyOnCrash, setNotifyOnCrash] = useState(() => localStorage.getItem('rustpilot_notify_crash') !== 'false');
  const [notifyOnWipe, setNotifyOnWipe] = useState(() => localStorage.getItem('rustpilot_notify_wipe') !== 'false');
  const [notifyOnReports, setNotifyOnReports] = useState(() => localStorage.getItem('rustpilot_notify_reports') !== 'false');
  const [windowsToasts, setWindowsToasts] = useState(() => localStorage.getItem('rustpilot_windows_toasts') !== 'false');
  const [soundAlerts, setSoundAlerts] = useState(() => localStorage.getItem('rustpilot_sound_alerts') !== 'false');
  const [testSent, setTestSent] = useState(false);

  // Appearance & Console
  const [enableBlur, setEnableBlur] = useState(() => localStorage.getItem('rustpilot_enable_blur') !== 'false');
  const [consoleFontSize, setConsoleFontSize] = useState(() => localStorage.getItem('rustpilot_console_font_size') || '12px');
  const [consoleFontFamily, setConsoleFontFamily] = useState(() => localStorage.getItem('rustpilot_console_font_family') || 'JetBrains Mono');
  const [maxConsoleLines, setMaxConsoleLines] = useState(() => parseInt(localStorage.getItem('rustpilot_max_console_lines') || '1000', 10));

  // Updates & GitHub
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('rustpilot_github_repo') || 'Lolkek1337123/RustPilot');
  const [checkUpdatesOnStart, setCheckUpdatesOnStart] = useState(() => localStorage.getItem('rustpilot_check_updates_on_start') !== 'false');
  const [isSaved, setIsSaved] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState<any>(null);
  const [isUpdateReadyToInstall, setIsUpdateReadyToInstall] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onUpdateProgress) return;

    const unsub = api.onUpdateProgress((data: any) => {
      setUpdateDownloadProgress(data);
      if (data.stage === 'ready') {
        setIsDownloadingUpdate(false);
        setIsUpdateReadyToInstall(true);
      } else if (data.stage === 'error') {
        setIsDownloadingUpdate(false);
        setDownloadError(data.error || 'Ошибка при загрузке обновления');
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleStartInAppUpdate = async () => {
    setIsDownloadingUpdate(true);
    setDownloadError(null);
    setIsUpdateReadyToInstall(false);

    try {
      const api = (window as any).electronAPI;
      if (api?.downloadAppUpdate) {
        const res = await api.downloadAppUpdate(updateResult?.downloadUrl);
        if (!res?.success) {
          setIsDownloadingUpdate(false);
          setDownloadError(res?.error || 'Не удалось завершить загрузку обновления');
        }
      }
    } catch (err: any) {
      setIsDownloadingUpdate(false);
      setDownloadError(err?.message || 'Сбой соединения');
    }
  };

  const handleApplyUpdateAndRestart = async () => {
    setIsApplyingUpdate(true);
    const api = (window as any).electronAPI;
    if (api?.installAppUpdate) {
      await api.installAppUpdate();
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('rustpilot_default_dir', defaultDir);
    localStorage.setItem('rustpilot_backup_dir', backupDir);
    localStorage.setItem('rustpilot_tools_dir', toolsDir);
    localStorage.setItem('rustpilot_auto_backup_wipe', autoBackupOnWipe ? 'true' : 'false');
    localStorage.setItem('rustpilot_max_backups', String(maxBackupCount));

    localStorage.setItem('rustpilot_close_to_tray', closeToTray ? 'true' : 'false');
    localStorage.setItem('rustpilot_autostart_windows', autoStartWindows ? 'true' : 'false');
    localStorage.setItem('rustpilot_minimize_start', minimizeOnStart ? 'true' : 'false');
    localStorage.setItem('rustpilot_prompt_exit', promptOnExitRunning ? 'true' : 'false');

    localStorage.setItem('rustpilot_discord_webhook', discordWebhookUrl);
    localStorage.setItem('rustpilot_notify_start', notifyOnStart ? 'true' : 'false');
    localStorage.setItem('rustpilot_notify_crash', notifyOnCrash ? 'true' : 'false');
    localStorage.setItem('rustpilot_notify_wipe', notifyOnWipe ? 'true' : 'false');
    localStorage.setItem('rustpilot_notify_reports', notifyOnReports ? 'true' : 'false');
    localStorage.setItem('rustpilot_windows_toasts', windowsToasts ? 'true' : 'false');
    localStorage.setItem('rustpilot_sound_alerts', soundAlerts ? 'true' : 'false');

    localStorage.setItem('rustpilot_enable_blur', enableBlur ? 'true' : 'false');
    localStorage.setItem('rustpilot_console_font_size', consoleFontSize);
    localStorage.setItem('rustpilot_console_font_family', consoleFontFamily);
    localStorage.setItem('rustpilot_max_console_lines', String(maxConsoleLines));

    localStorage.setItem('rustpilot_github_repo', githubRepo.trim());
    localStorage.setItem('rustpilot_check_updates_on_start', checkUpdatesOnStart ? 'true' : 'false');

    // Notify Electron about autostart setting
    const api = (window as any).electronAPI;
    if (api?.setAutostart) {
      api.setAutostart(autoStartWindows);
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCheckUpdateManual = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    setUpdateResult(null);

    try {
      const api = (window as any).electronAPI;
      const res = api?.checkAppUpdates ? await api.checkAppUpdates(githubRepo) : null;
      setIsCheckingUpdate(false);

      if (res?.hasUpdate) {
        setUpdateResult(res);
        setUpdateStatus(`Доступна новая версия: ${res.latestVersion} (${res.releaseName || ''})`);
      } else if (res?.error && !res.latestVersion) {
        setUpdateStatus(`Не удалось проверить обновления: ${res.error}`);
      } else {
        setUpdateStatus(`У вас установлена последняя версия (${res?.currentVersion || 'v1.0.0'}). Обновлений не требуется.`);
      }
    } catch (err: any) {
      setIsCheckingUpdate(false);
      setUpdateStatus(`Ошибка проверки: ${err?.message || 'Сервер GitHub недоступен'}`);
    }
  };

  const handleSendDiscordTest = async () => {
    if (!discordWebhookUrl.trim()) {
      alert('Пожалуйста, введите корректный URL вебхука Discord!');
      return;
    }

    try {
      await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: '🧪 TRP Labs RustPilot — Тестовое оповещение',
              description: 'Связь с сервером успешно установлена! Все оповещения и статусы настроены корректно.',
              color: 61695,
              fields: [
                { name: 'Статус', value: 'Онлайн', inline: true },
                { name: 'Версия', value: 'v2.0.0 Cobalt', inline: true }
              ],
              footer: { text: 'TRP Labs • Team Rust Plugins' },
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch {
      alert('Ошибка отправки вебхука. Проверьте правильность URL.');
    }
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'general', label: 'Пути и Бэкапы', icon: Folder },
    { id: 'tray', label: 'Трей и Окна', icon: Radio },
    { id: 'discord', label: 'Discord и Оповещения', icon: Bell },
    { id: 'appearance', label: 'Вид и Консоль', icon: Palette },
    { id: 'updates', label: 'Обновления GitHub', icon: RefreshCw },
    { id: 'about', label: 'О программе', icon: Info }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl h-[84vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Settings className="w-4 h-4 text-[#00f0ff]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit']">
                Настройки приложения TRP Labs RustPilot
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Конфигурация среды, автозагрузки, Discord вебхуков и системных путей
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
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
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
          {/* TAB 1: GENERAL & PATHS */}
          {activeTab === 'general' && (
            <div className="space-y-5 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#00f0ff]" />
                <span>Системные директории и автоматические бэкапы</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Основная папка для установки серверов
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={defaultDir}
                      onChange={(e) => setDefaultDir(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                    <button
                      onClick={async () => {
                        const dir = await (window as any).electronAPI?.selectDirectory();
                        if (dir) setDefaultDir(dir);
                      }}
                      className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/20 cursor-pointer"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Папка автоматических резервных копий (Бэкапы .zip)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={backupDir}
                      onChange={(e) => setBackupDir(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                    <button
                      onClick={async () => {
                        const dir = await (window as any).electronAPI?.selectDirectory();
                        if (dir) setBackupDir(dir);
                      }}
                      className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/20 cursor-pointer"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Папка утилит и SteamCMD
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={toolsDir}
                      onChange={(e) => setToolsDir(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                    <button
                      onClick={async () => {
                        const dir = await (window as any).electronAPI?.selectDirectory();
                        if (dir) setToolsDir(dir);
                      }}
                      className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/20 cursor-pointer"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Авто-бэкап перед каждым вайпом</div>
                    <div className="text-[11px] text-[#94a3b8]">Создает архив карты (.sav, .map) и баз данных перед стиранием.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoBackupOnWipe}
                    onChange={(e) => setAutoBackupOnWipe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                  />
                </label>

                <div className="flex items-center justify-between pt-3 border-t border-cyan-500/15">
                  <div>
                    <div className="text-xs font-bold text-white">Лимит хранимых бэкапов</div>
                    <div className="text-[11px] text-[#94a3b8]">Автоматически удалять старые копии для экономии места на диске.</div>
                  </div>
                  <input
                    type="number"
                    value={maxBackupCount}
                    onChange={(e) => setMaxBackupCount(parseInt(e.target.value) || 10)}
                    className="w-20 px-2 py-1 rounded-lg bg-[#0a1122] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRAY & BEHAVIOR */}
          {activeTab === 'tray' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Управление системным треем и поведение окна</span>
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#050811] border border-cyan-500/20 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Сворачивать в трей при нажатии [X]</div>
                    <div className="text-[11px] text-[#94a3b8]">Окно прячется в область уведомлений Windows, серверы продолжают работу.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={closeToTray}
                    onChange={(e) => setCloseToTray(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#050811] border border-cyan-500/20 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Предупреждать о закрытии при активных серверах</div>
                    <div className="text-[11px] text-[#94a3b8]">Показывает диалоговое окно с подтверждением остановки серверов.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={promptOnExitRunning}
                    onChange={(e) => setPromptOnExitRunning(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#050811] border border-cyan-500/20 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Автозагрузка при старте Windows</div>
                    <div className="text-[11px] text-[#94a3b8]">Запускать панель RustPilot автоматически при входе в систему.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoStartWindows}
                    onChange={(e) => setAutoStartWindows(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#050811] border border-cyan-500/20 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Сворачивать в трей при запуске сервера</div>
                    <div className="text-[11px] text-[#94a3b8]">Автоматически прячет панель управления после успешного старта.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={minimizeOnStart}
                    onChange={(e) => setMinimizeOnStart(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: DISCORD & NOTIFICATIONS */}
          {activeTab === 'discord' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#00f0ff]" />
                <span>Интеграция с Discord Webhook и уведомления</span>
              </h3>

              <div className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Discord Webhook URL для уведомлений
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/123456/abcdef..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#0a1122] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                    <button
                      onClick={handleSendDiscordTest}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md shrink-0 border border-cyan-300/30 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testSent ? 'Отправлено!' : 'Тест'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Создайте вебхук в настройках текстового канала Discord: Настройки канала &gt; Интеграции &gt; Вебхуки.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-cyan-500/15">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnStart}
                      onChange={(e) => setNotifyOnStart(e.target.checked)}
                      className="rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                    />
                    <span>Старт и онлайн сервера</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnCrash}
                      onChange={(e) => setNotifyOnCrash(e.target.checked)}
                      className="rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                    />
                    <span>Аварийный сбой / Падение (Crash)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnWipe}
                      onChange={(e) => setNotifyOnWipe(e.target.checked)}
                      className="rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                    />
                    <span>Уведомление о Вайпе</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnReports}
                      onChange={(e) => setNotifyOnReports(e.target.checked)}
                      className="rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                    />
                    <span>F7 Жалобы игроков на читеров</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#050811] border border-cyan-500/20 cursor-pointer">
                  <span className="text-xs text-white font-semibold">Всплывающие уведомления Windows</span>
                  <input
                    type="checkbox"
                    checked={windowsToasts}
                    onChange={(e) => setWindowsToasts(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#050811] border border-cyan-500/20 cursor-pointer">
                  <span className="text-xs text-white font-semibold">Звуковые сигналы при сбоях</span>
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: APPEARANCE & CONSOLE */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>Оформление, темы и настройка терминала</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#050811] border border-cyan-500/25 flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider block">
                      Фирменный стиль
                    </label>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <FlaskConical className="w-3.5 h-3.5 text-[#00f0ff]" />
                      <span>Cobalt Scientist (Синий Учёный)</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40">
                    ЕДИНЫЙ СТИЛЬ
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Размер шрифта консоли
                  </label>
                  <select
                    value={consoleFontSize}
                    onChange={(e) => setConsoleFontSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white focus:outline-none"
                  >
                    <option value="11px">11 px (Компактный)</option>
                    <option value="12px">12 px (Стандартный)</option>
                    <option value="13px">13 px (Увеличенный)</option>
                    <option value="14px">14 px (Крупный)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Шрифт консоли
                  </label>
                  <select
                    value={consoleFontFamily}
                    onChange={(e) => setConsoleFontFamily(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white focus:outline-none"
                  >
                    <option value="JetBrains Mono">JetBrains Mono</option>
                    <option value="Fira Code">Fira Code</option>
                    <option value="Consolas">Consolas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Буфер истории консоли (строк)
                  </label>
                  <input
                    type="number"
                    value={maxConsoleLines}
                    onChange={(e) => setMaxConsoleLines(parseInt(e.target.value) || 1000)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#050811] border border-cyan-500/20 cursor-pointer mt-2">
                <div>
                  <div className="text-xs font-bold text-white">Эффекты размытия (Glassmorphism Blur)</div>
                  <div className="text-[11px] text-[#94a3b8]">Отключите для экономии ресурсов на слабых видеокартах.</div>
                </div>
                <input
                  type="checkbox"
                  checked={enableBlur}
                  onChange={(e) => setEnableBlur(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                />
              </label>
            </div>
          )}

          {/* TAB 5: GITHUB UPDATES */}
          {activeTab === 'updates' && (
            <div className="space-y-5 max-w-3xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#00f0ff]" />
                <span>Конфигурация обновлений через GitHub Releases</span>
              </h3>

              <div className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Репозиторий релизов GitHub (owner/repo)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                      placeholder="Lolkek1337123/RustPilot"
                      className="flex-1 px-3 py-2 rounded-xl bg-[#0a1122] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                    <button
                      onClick={() => (window as any).electronAPI?.openUrl(`https://github.com/${githubRepo.trim()}/releases`)}
                      className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/20 cursor-pointer"
                      title="Открыть репозиторий в браузере"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mt-1">
                    RustPilot проверяет официальный GitHub API на наличие свежих версий, скачивает changelog и дает ссылку на загрузку.
                  </p>
                </div>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#0a1122] border border-cyan-500/10 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Проверять обновления перед запуском</div>
                    <div className="text-[11px] text-[#94a3b8]">
                      При открытии программы запускается диагностика обновлений с возможностью сразу скачать свежую сборку.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkUpdatesOnStart}
                    onChange={(e) => setCheckUpdatesOnStart(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00f0ff] focus:ring-0 accent-[#00f0ff]"
                  />
                </label>
              </div>

              {/* Status and manual check */}
              <div className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Ручная проверка обновлений</div>
                    <div className="text-[11px] text-[#94a3b8]">
                      {updateStatus || 'Нажмите кнопку для запроса к GitHub API'}
                    </div>
                  </div>

                  <button
                    onClick={handleCheckUpdateManual}
                    disabled={isCheckingUpdate}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-[#00f0ff] text-xs font-bold border border-cyan-500/30 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdate ? 'Проверка...' : 'Проверить сейчас'}</span>
                  </button>
                </div>

                {updateResult && updateResult.hasUpdate && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 mt-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-bold text-emerald-300">
                          Найдена новая версия: {updateResult.latestVersion}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {updateResult.assetSizeFormatted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-[#00f0ff] border border-cyan-500/30">
                            {updateResult.assetSizeFormatted}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-emerald-400">
                          Текущая: {updateResult.currentVersion}
                        </span>
                      </div>
                    </div>

                    {updateResult.releaseNotes && (
                      <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/20 text-[11px] text-slate-300 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {updateResult.releaseNotes}
                      </div>
                    )}

                    {/* Progress when downloading */}
                    {isDownloadingUpdate && updateDownloadProgress && (
                      <div className="p-3 rounded-xl bg-[#060b17] border border-cyan-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300">
                            {updateDownloadProgress.transferredFormatted} / {updateDownloadProgress.totalFormatted}
                          </span>
                          <span className="text-[#00f0ff] font-bold">
                            {updateDownloadProgress.percent}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-black/60 border border-cyan-500/20 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] to-[#2563eb] transition-all"
                            style={{ width: `${updateDownloadProgress.percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Скорость: {updateDownloadProgress.speed}</span>
                          <span className="text-emerald-400">
                            {updateDownloadProgress.stage === 'extracting' ? 'Проверка пакета...' : 'Загрузка с GitHub...'}
                          </span>
                        </div>
                      </div>
                    )}

                    {downloadError && (
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                        {downloadError}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        onClick={() => {
                          const target = updateResult.downloadUrl || updateResult.htmlUrl;
                          if (target) (window as any).electronAPI?.openUrl(target);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Открыть релиз в браузере</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {isApplyingUpdate ? (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                            <span>Установка и перезапуск...</span>
                          </div>
                        ) : isUpdateReadyToInstall ? (
                          <button
                            onClick={handleApplyUpdateAndRestart}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/60 cursor-pointer border border-emerald-300/30"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Перезапустить и обновить</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleStartInAppUpdate}
                            disabled={isDownloadingUpdate}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#0284c7] to-[#2563eb] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950/50 cursor-pointer disabled:opacity-50 border border-cyan-300/30"
                          >
                            {isDownloadingUpdate ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Загрузка...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5" />
                                <span>Скачать и установить сейчас</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ABOUT & DEVELOPER INFO */}
          {activeTab === 'about' && (
            <div className="space-y-6 max-w-3xl">
              {/* Product Hero Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#0a1122] to-blue-950/40 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00f0ff] to-[#2563eb] flex items-center justify-center shadow-xl shadow-cyan-950/60 shrink-0">
                    <FlaskConical className="w-8 h-8 text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white font-['Outfit'] tracking-wide">
                        TRP Labs • RustPilot
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/40 font-mono">
                        v2.0.0 Cobalt Release
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      Профессиональная панель управления, мониторинга и автоматизации игровых серверов Rust Dedicated Server.
                    </p>
                  </div>
                </div>
              </div>

              {/* Developer & Credits Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-2">
                  <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>Разработчик и Авторство</span>
                  </div>
                  <div className="text-sm font-bold text-white font-['Outfit']">TRP Labs (TEAM_RUST_PLUGINS)</div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    Специализированная разработка модификаций, кастомных ядер, высокопроизводительных плагинов и инфраструктуры для Rust.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-2">
                  <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>Стек технологий</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono space-y-1">
                    <div>• Electron 34 & React 19 (TypeScript)</div>
                    <div>• Native SteamCMD & Valve Protocol</div>
                    <div>• Monaco IDE & Carbon/Oxide Ecosystem</div>
                    <div>• Cobalt Scientist & Hazmat Glassmorphism UI</div>
                  </div>
                </div>
              </div>

              {/* Manual Update Check & Links */}
              <div className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Проверка обновлений приложения</div>
                    <div className="text-[11px] text-[#94a3b8]">
                      {updateStatus || 'Проверить наличие свежих патчей и сборок RustPilot'}
                    </div>
                  </div>

                  <button
                    onClick={handleCheckUpdateManual}
                    disabled={isCheckingUpdate}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] text-xs font-bold border border-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdate ? 'Проверка...' : 'Проверить'}</span>
                  </button>
                </div>
              </div>

              {/* Footer Copyright */}
              <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <span>Создано с</span>
                <Heart className="w-3.5 h-3.5 text-[#00f0ff] fill-[#00f0ff]" />
                <span>командой <strong>TRP Labs</strong> © 2026. Все права защищены.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-cyan-500/20 bg-cyan-500/5 flex items-center justify-between">
          <div className="text-xs text-[#94a3b8]">
            {isSaved ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                Настройки приложения сохранены!
              </span>
            ) : (
              <span>Настройки сохраняются локально для текущей системы.</span>
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
