import React, { useState, useEffect } from 'react';
import {
  X,
  FileCode,
  Save,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  FolderOpen,
  Layers,
  Code2,
  RefreshCw
} from 'lucide-react';
import { sound } from '../../services/soundService';

interface ConfigItem {
  id: string;
  name: string;
  pluginName: string;
  category: 'config' | 'data' | 'server_cfg';
  framework: 'oxide' | 'carbon' | 'rust';
  fullPath: string;
  relativePath: string;
  size: number;
  modified: number;
}

interface PluginConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverPath: string;
  framework: string;
  onSendCommand: (cmd: string) => void;
}

export const PluginConfigModal: React.FC<PluginConfigModalProps> = ({
  isOpen,
  onClose,
  serverPath,
  framework,
  onSendCommand
}) => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'config' | 'data' | 'server_cfg'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !serverPath) return;
    loadConfigFiles();
  }, [isOpen, serverPath]);

  const loadConfigFiles = async () => {
    setIsLoading(true);
    try {
      const items = await (window as any).electronAPI?.listPluginConfigs(serverPath);
      if (Array.isArray(items)) {
        setConfigs(items);
        if (items.length > 0 && !selectedConfig) {
          selectFile(items[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectFile = async (item: ConfigItem) => {
    setSelectedConfig(item);
    setJsonError(null);
    setStatusMessage(null);
    try {
      const content = await (window as any).electronAPI?.readFile(item.fullPath);
      setFileContent(content || '');
      setOriginalContent(content || '');
      validateJson(content || '', item.name);
    } catch (err: any) {
      setFileContent(`// Ошибка чтения файла: ${err.message}`);
    }
  };

  const validateJson = (text: string, fileName: string) => {
    if (!fileName.endsWith('.json')) {
      setJsonError(null);
      return true;
    }
    try {
      JSON.parse(text);
      setJsonError(null);
      return true;
    } catch (e: any) {
      setJsonError(e.message);
      return false;
    }
  };

  const handleContentChange = (val: string) => {
    setFileContent(val);
    if (selectedConfig) {
      validateJson(val, selectedConfig.name);
    }
  };

  const handleFormatJson = () => {
    if (!selectedConfig || !selectedConfig.name.endsWith('.json')) return;
    try {
      const parsed = JSON.parse(fileContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setFileContent(formatted);
      setJsonError(null);
      sound.playSuccess();
      setStatusMessage({ type: 'success', text: 'JSON успешно отформатирован' });
    } catch (e: any) {
      setJsonError(e.message);
      sound.playError();
      setStatusMessage({ type: 'error', text: `Ошибка форматирования: ${e.message}` });
    }
  };

  const handleSaveAndReload = async () => {
    if (!selectedConfig) return;

    if (selectedConfig.name.endsWith('.json')) {
      const isValid = validateJson(fileContent, selectedConfig.name);
      if (!isValid) {
        sound.playError();
        setStatusMessage({ type: 'error', text: 'Невозможно сохранить: исправьте ошибки в синтаксисе JSON!' });
        return;
      }
    }

    setIsSaving(true);
    sound.playClick();
    try {
      await (window as any).electronAPI?.writeFile(selectedConfig.fullPath, fileContent);
      setOriginalContent(fileContent);

      // Auto Hot-Reload plugin via RCON
      let reloadCmd = '';
      if (selectedConfig.category === 'server_cfg') {
        reloadCmd = 'server.readcfg';
      } else if (selectedConfig.framework === 'carbon') {
        reloadCmd = `carbon.reload ${selectedConfig.pluginName}`;
      } else {
        reloadCmd = `oxide.reload ${selectedConfig.pluginName}`;
      }

      onSendCommand(reloadCmd);
      sound.playSuccess();
      setStatusMessage({
        type: 'success',
        text: `Файл сохранён! Отправлена команда: ${reloadCmd}`
      });
    } catch (err: any) {
      sound.playError();
      setStatusMessage({ type: 'error', text: `Ошибка сохранения: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const filteredConfigs = configs.filter((c) => {
    if (activeCategory !== 'all' && c.category !== activeCategory) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.pluginName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const isDirty = fileContent !== originalContent;
  const lineCount = fileContent.split('\n').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[88vh] flex flex-col rounded-3xl border-2 border-cyan-500/30 bg-[#050811] shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-[#091122] via-[#050811] to-[#0c162d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] flex items-center justify-center border border-cyan-400/40 shadow-lg shadow-cyan-950/50">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Редактор конфигураций JSON</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30">
                  HOT-RELOAD
                </span>
              </h2>
              <p className="text-[11px] text-[#94a3b8] font-mono">
                Прямое редактирование конфигов плагинов с авто-перезагрузкой на сервере
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

        {/* ── Main Workspace Body ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: File Browser & Search */}
          <div className="w-80 border-r border-cyan-500/20 bg-[#060b17] flex flex-col shrink-0">
            {/* Search Box */}
            <div className="p-3 border-b border-cyan-500/15 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск плагина или конфига..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#091122] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-bold">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    activeCategory === 'all' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Все ({configs.length})
                </button>
                <button
                  onClick={() => setActiveCategory('config')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    activeCategory === 'config' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Конфиги
                </button>
                <button
                  onClick={() => setActiveCategory('data')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    activeCategory === 'data' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Data
                </button>
                <button
                  onClick={() => setActiveCategory('server_cfg')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    activeCategory === 'server_cfg' ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  server.cfg
                </button>
              </div>
            </div>

            {/* Configs List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">Сканирование директорий...</div>
              ) : filteredConfigs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">Конфигурационные файлы не найдены</div>
              ) : (
                filteredConfigs.map((item) => {
                  const isSelected = selectedConfig?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectFile(item)}
                      className={`w-full p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-cyan-400 text-white shadow-md'
                          : 'bg-[#091122] border-cyan-500/10 text-slate-300 hover:bg-cyan-500/10 hover:border-cyan-500/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#00f0ff]' : 'text-slate-100'}`}>
                          {item.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            item.framework === 'carbon'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : item.framework === 'oxide'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.framework}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{item.relativePath}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Editor Pane */}
          <div className="flex-1 flex flex-col bg-[#040711] overflow-hidden">
            {selectedConfig ? (
              <>
                {/* Editor Action Header */}
                <div className="px-5 py-2.5 border-b border-cyan-500/20 bg-[#070e1c] flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-white truncate">{selectedConfig.name}</span>
                    {isDirty && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        Не сохранено *
                      </span>
                    )}

                    {/* JSON Validity Badge */}
                    {selectedConfig.name.endsWith('.json') && (
                      jsonError ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Ошибка JSON
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> JSON Валиден
                        </span>
                      )
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2">
                    {selectedConfig.name.endsWith('.json') && (
                      <button
                        onClick={handleFormatJson}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                        title="Выровнять и отформатировать JSON с отступами"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Форматировать</span>
                      </button>
                    )}

                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0a1122] hover:bg-white/10 text-slate-300 text-xs border border-cyan-500/20 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Скопировано' : 'Копия'}</span>
                    </button>

                    <button
                      onClick={handleSaveAndReload}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] text-white hover:brightness-110 shadow-lg shadow-cyan-950/50 border border-cyan-300/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Сохранение...' : 'Сохранить и Перезагрузить'}</span>
                    </button>
                  </div>
                </div>

                {/* Status Alert Banner */}
                {statusMessage && (
                  <div
                    className={`px-4 py-2 text-xs flex items-center gap-2 font-mono ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-950/40 text-emerald-300 border-b border-emerald-500/30'
                        : 'bg-red-950/40 text-red-300 border-b border-red-500/30'
                    }`}
                  >
                    {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{statusMessage.text}</span>
                  </div>
                )}

                {/* Editor Textarea with Line Numbers */}
                <div className="flex-1 flex overflow-hidden relative">
                  <div className="w-12 bg-[#02050b] border-r border-cyan-500/10 py-3 select-none text-right pr-2 text-slate-600 font-mono text-xs leading-relaxed overflow-hidden">
                    {Array.from({ length: Math.min(lineCount, 500) }).map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  <textarea
                    value={fileContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    spellCheck={false}
                    className="flex-1 h-full p-3 bg-transparent text-[#e2e8f0] font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-cyan-500/30"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 font-mono">
                <FileCode className="w-12 h-12 text-slate-700" />
                <span>Выберите конфигурационный файл из списка слева</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
