import React from 'react';
import { X, Users } from 'lucide-react';
import { PlayersView } from '../players/PlayersView';
import { Player } from '../../types';

interface PlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  serverPath?: string;
  onRefresh: () => void;
  onKick: (steamId: string, reason: string) => void;
  onBan: (steamId: string, reason: string) => void;
  onMute: (steamId: string) => void;
  onGiveItem: (steamId: string, item: string, amount: number) => void;
  onExecuteCommand?: (cmd: string) => void;
}

export const PlayersModal: React.FC<PlayersModalProps> = ({
  isOpen,
  onClose,
  players,
  serverPath = '',
  onRefresh,
  onKick,
  onBan,
  onMute,
  onGiveItem,
  onExecuteCommand
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-5xl h-[85vh] rounded-2xl glass-panel border border-cyan-500/30 bg-[#0a1122] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00f0ff]" />
            <span className="font-bold text-white">Модерация игроков сервера</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <PlayersView
            players={players}
            serverPath={serverPath}
            onRefresh={onRefresh}
            onKick={onKick}
            onBan={onBan}
            onMute={onMute}
            onGiveItem={onGiveItem}
            onExecuteCommand={onExecuteCommand}
          />
        </div>
      </div>
    </div>
  );
};
