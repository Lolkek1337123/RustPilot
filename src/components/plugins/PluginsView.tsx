import React, { useState, useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import {
  Code2,
  FileCode,
  Save,
  RotateCw,
  FolderPlus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Store,
  ShieldCheck,
  XCircle,
  AlertCircle,
  FlaskConical
} from 'lucide-react';
import { ModFramework } from '../../types';
import { PluginStoreTab } from './PluginStoreTab';
import { PermissionsTab } from './PermissionsTab';

interface PluginsViewProps {
  serverPath: string;
  framework: ModFramework;
  onReloadPlugin: (pluginName: string) => void;
}

interface FileItem {
  name: string;
  relativePath: string;
  fullPath: string;
  isDir: boolean;
}

interface CompilerErrorItem {
  serverPath: string;
  pluginName: string;
  line: number;
  column: number;
  errorCode: string;
  message: string;
}

export const PluginsView: React.FC<PluginsViewProps> = ({
  serverPath,
  framework,
  onReloadPlugin
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'ide' | 'store' | 'permissions'>('ide');
  const [activeFolder, setActiveFolder] = useState<'plugins' | 'configs'>('plugins');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Compiler errors list
  const [compilerErrors, setCompilerErrors] = useState<CompilerErrorItem[]>([]);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const getSubfolderPath = () => {
    const isCarbon = framework.startsWith('carbon');
    const rootModDir = isCarbon ? 'carbon' : 'oxide';
    return activeFolder === 'plugins' ? `${rootModDir}/plugins` : `${rootModDir}/${isCarbon ? 'configs' : 'config'}`;
  };

  const loadFiles = async () => {
    if (!serverPath) return;
    try {
      const sub = getSubfolderPath();
      const list = await (window as any).electronAPI?.listFiles(serverPath, sub);
      if (Array.isArray(list)) {
        setFiles(list);
        if (list.length > 0 && !selectedFile) {
          handleSelectFile(list[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [serverPath, framework, activeFolder]);

  // Listen to compiler errors from ProcessService
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onCompilerError) return;

    const unErr = api.onCompilerError((errData: CompilerErrorItem) => {
      if (errData.serverPath === serverPath) {
        setCompilerErrors((prev) => [...prev.slice(-10), errData]);
      }
    });

    return () => {
      if (unErr) unErr();
    };
  }, [serverPath]);

  // Update Monaco markers whenever selected file or compilerErrors change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !selectedFile) return;

    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    const currentPluginName = selectedFile.name.replace('.cs', '').toLowerCase();
    const relevantErrors = compilerErrors.filter(
      (e) => e.pluginName.toLowerCase() === currentPluginName
    );

    const markers = relevantErrors.map((e) => ({
      startLineNumber: e.line,
      startColumn: e.column,
      endLineNumber: e.line,
      endColumn: e.column + 10,
      message: `[${e.errorCode}] ${e.message}`,
      severity: monaco.MarkerSeverity.Error
    }));

    monaco.editor.setModelMarkers(model, 'csharp-compiler', markers);
  }, [selectedFile, compilerErrors]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const handleSelectFile = async (file: FileItem) => {
    setSelectedFile(file);
    try {
      const content = await (window as any).electronAPI?.readFile(file.fullPath);
      setFileContent(content || '');
      setIsSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      await (window as any).electronAPI?.writeFile(selectedFile.fullPath, fileContent);
      setIsSaved(true);
      setSaveStatus('Файл успешно сохранен');

      // Auto-reload if it's a plugin
      if (selectedFile.name.endsWith('.cs')) {
        const pluginName = selectedFile.name.replace('.cs', '');
        onReloadPlugin(pluginName);
        setSaveStatus(`Сохранено & Перезагружен плагин ${pluginName}`);
      }

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Ошибка сохранения: ${err.message}`);
    }
  };

  const getEditorLanguage = () => {
    if (!selectedFile) return 'csharp';
    if (selectedFile.name.endsWith('.json')) return 'json';
    if (selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.cfg')) return 'plaintext';
    return 'csharp';
  };

  const jumpToError = (line: number, col: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: col });
      editorRef.current.focus();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#050811] text-slate-200 select-none">
      {/* View Switcher Tabs Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a1122]/90 border-b border-cyan-500/20">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveViewTab('ide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'ide'
                ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 shadow-md'
                : 'bg-cyan-500/5 text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Monaco IDE Редактор</span>
          </button>

          <button
            onClick={() => setActiveViewTab('store')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'store'
                ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 shadow-md'
                : 'bg-cyan-500/5 text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Маркетплейс</span>
          </button>

          <button
            onClick={() => setActiveViewTab('permissions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'permissions'
                ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 shadow-md'
                : 'bg-cyan-500/5 text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Права и Группы (GUI)</span>
          </button>
        </div>

        {activeViewTab === 'ide' && (
          <div className="flex items-center gap-2">
            {saveStatus && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saveStatus}
              </span>
            )}

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md border border-cyan-300/30 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить (Ctrl+S)</span>
            </button>
          </div>
        )}
      </div>

      {/* Render Active View */}
      {activeViewTab === 'store' && (
        <div className="flex-1 overflow-hidden">
          <PluginStoreTab
            serverPath={serverPath}
            framework={framework}
            onPluginStateChanged={loadFiles}
          />
        </div>
      )}

      {activeViewTab === 'permissions' && (
        <div className="flex-1 overflow-hidden">
          <PermissionsTab serverPath={serverPath} framework={framework} />
        </div>
      )}

      {activeViewTab === 'ide' && (
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-64 border-r border-cyan-500/15 bg-[#0a1122] flex flex-col shrink-0">
            {/* Folder Toggle (plugins vs configs) */}
            <div className="p-2 border-b border-cyan-500/15 flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveFolder('plugins');
                  setSelectedFile(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                  activeFolder === 'plugins'
                    ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30'
                    : 'text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
                }`}
              >
                Плагины (.cs)
              </button>
              <button
                onClick={() => {
                  setActiveFolder('configs');
                  setSelectedFile(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                  activeFolder === 'configs'
                    ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/30'
                    : 'text-[#94a3b8] hover:text-white hover:bg-cyan-500/10'
                }`}
              >
                Конфиги (.json)
              </button>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {files.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  В папке пока нет файлов
                </div>
              ) : (
                files.map((file) => {
                  const isSel = selectedFile?.fullPath === file.fullPath;
                  const isCs = file.name.endsWith('.cs');
                  const pluginBase = file.name.replace('.cs', '').toLowerCase();
                  const hasErrors = compilerErrors.some((e) => e.pluginName.toLowerCase() === pluginBase);

                  return (
                    <button
                      key={file.fullPath}
                      onClick={() => handleSelectFile(file)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        isSel
                          ? 'bg-cyan-500/20 text-[#00f0ff] border border-cyan-400/40 font-bold'
                          : 'text-slate-300 hover:bg-cyan-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate mr-1">
                        {isCs ? (
                          <FileCode className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                        )}
                        <span className="truncate">{file.name}</span>
                      </div>

                      {hasErrors && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Есть ошибки компиляции" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Monaco Code Editor & Error Bottom Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#050811]">
            <div className="flex-1 overflow-hidden relative">
              {selectedFile ? (
                <Editor
                  height="100%"
                  language={getEditorLanguage()}
                  theme="vs-dark"
                  value={fileContent}
                  onChange={(val) => {
                    setFileContent(val || '');
                    setIsSaved(false);
                  }}
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    automaticLayout: true,
                    tabSize: 4
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Выберите файл в дереве слева для редактирования
                </div>
              )}
            </div>

            {/* Compilation Errors Diagnostics Bottom Tray */}
            {compilerErrors.length > 0 && (
              <div className="h-28 border-t border-red-500/30 bg-[#0a0d14] flex flex-col shrink-0">
                <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between text-[11px] font-bold text-red-300">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Ошибки компиляции C# ({compilerErrors.length})</span>
                  </div>
                  <button
                    onClick={() => setCompilerErrors([])}
                    className="text-slate-400 hover:text-white text-[10px] cursor-pointer"
                  >
                    Очистить список
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-mono">
                  {compilerErrors.map((err, idx) => (
                    <div
                      key={idx}
                      onClick={() => jumpToError(err.line, err.column)}
                      className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-200 cursor-pointer flex items-center justify-between text-[11px] transition-colors"
                    >
                      <div className="truncate mr-2">
                        <span className="text-amber-400 font-bold">[{err.pluginName}.cs] </span>
                        <span className="text-red-400 font-bold">{err.errorCode}: </span>
                        <span>{err.message}</span>
                      </div>
                      <span className="text-slate-400 shrink-0">
                        Строка {err.line}, Кол {err.column}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
