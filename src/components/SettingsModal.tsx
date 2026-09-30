import { ArrowLeft, RotateCcw, Smartphone, Volume2 } from 'lucide-react';
import React, { useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { GameSettings } from '../types/game';
import { StoredGameData } from '../utils/storage';

interface SettingsModalProps {
  gameData: StoredGameData;
  onUpdateSettings: (settings: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  gameData,
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  const [settings, setSettings] = useState<GameSettings>(gameData.settings);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleVolumeChange = (type: 'masterVolume' | 'sfxVolume' | 'engineVolume', val: number) => {
    const updated = { ...settings, [type]: val };
    setSettings(updated);
    onUpdateSettings(updated);
    soundManager.setVolumes(updated.masterVolume, updated.sfxVolume, updated.engineVolume);
  };

  const handleToggleTouch = () => {
    soundManager.playUIClick();
    const updated = { ...settings, touchControls: !settings.touchControls };
    setSettings(updated);
    onUpdateSettings(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-50 p-4 select-none">
      <div className="flex flex-col max-w-md w-full p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-pink-400 font-bold">
              CONFIGURATION
            </span>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white mt-0.5">
              SETTINGS
            </h2>
          </div>

          <button
            onClick={() => {
              soundManager.playUIClick();
              onClose();
            }}
            className="p-2 rounded-xl glass-panel glass-panel-hover border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* Settings Sliders */}
        <div className="space-y-4 mb-6">
          {/* Master Volume */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex justify-between items-center text-xs font-semibold mb-2">
              <span className="text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Volume2 size={13} className="text-pink-400" /> Master Volume
              </span>
              <span className="font-mono text-white/70">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => handleVolumeChange('masterVolume', parseFloat(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          {/* Engine Volume */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex justify-between items-center text-xs font-semibold mb-2">
              <span className="text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Volume2 size={13} className="text-violet-400" /> Engine Audio
              </span>
              <span className="font-mono text-white/70">
                {Math.round(settings.engineVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.engineVolume}
              onChange={(e) => handleVolumeChange('engineVolume', parseFloat(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex justify-between items-center text-xs font-semibold mb-2">
              <span className="text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Volume2 size={13} className="text-cyan-400" /> Sound Effects & Drift
              </span>
              <span className="font-mono text-white/70">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => handleVolumeChange('sfxVolume', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* On-Screen Touch Controls Toggle */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={13} className="text-pink-400" /> On-Screen Touch Controls
              </span>
              <span className="text-[10px] text-white/40 mt-0.5">
                Show touch buttons (ideal for touchscreens or mobile)
              </span>
            </div>
            <button
              onClick={handleToggleTouch}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                settings.touchControls ? 'bg-pink-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.touchControls ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Reset Progress Danger Zone */}
        <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="text-xs text-rose-400/70 hover:text-rose-400 transition-colors uppercase tracking-widest text-left cursor-pointer flex items-center gap-1"
            >
              <RotateCcw size={12} /> Reset Career Data
            </button>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
              <span className="text-[11px] text-rose-300">Reset all cars & coins?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundManager.playCollision(0.4);
                    onResetProgress();
                    setConfirmReset(false);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white text-[10px] font-bold uppercase cursor-pointer"
                >
                  YES, RESET
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 rounded bg-white/10 text-white/70 text-[10px] uppercase cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
