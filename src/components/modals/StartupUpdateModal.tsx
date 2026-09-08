import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Download,
  ExternalLink,
  ArrowRight,
  WifiOff,
  AlertCircle,
  FlaskConical,
  X,
  Zap,
  RotateCw,
  HardDrive
} from 'lucide-react';
import { sound } from '../../services/soundService';

export interface AppUpdateProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
  transferredFormatted: string;
  totalFormatted: string;
  speed: string;
  stage: 'downloading' | 'extracting' | 'ready' | 'error';
  error?: string;
}

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName?: string;
  releaseDate?: string;
  releaseNotes?: string;
  htmlUrl?: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  assetSizeFormatted?: string;
  assetType?: 'asar' | 'zip' | 'exe' | 'other';
  canDirectUpdate?: boolean;
  repository?: string;
  error?: string;
}

interface StartupUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalPhase = 'checking' | 'latest' | 'available' | 'downloading' | 'ready' | 'error';

export const StartupUpdateModal: React.FC<StartupUpdateModalProps> = ({ isOpen, onClose }) => {
  const [phase, setPhase] = useState<ModalPhase>('checking');
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<AppUpdateProgress>({
    percent: 0,
    transferredBytes: 0,
    totalBytes: 0,
    transferredFormatted: '0 МБ',
    totalFormatted: '0 МБ',
    speed: '0 КБ/с',
    stage: 'downloading'
  });
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(5);

  const countdownTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    let isMounted = true;
    setPhase('checking');
    setDownloadError(null);

    const runCheck = async () => {
      try {
        const customRepo = localStorage.getItem('rustpilot_github_repo') || undefined;
        const api = (window as any).electronAPI;
        const result: AppUpdateInfo = api?.checkAppUpdates
          ? await api.checkAppUpdates(customRepo)
          : { hasUpdate: false, currentVersion: 'v1.0.0', latestVersion: 'v1.0.0' };

        if (!isMounted) return;

        setUpdateInfo(result);

        if (result.hasUpdate) {
          setPhase('available');
          sound.playAlert();
        } else if (result.error && !result.latestVersion) {
          setPhase('error');
          // Auto close on offline after 2.5s
          setTimeout(() => {
            if (isMounted) onClose();
          }, 2500);
        } else {
          setPhase('latest');
          // Auto close when already latest version after 1.3s
          setTimeout(() => {
            if (isMounted) onClose();
          }, 1300);
        }
      } catch {
        if (!isMounted) return;
        setPhase('error');
        setTimeout(() => {
          if (isMounted) onClose();
        }, 2200);
      }
    };

    runCheck();

    return () => {
      isMounted = false;
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isOpen, onClose]);

  // Subscribe to download progress events
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onUpdateProgress) return;

    const unsubscribe = api.onUpdateProgress((data: AppUpdateProgress) => {
      setDownloadProgress(data);

      if (data.stage === 'ready') {
        setPhase('ready');
        sound.playSuccess();
        startAutoRestartCountdown();
      } else if (data.stage === 'error') {
        setDownloadError(data.error || 'Ошибка загрузки пакета обновления');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const startAutoRestartCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    let secondsLeft = 5;
    setCountdown(secondsLeft);

    countdownTimerRef.current = setInterval(() => {
      secondsLeft -= 1;
      setCountdown(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(countdownTimerRef.current);
        handleInstallAndRestart();
      }
    }, 1000);
  };

  const handleStartDirectDownload = async () => {
    sound.playClick();
    setPhase('downloading');
    setDownloadError(null);
    setDownloadProgress({
      percent: 0,
      transferredBytes: 0,
      totalBytes: updateInfo?.assetSize || 0,
      transferredFormatted: '0 МБ',
      totalFormatted: updateInfo?.assetSizeFormatted || 'Определение...',
      speed: '0 КБ/с',
      stage: 'downloading'
    });

    try {
      const api = (window as any).electronAPI;
      if (!api?.downloadAppUpdate) {
        throw new Error('Функция прямого обновления недоступна в текущей сборке');
      }

      const res = await api.downloadAppUpdate(updateInfo?.downloadUrl);
      if (!res?.success) {
        setDownloadError(res?.error || 'Не удалось завершить загрузку обновления');
      }
    } catch (err: any) {
      setDownloadError(err?.message || 'Сбой подключения к серверу обновлений');
    }
  };

  const handleInstallAndRestart = async () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    sound.playStart();

    const api = (window as any).electronAPI;
    if (api?.installAppUpdate) {
      await api.installAppUpdate();
    }
  };

  const handleOpenExternal = () => {
    sound.playClick();
    const targetUrl = updateInfo?.downloadUrl || updateInfo?.htmlUrl;
    if (targetUrl) {
      const api = (window as any).electronAPI;
      if (api?.openExternal) {
        api.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-[#030611]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#060b17] border border-cyan-500/30 p-6 shadow-2xl shadow-black/80 relative overflow-hidden text-slate-100 font-['Outfit']">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/15 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] flex items-center justify-center shadow-lg shadow-cyan-950/50 border border-cyan-400/30 shrink-0">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                RustPilot <span className="text-[#00f0ff] text-xs font-mono">COBALT</span>
              </h2>
              <p className="text-[11px] text-[#94a3b8]">Система автоматических обновлений GitHub</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
              onClose();
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Phase 1: Checking */}
        {phase === 'checking' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 relative z-10">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00f0ff]">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Проверка актуальной версии...</h3>
              <p className="text-xs text-slate-400">
                Запрос к GitHub Releases API ({localStorage.getItem('rustpilot_github_repo') || 'Lolkek1337123/RustPilot'})...
              </p>
            </div>
          </div>
        )}

        {/* Phase 2: Up to Date */}
        {phase === 'latest' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 relative z-10">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-in zoom-in-75 duration-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">У вас последняя версия!</h3>
              <p className="text-xs text-slate-400 font-mono">
                {updateInfo?.currentVersion || 'v1.0.0'} — обновлений не требуется
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00f0ff] border border-cyan-400/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Перейти в панель</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Update Available (Direct In-App Option) */}
        {phase === 'available' && (
          <div className="py-4 space-y-4 relative z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Version banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-blue-500/15 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-white flex items-center gap-2">
                      <span>Доступна новая версия:</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                        {updateInfo?.latestVersion}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Текущая: {updateInfo?.currentVersion} {updateInfo?.releaseDate ? `• от ${updateInfo.releaseDate}` : ''}
                    </div>
                  </div>
                </div>

                {updateInfo?.assetSizeFormatted && (
                  <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-cyan-500/15 text-[#00f0ff] border border-cyan-500/30">
                    {updateInfo.assetSizeFormatted}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold pt-1 border-t border-amber-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Автоматическая установка внутри приложения без браузера</span>
              </div>
            </div>

            {/* Release notes */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Что нового в релизе</span>
              </div>
              <div className="max-h-36 overflow-y-auto p-3 rounded-xl bg-[#091122] border border-cyan-500/20 text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans scrollbar-thin">
                {updateInfo?.releaseNotes || 'Свежее обновление RustPilot с оптимизациями и исправлениями.'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-cyan-500/15 gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-all cursor-pointer"
              >
                Позже
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenExternal}
                  className="px-3 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer flex items-center gap-1"
                  title="Открыть в браузере (резервный способ)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleStartDirectDownload}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#0284c7] to-[#2563eb] text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-950/60 hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-cyan-300/40"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать и обновить прямо сейчас</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 4: Downloading In-App */}
        {phase === 'downloading' && (
          <div className="py-6 space-y-4 relative z-10 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-white flex items-center justify-center gap-2">
                <Download className="w-4 h-4 text-[#00f0ff] animate-bounce" />
                <span>Загрузка обновления с GitHub</span>
              </h3>
              <p className="text-xs text-slate-400">
                {downloadProgress.stage === 'extracting'
                  ? 'Распаковка и проверка целостности пакета...'
                  : 'Прямое скачивание пакета без перехода в браузер...'}
              </p>
            </div>

            {/* Neon Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  {downloadProgress.transferredFormatted} / {downloadProgress.totalFormatted}
                </span>
                <span className="text-[#00f0ff] font-bold text-sm">
                  {downloadProgress.percent}%
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-[#050914] border border-cyan-500/30 overflow-hidden p-0.5 relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] via-[#38bdf8] to-[#2563eb] transition-all duration-200 shadow-md shadow-cyan-500/50 relative"
                  style={{ width: `${downloadProgress.percent}%` }}
                >
                  {/* Subtle shimmer beam in progress bar */}
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>Скорость: <strong className="text-slate-200">{downloadProgress.speed}</strong></span>
                <span className="text-emerald-400 font-semibold">
                  {downloadProgress.stage === 'extracting' ? 'Проверка файлов...' : 'Загрузка...'}
                </span>
              </div>
            </div>

            {/* Download error handling */}
            {downloadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Ошибка при скачивании:</span>
                </div>
                <div className="text-[11px] text-slate-300">{downloadError}</div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleOpenExternal}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer"
                  >
                    Скачать через браузер
                  </button>
                  <button
                    onClick={handleStartDirectDownload}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Повторить
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 5: Ready to Apply and Restart */}
        {phase === 'ready' && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/60 relative">
              <CheckCircle2 className="w-7 h-7" />
              <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping pointer-events-none" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Обновление готово к установке!</h3>
              <p className="text-xs text-slate-300 max-w-sm">
                Пакет успешно загружен. RustPilot перезапустится для мгновенного применения новой версии.
              </p>
            </div>

            {/* Auto restart timer badge */}
            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-[#00f0ff] flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Автоматический перезапуск через <strong>{countdown}</strong> сек...</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-all cursor-pointer"
              >
                Отложить
              </button>

              <button
                onClick={handleInstallAndRestart}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:brightness-110 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 transition-all cursor-pointer border border-emerald-300/40"
              >
                <RotateCw className="w-4 h-4" />
                <span>Перезапустить и обновить</span>
              </button>
            </div>
          </div>
        )}

        {/* Phase 6: Offline / Check Error */}
        {phase === 'error' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 relative z-10">
            <div className="w-12 h-12 rounded-full bg-slate-500/15 border border-slate-500/30 flex items-center justify-center text-slate-400">
              <WifiOff className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Оффлайн режим (GitHub недоступен)</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                {updateInfo?.error || 'Не удалось проверить релизы на GitHub. Приложение запускается в автономном режиме.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                Продолжить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
