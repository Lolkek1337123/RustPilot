import React from 'react';
import { X, Code2 } from 'lucide-react';
import { PluginsView } from '../plugins/PluginsView';
import { ModFramework } from '../../types';

interface PluginsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverPath: string;
  framework: ModFramework;
  onReloadPlugin: (pluginName: string) => void;
}

export const PluginsModal: React.FC<PluginsModalProps> = ({
  isOpen,
  onClose,
  serverPath,
  framework,
  onReloadPlugin
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-6xl h-[88vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[#00f0ff]" />
            <span className="font-bold text-white">Менеджер плагинов & Конфигураций (Monaco IDE)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <PluginsView
            serverPath={serverPath}
            framework={framework}
            onReloadPlugin={onReloadPlugin}
          />
        </div>
      </div>
    </div>
  );
};
