import React, { useState } from 'react';
import { X, BookOpen, Search, Send, Copy, Check, Terminal, Sparkles, FlaskConical } from 'lucide-react';
import { getCommandCatalog } from '../../data/commandLibrary';

interface CommandLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  framework: string;
  onExecuteCommand: (cmd: string) => void;
  onSelectCommand: (cmd: string) => void;
}

export const CommandLibraryModal: React.FC<CommandLibraryModalProps> = ({
  isOpen,
  onClose,
  framework,
  onExecuteCommand,
  onSelectCommand
}) => {
  const [search, setSearch] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = getCommandCatalog(framework);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.cmd.toLowerCase().includes(search.toLowerCase()) ||
        item.ru.toLowerCase().includes(search.toLowerCase()) ||
        item.en.toLowerCase().includes(search.toLowerCase())
    )
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#2563eb] flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit']">
                Справочник консольных команд сервера
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Полная база серверных команд Rust Vanilla + {framework.toUpperCase()}
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

        {/* Search Toolbar */}
        <div className="p-3 px-5 border-b border-cyan-500/15 bg-black/30 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск команды по названию или описанию (например: reload, save, fps, kick)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
            />
          </div>
        </div>

        {/* Command List Categories */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Команды по запросу «{search}» не найдены
            </div>
          ) : (
            filteredCategories.map((cat, idx) => (
              <div key={idx} className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                  <span>{cat.title}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {cat.items.map((item) => (
                    <div
                      key={item.cmd}
                      className="p-3 rounded-xl glass-card border border-cyan-500/15 hover:border-cyan-400/40 flex flex-col justify-between gap-2 group transition-all bg-[#050811]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#00f0ff] group-hover:text-white transition-colors">
                            {item.cmd} {item.params && <span className="text-[#94a3b8] font-normal">{item.params}</span>}
                          </span>
                          <button
                            onClick={() => handleCopy(item.cmd)}
                            className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                            title="Скопировать команду"
                          >
                            {copiedCmd === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300">{item.ru}</p>
                        <p className="text-[10px] text-[#94a3b8] font-mono">{item.en}</p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-cyan-500/10">
                        <button
                          onClick={() => {
                            onSelectCommand(item.cmd + (item.params ? ' ' : ''));
                            onClose();
                          }}
                          className="flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-[#38bdf8] hover:text-white transition-colors cursor-pointer"
                        >
                          Вставить в консоль
                        </button>
                        <button
                          onClick={() => {
                            onExecuteCommand(item.cmd);
                            onClose();
                          }}
                          className="py-1 px-3 rounded-lg text-[11px] font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00f0ff] border border-cyan-400/30 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Выполнить команду немедленно"
                        >
                          <Send className="w-3 h-3" />
                          <span>Выполнить</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
