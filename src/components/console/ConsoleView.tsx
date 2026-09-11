import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  Send,
  Trash2,
  MessageSquare,
  Terminal as TerminalIcon,
  BookOpen,
  Copy,
  Check,
  Search,
  ListFilter,
  User,
  Shield,
  Zap,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Download,
  ArrowDown,
  Cpu,
  Layers,
  Sparkles,
  Tv
} from 'lucide-react';
import { sound } from '../../services/soundService';

interface ConsoleViewProps {
  serverPath?: string;
  logs: string[];
  chatMessages: string[];
  onSendCommand: (cmd: string) => void;
  onClearLogs: () => void;
  onOpenCommandLibrary: () => void;
  commandInput: string;
  setCommandInput: (val: string) => void;
}

export type LogCategory = 'error' | 'warn' | 'success' | 'loading' | 'rcon' | 'framework' | 'chat' | 'info';

export interface ClassifiedLog {
  category: LogCategory;
  label: string;
  colorClass: string;
  badgeBg: string;
  text: string;
}

const QUICK_COMMANDS = [
  { label: 'fps', cmd: 'fps' },
  { label: 'status', cmd: 'status' },
  { label: 'server.save', cmd: 'server.save' },
  { label: 'players', cmd: 'players' },
  { label: 'plugins', cmd: 'plugins' },
  { label: 'oxide.version', cmd: 'oxide.version' },
  { label: 'carbon.version', cmd: 'carbon.version' }
];

