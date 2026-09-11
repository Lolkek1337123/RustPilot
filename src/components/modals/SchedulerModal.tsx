import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  RotateCw,
  Trash2,
  Plus,
  Radio,
  MessageSquare,
  HardDrive,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Zap,
  Sparkles
} from 'lucide-react';
import { sound } from '../../services/soundService';

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

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverPath: string;
  serverName: string;
}

const DAYS_OF_WEEK = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг (Глобал)',
  'Пятница',
  'Суббота'
];

export const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  onClose,
  serverPath,
  serverName
}) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'restart' | 'wipe' | 'broadcast' | 'backup'>('all');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // New task form state
  const [newTaskType, setNewTaskType] = useState<'restart' | 'wipe' | 'broadcast' | 'backup'>('restart');
  const [newTime, setNewTime] = useState<string>('05:00');
  const [newDayOfWeek, setNewDayOfWeek] = useState<number>(4); // Thursday
  const [newInterval, setNewInterval] = useState<number>(15);
  const [newMessage, setNewMessage] = useState<string>('Дискорд нашего сервера: discord.gg/rustpilot');
  const [newWipeType, setNewWipeType] = useState<'map' | 'full' | 'bp'>('map');

  useEffect(() => {
    if (!isOpen || !serverPath) return;
    loadTasks();
  }, [isOpen, serverPath]);

  const loadTasks = async () => {
    try {
      const loaded = await (window as any).electronAPI?.getScheduledTasks(serverPath);
      if (Array.isArray(loaded)) {
        setTasks(loaded);
      } else {
        // Defaults
        const defaults: ScheduledTask[] = [
          {
            id: 'default_restart',
            serverPath,
            type: 'restart',
            enabled: true,
            time: '05:00'
          },
          {
            id: 'default_wipe',
            serverPath,
            type: 'wipe',
            enabled: false,
            dayOfWeek: 4,
            time: '19:00',
            wipeType: 'map'
          },
          {
            id: 'default_broadcast',
            serverPath,
            type: 'broadcast',
            enabled: true,
            intervalMinutes: 20,
            message: '⭐ Добро пожаловать на наш сервер! Приятной игры и хорошего лута.'
          }
        ];
        setTasks(defaults);
        await (window as any).electronAPI?.saveScheduledTasks(defaults);
      }
    } catch {}
  };

  const handleToggleTask = async (taskId: string, enabled: boolean) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, enabled } : t));
    setTasks(updated);
    sound.playClick();
    await (window as any).electronAPI?.saveScheduledTasks(updated);
  };

  const handleDeleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    sound.playWarning();
    await (window as any).electronAPI?.saveScheduledTasks(updated);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: ScheduledTask = {
      id: `task_${Date.now()}`,
      serverPath,
      type: newTaskType,
      enabled: true,
      time: newTime,
      dayOfWeek: newDayOfWeek,
      intervalMinutes: newInterval,
      message: newMessage,
      wipeType: newWipeType
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    setIsAdding(false);
    sound.playSuccess();
    await (window as any).electronAPI?.saveScheduledTasks(updated);
  };

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) => (activeTab === 'all' ? true : t.type === activeTab));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border-2 border-cyan-500/30 bg-[#050811] shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-[#091122] via-[#050811] to-[#0c162d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] flex items-center justify-center border border-cyan-400/40 shadow-lg shadow-cyan-950/50">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Планировщик задач и автоматизации</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30">
                  CRON
                </span>
              </h2>
              <p className="text-[11px] text-[#94a3b8] font-mono">
                Сервер: <span className="text-white font-bold">{serverName}</span> • Авто-рестарты, вайпы и чат
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tabs & Add Action ── */}
        <div className="px-6 py-3 border-b border-cyan-500/15 bg-[#060b17] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#091122] p-1 rounded-xl border border-cyan-500/20 text-xs font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Все задачи ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('restart')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'restart' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Рестарты
            </button>
            <button
              onClick={() => setActiveTab('wipe')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'wipe' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Вайпы
            </button>
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'broadcast' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Чат
            </button>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] text-white hover:brightness-110 shadow-md border border-cyan-300/40 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить задачу</span>
          </button>
        </div>

        {/* ── Task List / Add Form Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Add Task Form Drawer */}
          {isAdding && (
            <form onSubmit={handleCreateTask} className="p-5 rounded-2xl bg-[#091122] border-2 border-cyan-500/30 space-y-4 animate-in zoom-in-95 duration-150">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                <span>Создание новой автоматической задачи</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Тип задачи
                  </label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-[#00f0ff] font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="restart">🔄 Автоматический рестарт сервера</option>
                    <option value="wipe">☢️ Автоматический вайп (смена сида карты)</option>
                    <option value="broadcast">📢 Авто-сообщение в игровой чат</option>
                    <option value="backup">💾 Авто-бэкап файлов сервера</option>
                  </select>
                </div>

                {(newTaskType === 'restart' || newTaskType === 'wipe') && (
                  <div>
                    <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                      Время выполнения (МСК / Локальное)
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                )}

                {newTaskType === 'wipe' && (
                  <div>
                    <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                      День недели вайпа
                    </label>
                    <select
                      value={newDayOfWeek}
                      onChange={(e) => setNewDayOfWeek(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white focus:outline-none"
                    >
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <option key={idx} value={idx}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newTaskType === 'broadcast' && (
                  <>
                    <div>
                      <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                        Интервал отправки (минут)
                      </label>
                      <input
                        type="number"
                        value={newInterval}
                        onChange={(e) => setNewInterval(parseInt(e.target.value, 10) || 15)}
                        min={1}
                        max={360}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-1">
                        Текст сообщения в чат
                      </label>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Например: Правила сервера на сайте: trp-rust.ru"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-cyan-500/15">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] text-white hover:brightness-110 shadow-md border border-cyan-300/40 cursor-pointer"
                >
                  Сохранить задачу
                </button>
              </div>
            </form>
          )}

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Clock className="w-10 h-10 text-slate-700" />
              <span>Задач в данной категории нет. Нажмите «Добавить задачу», чтобы создать.</span>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isRestart = task.type === 'restart';
              const isWipe = task.type === 'wipe';
              const isBroadcast = task.type === 'broadcast';

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    task.enabled
                      ? 'bg-[#081024] border-cyan-500/30 shadow-lg shadow-cyan-950/20'
                      : 'bg-[#060b17] border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isRestart
                          ? 'bg-blue-500/20 border-blue-500/40 text-[#00f0ff]'
                          : isWipe
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {isRestart ? <RotateCw className="w-5 h-5" /> : isWipe ? <Radio className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-white">
                          {isRestart
                            ? 'Ежедневный авто-рестарт'
                            : isWipe
                            ? 'Плановый вайп сервера'
                            : 'Периодическое сообщение в чат'}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold uppercase ${
                            task.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {task.enabled ? 'АКТИВНО' : 'ОТКЛЮЧЕНО'}
                        </span>
                      </div>

                      <div className="text-xs text-[#94a3b8] font-mono flex items-center gap-2 truncate">
                        {task.time && <span>⏰ Время: <strong className="text-white">{task.time}</strong></span>}
                        {task.dayOfWeek !== undefined && <span>• День: <strong className="text-white">{DAYS_OF_WEEK[task.dayOfWeek]}</strong></span>}
                        {task.intervalMinutes && <span>• Каждые <strong className="text-white">{task.intervalMinutes} мин.</strong></span>}
                        {task.message && <span className="truncate">• «{task.message}»</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Toggle Switch & Delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={task.enabled}
                        onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f0ff]"></div>
                    </label>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Удалить задачу"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
