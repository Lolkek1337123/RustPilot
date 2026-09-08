import React from 'react';
import { Sliders, Save, FileCode, CheckCircle2, Shield, FlaskConical } from 'lucide-react';
import { ServerConfig, ModFramework } from '../../types';

interface SettingsViewProps {
  config: ServerConfig;
  onUpdateConfig: (newConfig: ServerConfig) => void;
  onSaveConfig: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
  onSaveConfig
}) => {
  const handleChange = (field: keyof ServerConfig, value: any) => {
    onUpdateConfig({
      ...config,
      [field]: value
    });
  };

  const generateBatPreview = () => {
    return `@echo off
cls
echo [TRP Labs RustPilot] Starting ${config.serverName}...
RustDedicated.exe -batchmode -nographics ^
  +server.port ${config.port} ^
  +server.queryport ${config.queryPort} ^
  +server.hostname "${config.serverName}" ^
  +server.identity "${config.identity}" ^
  +server.level "Procedural Map" ^
  +server.worldsize ${config.worldSize} ^
  +server.seed ${config.seed} ^
  +server.maxplayers ${config.maxPlayers} ^
  +server.saveinterval ${config.saveInterval} ^
  +rcon.port ${config.rconPort} ^
  +rcon.password "${config.rconPassword}" ^
  +rcon.web 1 ^
  -logFile "output.txt"`;
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-full max-w-5xl mx-auto bg-[#050811]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#00f0ff]" />
            <span>Конфигурация сервера и Параметры запуска</span>
          </h2>
          <p className="text-xs text-[#94a3b8]">
            Настройка сетевых портов, карты (Seed & World Size), RCON и дополнительных аргументов
          </p>
        </div>

        <button
          onClick={onSaveConfig}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase bg-gradient-to-r from-[#00f0ff] via-[#2563eb] to-[#1e3a8a] hover:brightness-110 text-white shadow-lg shadow-cyan-950/40 transition-all hover:scale-[1.02] active:scale-[0.98] border border-cyan-300/30 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Сохранить настройки</span>
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Parameters */}
        <div className="rounded-2xl glass-panel p-6 border border-cyan-500/20 bg-[#0a1122] space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Базовые параметры
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#94a3b8] block mb-1">Название сервера (hostname):</label>
              <input
                type="text"
                value={config.serverName}
                onChange={(e) => handleChange('serverName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
              />
            </div>

            <div>
              <label className="text-xs text-[#94a3b8] block mb-1">Идентификатор папки (server.identity):</label>
              <input
                type="text"
                value={config.identity}
                onChange={(e) => handleChange('identity', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Размер карты (worldsize):</label>
                <input
                  type="number"
                  value={config.worldSize}
                  onChange={(e) => handleChange('worldSize', parseInt(e.target.value) || 3000)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Сид карты (seed):</label>
                <input
                  type="number"
                  value={config.seed}
                  onChange={(e) => handleChange('seed', parseInt(e.target.value) || 12345)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Макс. игроков:</label>
                <input
                  type="number"
                  value={config.maxPlayers}
                  onChange={(e) => handleChange('maxPlayers', parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Интервал автосохранения (сек):</label>
                <input
                  type="number"
                  value={config.saveInterval}
                  onChange={(e) => handleChange('saveInterval', parseInt(e.target.value) || 300)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Network & RCON Parameters */}
        <div className="rounded-2xl glass-panel p-6 border border-cyan-500/20 bg-[#0a1122] space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Сетевые порты & RCON
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Игровой порт (server.port):</label>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) => handleChange('port', parseInt(e.target.value) || 28015)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Query порт (queryport):</label>
                <input
                  type="number"
                  value={config.queryPort}
                  onChange={(e) => handleChange('queryPort', parseInt(e.target.value) || 28016)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">RCON порт (rcon.port):</label>
                <input
                  type="number"
                  value={config.rconPort}
                  onChange={(e) => handleChange('rconPort', parseInt(e.target.value) || 28017)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">RCON пароль:</label>
                <input
                  type="password"
                  value={config.rconPassword}
                  onChange={(e) => handleChange('rconPassword', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#94a3b8] block mb-1">Дополнительные аргументы запуска:</label>
              <input
                type="text"
                value={config.customArgs || ''}
                onChange={(e) => handleChange('customArgs', e.target.value)}
                placeholder="+server.tags weekly,vanilla -server.pve 0"
                className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-cyan-500/20 text-xs text-white font-mono focus:outline-none focus:border-[#00f0ff]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Generated Batch Preview Card */}
      <div className="rounded-2xl glass-panel p-6 border border-cyan-500/20 bg-[#0a1122] space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#00f0ff]" />
            <span>Предпросмотр генерируемой команды запуска (.bat)</span>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-[#050811] border border-cyan-500/20 text-[11px] font-mono text-[#00f0ff] overflow-x-auto select-text">
          {generateBatPreview()}
        </pre>
      </div>
    </div>
  );
};