export const classifyLog = (log: string): ClassifiedLog => {
  const lower = log.toLowerCase();

  let cleanText = log
    .replace(/^\[(RCON|ERROR|WARN|WARNING|SUCCESS|STEAMCMD|UPDATER|CARBON|OXIDE|CHAT|ОШИБКА|ВНИМАНИЕ|УСПЕХ|ЗАГРУЗКА|ФРЕЙМВОРК|ЧАТ)\]\s*/i, '')
    .trim();

  if (cleanText.length === 0) cleanText = log;

  if (lower.includes('command line:') || lower.includes('bootstrap tier0')) {
    return {
      category: 'info',
      label: 'ИНФО',
      colorClass: 'text-slate-200 bg-[#070e1c]/80 border-cyan-500/10 hover:border-cyan-500/30',
      badgeBg: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
      text: log
    };
  }

  // 1. ERRORS & EXCEPTIONS
  if (
    log.includes('[ERROR]') ||
    log.includes('[ОШИБКА]') ||
    log.includes('[FATAL]') ||
    log.includes('[CRITICAL]') ||
    log.includes('[STDERR]') ||
    log.includes('Exception:') ||
    log.includes('NullReferenceException') ||
    log.includes('ArgumentNullException') ||
    log.includes('IndexOutOfRangeException') ||
    log.includes('DivideByZeroException') ||
    log.includes('error CS') ||
    lower.includes('failed to compile') ||
    lower.includes('failed to initialize') ||
    lower.includes('error while compiling') ||
    lower.includes('invalidoperationexception') ||
    lower.includes('socketexception') ||
    lower.includes('crash') ||
    lower.includes('stacktrace:') ||
    lower.includes('shader error')
  ) {
    return {
      category: 'error',
      label: 'ОШИБКА',
      colorClass: 'text-red-200 bg-red-950/30 border-red-500/40 hover:border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.15)]',
      badgeBg: 'bg-red-500/25 text-red-300 border border-red-500/50',
      text: cleanText
    };
  }

  // 2. WARNINGS
  if (
    log.includes('[WARN]') ||
    log.includes('[WARNING]') ||
    log.includes('[ВНИМАНИЕ]') ||
    lower.includes('warning') ||
    lower.includes('deprecated') ||
    lower.includes('already exists') ||
    lower.includes('timed out') ||
    lower.includes('slow response')
  ) {
    return {
      category: 'warn',
      label: 'ВНИМАНИЕ',
      colorClass: 'text-amber-200 bg-amber-950/30 border-amber-500/40 hover:border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
      badgeBg: 'bg-amber-500/25 text-amber-300 border border-amber-500/50',
      text: cleanText
    };
  }

  // 3. SUCCESS / SAVED / COMPILED
  if (
    log.includes('[SUCCESS]') ||
    log.includes('[УСПЕХ]') ||
    lower.includes('successfully') ||
    lower.includes('saved ') ||
    lower.includes('server startup complete') ||
    lower.includes('compiled successfully') ||
    lower.includes('loaded plugin') ||
    lower.includes('connected to steam')
  ) {
    return {
      category: 'success',
      label: 'УСПЕХ',
      colorClass: 'text-emerald-200 bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
      badgeBg: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50',
      text: cleanText
    };
  }

  // 4. DOWNLOADING / UPDATES / STEAMCMD
  if (
    log.includes('[STEAMCMD]') ||
    log.includes('[UPDATER]') ||
    log.includes('[ЗАГРУЗКА]') ||
    log.includes('[SMART UPDATER]') ||
    lower.includes('downloading') ||
    lower.includes('progress:') ||
    lower.includes('update state') ||
    lower.includes('extracting') ||
    lower.includes('validating') ||
    lower.includes('installing') ||
    lower.includes('steam console client') ||
    lower.includes('checking for updates')
  ) {
    return {
      category: 'loading',
      label: 'ЗАГРУЗКА',
      colorClass: 'text-cyan-200 bg-cyan-950/30 border-cyan-500/40 hover:border-cyan-500/60 shadow-[0_0_10px_rgba(0,240,255,0.15)]',
      badgeBg: 'bg-cyan-500/25 text-[#00f0ff] border border-cyan-500/50',
      text: cleanText
    };
  }

  // 5. FRAMEWORK (CARBON / OXIDE)
  if (
    log.includes('[CARBON]') ||
    log.includes('[OXIDE]') ||
    log.includes('[ФРЕЙМВОРК]') ||
    lower.includes('carbon.') ||
    lower.includes('oxide.') ||
    lower.includes('umod') ||
    lower.includes('harmony')
  ) {
    return {
      category: 'framework',
      label: 'ФРЕЙМВОРК',
      colorClass: 'text-purple-200 bg-purple-950/30 border-purple-500/40 hover:border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
      badgeBg: 'bg-purple-500/25 text-purple-300 border border-purple-500/50',
      text: cleanText
    };
  }

  // 6. RCON & PROCESSES
  if (
    log.includes('[RCON]') ||
    log.includes('[PROCESS]') ||
    log.startsWith('> ') ||
    lower.includes('rcon:') ||
    lower.includes('rcon онлайн')
  ) {
    return {
      category: 'rcon',
      label: 'RCON',
      colorClass: 'text-blue-200 bg-blue-950/30 border-blue-500/40 hover:border-blue-500/60',
      badgeBg: 'bg-blue-500/25 text-blue-300 border border-blue-500/50',
      text: cleanText
    };
  }

  // 7. IN-GAME CHAT
  if (
    log.includes('[CHAT]') ||
    log.includes('[Chat]') ||
    log.includes('[ЧАТ]') ||
    lower.includes('[team]') ||
    lower.includes('say:') ||
    lower.includes('[pm]')
  ) {
    return {
      category: 'chat',
      label: 'ЧАТ',
      colorClass: 'text-sky-200 bg-sky-950/30 border-sky-500/40 hover:border-sky-500/60',
      badgeBg: 'bg-sky-500/25 text-sky-300 border border-sky-500/50',
      text: cleanText
    };
  }

  // 8. GENERAL INFO
  return {
    category: 'info',
    label: 'ИНФО',
    colorClass: 'text-slate-200 bg-[#070e1c]/80 border-cyan-500/10 hover:border-cyan-500/30',
    badgeBg: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    text: log
  };
};

