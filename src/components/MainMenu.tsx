import { Flame, Play, Settings as SettingsIcon, Trophy, Volume2, VolumeX, Wrench } from 'lucide-react';
import React from 'react';
import { soundManager } from '../audio/soundManager';
import { CARS } from '../data/cars';
import { GameScreen } from '../types/game';
import { StoredGameData } from '../utils/storage';

interface MainMenuProps {
  gameData: StoredGameData;
  onNavigate: (screen: GameScreen) => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  gameData,
  onNavigate,
  onToggleMute,
  isMuted,
}) => {
  const currentCar = CARS.find((c) => c.id === gameData.selectedCarId) || CARS[0];

  const handleNav = (screen: GameScreen) => {
    soundManager.playUIClick();
    onNavigate(screen);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-12 z-20 overflow-hidden select-none bg-radial from-[#12111d] via-[#09080e] to-[#040407]">
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-pink-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full z-10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
          <span className="text-xs uppercase tracking-[0.3em] text-white/50 font-medium">
            UNDERGROUND NIGHT LEAGUE
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Coin balance */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-white/10 shadow-lg">
            <span className="text-pink-400 font-bold text-sm tracking-wider">CR</span>
            <span className="text-white font-semibold font-mono tracking-tight text-sm">
              {gameData.coins.toLocaleString()}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              soundManager.playUIClick();
              onToggleMute();
            }}
            aria-label="Toggle Audio Mute"
            className="p-2.5 rounded-full glass-panel glass-panel-hover border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* Hero Title Section */}
      <div className="flex flex-col items-start my-auto z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.05] border border-white/10 text-xs tracking-widest uppercase text-pink-400 font-medium mb-3">
          <Flame size={12} className="text-pink-400 animate-bounce" />
          SEASON 01 • ACTIVE
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight uppercase leading-[0.95] text-white">
          MIDNIGHT
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 glow-text-pink">
            DRIVE
          </span>
        </h1>

        <p className="mt-4 text-base sm:text-lg font-light tracking-[0.25em] text-white/60 uppercase">
          “CHASE THE NIGHT.”
        </p>

        {/* Selected Car Tag */}
        <div className="mt-6 flex items-center gap-3 p-3 rounded-xl glass-panel border border-white/10">
          <div
            className="w-4 h-4 rounded-full border border-white/30"
            style={{ backgroundColor: currentCar.accentColor }}
          />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-white/40">Current Vehicle</span>
            <span className="text-sm font-bold text-white tracking-wide">{currentCar.name}</span>
          </div>
        </div>
      </div>

      {/* Main Action Menu Navigation */}
      <nav aria-label="Main Menu Navigation" className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full z-10 max-w-4xl">
        {/* Race Button */}
        <button
          onClick={() => handleNav('track_select')}
          onMouseEnter={() => soundManager.playUIHover()}
          className="group flex flex-col justify-between p-5 rounded-2xl glass-panel border border-white/10 hover:border-pink-500/50 hover:bg-pink-950/20 transition-all duration-200 cursor-pointer shadow-xl text-left"
        >
          <div className="flex justify-between items-center w-full">
            <span className="text-xs uppercase tracking-widest text-pink-400 font-semibold">01</span>
            <Play size={18} className="text-white/60 group-hover:text-pink-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-bold tracking-wider uppercase text-white group-hover:glow-text-pink">RACE</h2>
            <p className="text-xs text-white/40 font-light mt-0.5">Select circuit & launch</p>
          </div>
        </button>

        {/* Garage Button */}
        <button
          onClick={() => handleNav('garage')}
          onMouseEnter={() => soundManager.playUIHover()}
          className="group flex flex-col justify-between p-5 rounded-2xl glass-panel border border-white/10 hover:border-violet-500/50 hover:bg-violet-950/20 transition-all duration-200 cursor-pointer shadow-xl text-left"
        >
          <div className="flex justify-between items-center w-full">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-semibold">02</span>
            <Wrench size={18} className="text-white/60 group-hover:text-violet-400 group-hover:rotate-45 transition-transform" />
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-bold tracking-wider uppercase text-white group-hover:glow-text-violet">GARAGE</h2>
            <p className="text-xs text-white/40 font-light mt-0.5">Cars, tuning & underglow</p>
          </div>
        </button>

        {/* Records Button */}
        <button
          onClick={() => handleNav('records')}
          onMouseEnter={() => soundManager.playUIHover()}
          className="group flex flex-col justify-between p-5 rounded-2xl glass-panel border border-white/10 hover:border-amber-500/50 hover:bg-amber-950/20 transition-all duration-200 cursor-pointer shadow-xl text-left"
        >
          <div className="flex justify-between items-center w-full">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">03</span>
            <Trophy size={18} className="text-white/60 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-bold tracking-wider uppercase text-white">RECORDS</h2>
            <p className="text-xs text-white/40 font-light mt-0.5">Best lap times & stats</p>
          </div>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => handleNav('settings')}
          onMouseEnter={() => soundManager.playUIHover()}
          className="group flex flex-col justify-between p-5 rounded-2xl glass-panel border border-white/10 hover:border-white/30 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer shadow-xl text-left"
        >
          <div className="flex justify-between items-center w-full">
            <span className="text-xs uppercase tracking-widest text-white/40 font-semibold">04</span>
            <SettingsIcon size={18} className="text-white/60 group-hover:text-white group-hover:rotate-90 transition-transform" />
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-bold tracking-wider uppercase text-white">SETTINGS</h2>
            <p className="text-xs text-white/40 font-light mt-0.5">Audio & input controls</p>
          </div>
        </button>
      </nav>

      {/* Footer controls hint */}
      <footer className="flex justify-between items-center w-full pt-4 border-t border-white/5 text-[11px] text-white/40 uppercase tracking-widest">
        <span>Controls: WASD / Arrows • Space Nitro • R Restart</span>
        <span>Version 1.0 • 60 FPS Engine</span>
      </footer>
    </div>
  );
};
