import React from 'react';
import { X, DownloadCloud, FlaskConical } from 'lucide-react';
import { InstallWizard } from '../wizard/InstallWizard';
import { ModFramework } from '../../types';

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallComplete: (serverPath: string, framework: ModFramework) => void;
}

export const WizardModal: React.FC<WizardModalProps> = ({
  isOpen,
  onClose,
  onInstallComplete
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-[#00f0ff]" />
            <span className="font-bold text-white">Мастер 1-Click установки сервера Rust</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <InstallWizard
            onInstallComplete={(serverPath, framework) => {
              onInstallComplete(serverPath, framework);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