export const formatTerminalLine = (log: string): string => {
  if (log.startsWith('==') || log.startsWith('--') || log.includes('\x1b[')) {
    return log;
  }

  const item = classifyLog(log);
  
  switch (item.category) {
    case 'error':
      return `\x1b[1;97;41m [ОШИБКА] \x1b[0m \x1b[1;91m${item.text}\x1b[0m`;
    case 'warn':
      return `\x1b[1;30;43m [ВНИМАНИЕ] \x1b[0m \x1b[1;93m${item.text}\x1b[0m`;
    case 'success':
      return `\x1b[1;30;42m [УСПЕХ] \x1b[0m \x1b[1;92m${item.text}\x1b[0m`;
    case 'loading':
      return `\x1b[1;30;46m [ЗАГРУЗКА] \x1b[0m \x1b[1;96m${item.text}\x1b[0m`;
    case 'framework':
      return `\x1b[1;97;45m [ФРЕЙМВОРК] \x1b[0m \x1b[1;95m${item.text}\x1b[0m`;
    case 'rcon':
      return `\x1b[1;30;44m [RCON] \x1b[0m \x1b[1;94m${item.text}\x1b[0m`;
    case 'chat':
      return `\x1b[1;30;47m [ЧАТ] \x1b[0m \x1b[1;37m${item.text}\x1b[0m`;
    default:
      return `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m ${item.text}`;
  }
};

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  serverPath,
  logs,
  chatMessages,
  onSendCommand,
  onClearLogs,
  onOpenCommandLibrary,
  commandInput,
  setCommandInput
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<'terminal' | 'rich' | 'chat'>('terminal');
  const [filterCategory, setFilterCategory] = useState<LogCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [crtEnabled, setCrtEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rustpilot_crt_enabled') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCrt = () => {
    const next = !crtEnabled;
    setCrtEnabled(next);
    sound.playClick();
    try {
      localStorage.setItem('rustpilot_crt_enabled', next ? 'true' : 'false');
    } catch {}
  };

  const lastLogCountRef = useRef<number>(0);

  useEffect(() => {
    if (!terminalRef.current) return;

    const initXterm = () => {
      if (xtermInstance.current) {
        xtermInstance.current.dispose();
      }

      const term = new XTerminal({
        theme: {
          background: '#030611',
          foreground: '#f8fafc',
          cursor: '#00f0ff',
          selectionBackground: 'rgba(0, 240, 255, 0.3)',
          black: '#0a1122',
          red: '#f43f5e',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#00f0ff',
          white: '#ffffff',
          brightBlack: '#475569',
          brightRed: '#fb7185',
          brightGreen: '#34d399',
          brightYellow: '#fbbf24',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#38bdf8',
          brightWhite: '#ffffff'
        },
        fontFamily: "'Consolas', 'JetBrains Mono', 'Courier New', monospace",
        fontSize: 12,
        lineHeight: 1.35,
        cursorBlink: true,
        scrollback: 5000,
        convertEol: true,
        allowTransparency: true
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      // Support native Ctrl+C copying of selected text
      term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C' || event.code === 'KeyC')) {
          if (term.hasSelection()) {
            const selectedText = term.getSelection();
            if (selectedText) {
              navigator.clipboard.writeText(selectedText);
              return false; // Prevent sending terminal signal \x03, perform copy
            }
          }
        }
        return true;
      });

      term.open(terminalRef.current!);
      fitAddon.fit();

      xtermInstance.current = term;
      fitAddonRef.current = fitAddon;

      term.writeln('\x1b[1;36m================================================================================\x1b[0m');
      term.writeln('\x1b[1;36m  TRP LABS :: RUSTPILOT COBALT RESEARCH TERMINAL v2.0\x1b[0m');
      term.writeln('\x1b[90m  Интерактивная консоль RCON, мониторинг логов и чата активны\x1b[0m');
      term.writeln('\x1b[1;36m================================================================================\x1b[0m\r\n');

      logs.forEach((log) => {
        term.writeln(formatTerminalLine(log));
      });
      lastLogCountRef.current = logs.length;
    };

    initXterm();

    const handleResize = () => {
      try {
        fitAddonRef.current?.fit();
      } catch {}
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        xtermInstance.current?.dispose();
      } catch {}
    };
  }, []);

  const lastServerPathRef = useRef<string | undefined>(serverPath);

  useEffect(() => {
    if (!xtermInstance.current) return;

    // Reset and print fresh logs when viewing a different server
    if (serverPath !== lastServerPathRef.current) {
      lastServerPathRef.current = serverPath;
      xtermInstance.current.clear();
      logs.forEach((log) => {
        xtermInstance.current?.writeln(formatTerminalLine(log));
      });
      lastLogCountRef.current = logs.length;
      if (autoScroll) {
        xtermInstance.current.scrollToBottom();
      }
      return;
    }

    if (logs.length > lastLogCountRef.current) {
      const newLogs = logs.slice(lastLogCountRef.current);
      newLogs.forEach((log) => {
        xtermInstance.current?.writeln(formatTerminalLine(log));
      });
      lastLogCountRef.current = logs.length;
      if (autoScroll) {
        xtermInstance.current.scrollToBottom();
      }
    } else if (logs.length < lastLogCountRef.current) {
      xtermInstance.current.clear();
      logs.forEach((log) => {
        xtermInstance.current?.writeln(formatTerminalLine(log));
      });
      lastLogCountRef.current = logs.length;
    }
  }, [logs, serverPath, autoScroll]);

  useEffect(() => {
    if (autoScroll) {
      if (viewMode === 'rich') {
        logEndRef.current?.scrollIntoView({ behavior: 'auto' });
      } else if (viewMode === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [logs, chatMessages, viewMode, autoScroll]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    sound.playClick();
    if (viewMode === 'chat' && !cmd.startsWith('say ') && !cmd.startsWith('global.say ') && !cmd.startsWith('chat.')) {
      onSendCommand(`say "${cmd}"`);
    } else {
      onSendCommand(cmd);
    }

    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommandInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex + 1 < commandHistory.length ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIdx);
      setCommandInput(commandHistory[commandHistory.length - 1 - nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommandInput(commandHistory[commandHistory.length - 1 - nextIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  const handleCopyLogs = () => {
    const textToCopy = viewMode === 'chat' ? chatMessages.join('\n') : logs.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { counts, filteredLogs } = useMemo(() => {
    let err = 0;
    let warn = 0;
    let succ = 0;
    let load = 0;
    let rcon = 0;
    const filtered: string[] = [];
    const query = searchQuery ? searchQuery.toLowerCase() : '';

    for (let i = 0; i < logs.length; i++) {
      const line = logs[i];
      const item = classifyLog(line);

      if (item.category === 'error') err++;
      else if (item.category === 'warn') warn++;
      else if (item.category === 'success') succ++;
      else if (item.category === 'loading') load++;
      else if (item.category === 'rcon') rcon++;

      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchesSearch = !query || line.toLowerCase().includes(query);

      if (matchesCategory && matchesSearch) {
        filtered.push(line);
      }
    }

    return {
      counts: {
        error: err,
        warn: warn,
        success: succ,
        loading: load,
        rcon: rcon
      },
      filteredLogs: filtered
    };
  }, [logs, filterCategory, searchQuery]);

  const errorCount = counts.error;
  const warnCount = counts.warn;
  const successCount = counts.success;
  const loadingCount = counts.loading;
  const rconCount = counts.rcon;

  return (
    <div className="h-full flex flex-col gap-2">
      {/* ── Console Header & Mode Switcher ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1 bg-[#060b17]/90 p-1 rounded-xl border border-cyan-500/20 shadow-lg">
          <button
            onClick={() => setViewMode('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'terminal'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-[#00f0ff] border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Интерактивный терминал с подсветкой и бейджами ошибок"
          >
            <TerminalIcon className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Терминал</span>
          </button>

          <button
            onClick={() => setViewMode('rich')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'rich'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-[#00f0ff] border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Структурированный лог с бейджами [ОШИБКА], [УСПЕХ], [ЗАГРУЗКА] и фильтрами"
          >
            <ListFilter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Форматированный лог ({logs.length})</span>
          </button>

          <button
            onClick={() => setViewMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'chat'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-[#00f0ff] border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Живой чат игроков сервера в реальном времени"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Игровой Чат</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] text-[#00f0ff] font-mono font-bold">
              {chatMessages.length}
            </span>
          </button>
        </div>

        {/* Center: Filter Category Tabs (Only in Rich Mode) */}
        {viewMode === 'rich' && (
          <div className="flex items-center gap-1 bg-[#060b17]/90 p-1 rounded-xl border border-cyan-500/20 text-[11px] font-bold overflow-x-auto shadow-lg">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${filterCategory === 'all' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30 shadow-[0_0_8px_rgba(0,240,255,0.2)]' : 'text-slate-400 hover:text-white'}`}
            >
              Все ({logs.length})
            </button>
            <button
              onClick={() => setFilterCategory('error')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${filterCategory === 'error' ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50' : 'text-rose-400/80 hover:text-rose-300'}`}
            >
              <XCircle className="w-3 h-3" /> Ошибки ({errorCount})
            </button>
            <button
              onClick={() => setFilterCategory('warn')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${filterCategory === 'warn' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50' : 'text-amber-400/80 hover:text-amber-300'}`}
            >
              <AlertTriangle className="w-3 h-3" /> Варнинги ({warnCount})
            </button>
            <button
              onClick={() => setFilterCategory('success')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${filterCategory === 'success' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50' : 'text-emerald-400/80 hover:text-emerald-300'}`}
            >
              <CheckCircle2 className="w-3 h-3" /> Успех ({successCount})
            </button>
            <button
              onClick={() => setFilterCategory('loading')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${filterCategory === 'loading' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50' : 'text-cyan-400/80 hover:text-cyan-300'}`}
            >
              <Download className="w-3 h-3" /> Загрузки ({loadingCount})
            </button>
            <button
              onClick={() => setFilterCategory('rcon')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${filterCategory === 'rcon' ? 'bg-blue-500/25 text-blue-300 border border-blue-500/50' : 'text-blue-400/80 hover:text-blue-300'}`}
            >
              RCON ({rconCount})
            </button>
          </div>
        )}

        {/* Right: Search, AutoScroll, Clear, Copy */}
        <div className="flex items-center gap-1.5">
          {viewMode === 'rich' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по логам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded-xl bg-[#060b17] border border-cyan-500/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff] w-36 sm:w-48 transition-all"
              />
            </div>
          )}

          {/* CRT Monitor Filter Toggle */}
          <button
            onClick={toggleCrt}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              crtEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-[#060b17] text-slate-400 border-cyan-500/10 hover:text-white'
            }`}
            title="Включить/выключить ретро-кибер фильтр CRT сканлайнов"
          >
            <Tv className={`w-3.5 h-3.5 ${crtEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">CRT</span>
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              autoScroll
                ? 'bg-cyan-500/15 text-[#00f0ff] border-cyan-500/30'
                : 'bg-[#060b17] text-slate-400 border-cyan-500/10 hover:text-white'
            }`}
            title="Автоматическая прокрутка вниз при новых сообщениях"
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'text-[#00f0ff]' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Авто-скролл</span>
          </button>

          <button
            onClick={onOpenCommandLibrary}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer"
            title="Открыть справочник всех команд Rust"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span className="hidden sm:inline">Справочник</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-[#060b17] hover:bg-cyan-500/15 hover:text-white border border-cyan-500/20 transition-all cursor-pointer"
            title="Скопировать все логи в буфер обмена"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Скопировано' : 'Копия'}</span>
          </button>

          <button
            onClick={onClearLogs}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#060b17] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-cyan-500/15 hover:border-rose-500/30 transition-all cursor-pointer"
            title="Очистить терминал и логи"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Quick Command Pills Strip ── */}
      <div className="flex items-center gap-1.5 flex-wrap px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400/80 font-mono flex items-center gap-1 mr-1">
          <Zap className="w-3 h-3 text-[#00f0ff]" /> Команды:
        </span>
        {QUICK_COMMANDS.map((qc) => (
          <button
            key={qc.cmd}
            onClick={() => onSendCommand(qc.cmd)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#060b17]/90 hover:bg-cyan-500/20 text-slate-300 hover:text-[#00f0ff] border border-cyan-500/20 hover:border-cyan-400/40 transition-all cursor-pointer shadow-sm"
          >
            {qc.label}
          </button>
        ))}
      </div>

      {/* ── Main View Area (Terminal / Rich / Chat) ── */}
      <div className={`flex-1 min-h-0 rounded-2xl glass-panel relative overflow-hidden border border-cyan-500/25 p-1 shadow-2xl transition-all ${crtEnabled ? 'crt-scanlines' : ''}`}>
        {/* Terminal Mode (XTerm.js) */}
        <div className={`h-full w-full p-2.5 overflow-hidden ${viewMode === 'terminal' ? 'block' : 'hidden'}`}>
          <div ref={terminalRef} className="h-full w-full" />
        </div>

        {/* Rich Formatted Log Mode */}
        {viewMode === 'rich' && (
          <div className="h-full w-full overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs">
                Логи не найдены или очищены.
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const item = classifyLog(log);
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all ${item.colorClass}`}
                  >
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wider shrink-0 font-mono ${item.badgeBg}`}>
                      {item.label}
                    </span>
                    <span className="flex-1 leading-relaxed break-words font-medium select-text">
                      {item.text}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        )}

        {/* Live Chat Mode */}
        {viewMode === 'chat' && (
          <div className="h-full w-full overflow-y-auto p-3 space-y-2 font-sans text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
                <MessageSquare className="w-8 h-8 text-slate-600 mb-1" />
                <span className="font-bold">Игровой чат пуст</span>
                <span className="text-[11px] text-slate-600">Сообщения игроков появятся здесь при активности на сервере</span>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isServerMsg = msg.toLowerCase().includes('server') || msg.toLowerCase().includes('сервер');
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                      isServerMsg
                        ? 'bg-amber-950/25 border-amber-500/30 text-amber-200'
                        : 'bg-cyan-950/25 border-cyan-500/30 text-cyan-100'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                      {isServerMsg ? <Shield className="w-3.5 h-3.5 text-amber-400" /> : <User className="w-3.5 h-3.5 text-[#00f0ff]" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400 mb-0.5 flex items-center justify-between">
                        <span>{isServerMsg ? 'Оповещение Сервера' : 'Игрок'}</span>
                        <span className="font-mono text-slate-500">#{idx + 1}</span>
                      </div>
                      <div className="leading-relaxed break-words font-medium">{msg}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ── Advanced Cyber Command Input Bar ── */}
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-1 shrink-0">
        <div className="flex-1 relative flex items-center">
          {/* Cyber Prompt Badge */}
          <div className="absolute left-2.5 flex items-center gap-1.5 pointer-events-none select-none">
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-[#00f0ff] font-mono font-black text-[10px] border border-cyan-400/40 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
              TRP &gt;
            </span>
          </div>

          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              viewMode === 'chat'
                ? 'Отправить сообщение в чат от имени сервера (say "...") или команду...'
                : 'Введите RCON команду (например: status, fps, server.save, say Привет, kick, ban)...'
            }
            className="w-full pl-20 pr-32 py-2.5 rounded-xl bg-[#060b17]/95 border-2 border-cyan-500/30 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff] focus:shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all shadow-inner"
          />

          {/* Keyboard Hint Pill */}
          <div className="absolute right-3 text-[10px] font-mono text-slate-400 uppercase hidden md:flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[9px]">Enter ↵</span>
            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[9px]">↑↓ История</span>
          </div>
        </div>

        {/* Send Action Button */}
        <button
          type="submit"
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-[#00f0ff] via-[#38bdf8] to-[#0284c7] hover:brightness-110 text-black shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5 fill-black" />
          <span>{viewMode === 'chat' ? 'В чат' : 'Отправить'}</span>
        </button>
      </form>
    </div>
  );
};
