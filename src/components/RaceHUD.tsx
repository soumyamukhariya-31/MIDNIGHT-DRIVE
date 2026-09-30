import { Flame, Gauge, Pause, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { PlayerPhysicsState } from '../game/physics';
import { GameInput } from '../types/game';

interface RaceHUDProps {
  hudState: PlayerPhysicsState | null;
  countdownNumber: number; // 3, 2, 1, 0 (GO), -1 (race in progress)
  isPaused: boolean;
  onTogglePause: () => void;
  onRestartRace: () => void;
  onExitToMenu: () => void;
  onInputChange: (input: Partial<GameInput>) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showTouchControls: boolean;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  hudState,
  countdownNumber,
  isPaused,
  onTogglePause,
  onRestartRace,
  onExitToMenu,
  onInputChange,
  isMuted,
  onToggleMute,
  showTouchControls,
}) => {
  const [controlsHintVisible, setControlsHintVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setControlsHintVisible(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '00:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const speed = hudState?.speedKmh || 0;
  const nitroRatio = (hudState?.nitroRemaining || 0) / 100;
  const lap = hudState?.lap || 1;
  const maxLaps = hudState?.maxLaps || 3;
  const position = hudState?.racePosition || 4;

  // Approximate gear from speed
  let gear = 'N';
  if (hudState && hudState.forwardSpeed < -0.5) gear = 'R';
  else if (speed > 240) gear = '6';
  else if (speed > 190) gear = '5';
  else if (speed > 140) gear = '4';
  else if (speed > 90) gear = '3';
  else if (speed > 40) gear = '2';
  else if (speed > 1) gear = '1';

  // Touch handlers for mobile controls
  const handleTouchStart = (key: keyof GameInput) => {
    onInputChange({ [key]: true });
  };
  const handleTouchEnd = (key: keyof GameInput) => {
    onInputChange({ [key]: false });
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none flex flex-col justify-between p-4 sm:p-7">
      {/* 1. TOP BAR: Lap, Timers, Position, Pause */}
      <div className="flex justify-between items-start w-full">
        {/* Left: Position & Lap Badge */}
        <div className="flex items-center gap-3">
          {/* Position */}
          <div className="flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-panel border border-white/15 shadow-xl">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/50">
              POS
            </span>
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-pink-400 font-mono">
                {position}
              </span>
              <span className="text-xs text-white/40 ml-0.5">/4</span>
            </div>
          </div>

          {/* Lap info */}
          <div className="flex flex-col justify-center px-4 py-2 sm:py-3 rounded-2xl glass-panel border border-white/15 shadow-xl">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              LAP
            </span>
            <span className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
              {lap} <span className="text-white/40 text-sm font-normal">/ {maxLaps}</span>
            </span>
          </div>
        </div>

        {/* Center: Race Time & Lap Time */}
        <div className="flex flex-col items-center px-5 py-2 sm:py-2.5 rounded-2xl glass-panel border border-white/15 shadow-xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
            CURRENT LAP
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
            {formatTime(hudState?.currentLapTime || 0)}
          </span>
          <div className="flex items-center gap-3 text-[10px] text-white/50 font-mono mt-0.5">
            <span>TOTAL: {formatTime(hudState?.totalRaceTime || 0)}</span>
            {hudState?.bestLapTime ? (
              <span className="text-amber-400">BEST: {formatTime(hudState.bestLapTime)}</span>
            ) : null}
          </div>
        </div>

        {/* Right: Quick Buttons (Restart, Sound, Pause) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              soundManager.playUIClick();
              onRestartRace();
            }}
            title="Restart Race (R)"
            className="p-2.5 rounded-xl glass-panel glass-panel-hover border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer shadow-lg"
          >
            <RotateCcw size={18} />
          </button>

          <button
            onClick={() => {
              soundManager.playUIClick();
              onToggleMute();
            }}
            title="Toggle Mute"
            className="p-2.5 rounded-xl glass-panel glass-panel-hover border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer shadow-lg"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            onClick={() => {
              soundManager.playUIClick();
              onTogglePause();
            }}
            title="Pause Game (ESC)"
            className="p-2.5 rounded-xl glass-panel glass-panel-hover border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer shadow-lg"
          >
            <Pause size={18} />
          </button>
        </div>
      </div>

      {/* 2. CENTER NOTIFICATIONS & BANNER */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
        {/* Countdown Banner */}
        {countdownNumber >= 0 && (
          <div className="flex flex-col items-center animate-pulse">
            <span className="text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-300 to-rose-500 glow-text-pink">
              {countdownNumber === 0 ? 'GO!' : countdownNumber}
            </span>
            <span className="text-xs uppercase tracking-[0.4em] text-white/70 mt-2">
              {countdownNumber === 0 ? 'CHASE THE NIGHT' : 'GET READY'}
            </span>
          </div>
        )}

        {/* Banner Notification (Perfect Drift / Near Miss / Fastest Lap) */}
        {hudState?.bannerNotification && (
          <div className="px-6 py-2 rounded-full glass-panel border border-pink-500/50 bg-pink-950/40 text-pink-300 font-bold text-sm sm:text-base uppercase tracking-widest shadow-2xl glow-box-pink animate-bounce mb-4">
            {hudState.bannerNotification}
          </div>
        )}

        {/* Live Drift Score Meter */}
        {hudState?.isDrifting && (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/70 border border-violet-500/50 shadow-lg glow-box-violet">
            <Flame size={16} className="text-violet-400 animate-spin" />
            <span className="text-xs uppercase tracking-wider font-bold text-violet-300">
              DRIFT +{Math.floor(hudState.currentDriftScore)}
            </span>
          </div>
        )}

        {/* Controls Hint Banner (Fades out after 6 seconds) */}
        {controlsHintVisible && countdownNumber < 0 && (
          <div className="px-4 py-2 rounded-xl glass-panel border border-white/10 text-xs text-white/70 tracking-wider uppercase text-center mt-32">
            W / ↑ Gas • S / ↓ Brake • A/D Steer • Space Nitro • R Restart
          </div>
        )}
      </div>

      {/* 3. BOTTOM AREA: Speedometer, Nitro Gauge, and Mobile Controls */}
      <div className="flex flex-col w-full">
        {/* On-Screen Mobile Touch Controls */}
        {showTouchControls && (
          <div className="grid grid-cols-2 w-full gap-4 mb-4 pointer-events-auto">
            {/* Left Hand: Steering Controls */}
            <div className="flex items-center gap-3">
              <button
                onTouchStart={() => handleTouchStart('left')}
                onTouchEnd={() => handleTouchEnd('left')}
                onMouseDown={() => handleTouchStart('left')}
                onMouseUp={() => handleTouchEnd('left')}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-panel active:bg-pink-600/40 border border-white/20 text-white font-black text-2xl flex items-center justify-center cursor-pointer shadow-xl select-none"
              >
                ◀
              </button>
              <button
                onTouchStart={() => handleTouchStart('right')}
                onTouchEnd={() => handleTouchEnd('right')}
                onMouseDown={() => handleTouchStart('right')}
                onMouseUp={() => handleTouchEnd('right')}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-panel active:bg-pink-600/40 border border-white/20 text-white font-black text-2xl flex items-center justify-center cursor-pointer shadow-xl select-none"
              >
                ▶
              </button>
            </div>

            {/* Right Hand: Gas, Brake, Nitro, Drift */}
            <div className="flex items-center justify-end gap-2.5">
              {/* Drift */}
              <button
                onTouchStart={() => handleTouchStart('drift')}
                onTouchEnd={() => handleTouchEnd('drift')}
                onMouseDown={() => handleTouchStart('drift')}
                onMouseUp={() => handleTouchEnd('drift')}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glass-panel active:bg-violet-600/40 border border-white/20 text-violet-300 font-bold text-xs uppercase flex items-center justify-center cursor-pointer shadow-xl select-none"
              >
                DRIFT
              </button>

              {/* Nitro */}
              <button
                onTouchStart={() => handleTouchStart('nitro')}
                onTouchEnd={() => handleTouchEnd('nitro')}
                onMouseDown={() => handleTouchStart('nitro')}
                onMouseUp={() => handleTouchEnd('nitro')}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glass-panel active:bg-cyan-600/40 border border-white/20 text-cyan-300 font-bold text-xs uppercase flex items-center justify-center cursor-pointer shadow-xl select-none"
              >
                <Zap size={18} />
              </button>

              {/* Brake / Reverse */}
              <button
                onTouchStart={() => handleTouchStart('backward')}
                onTouchEnd={() => handleTouchEnd('backward')}
                onMouseDown={() => handleTouchStart('backward')}
                onMouseUp={() => handleTouchEnd('backward')}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glass-panel active:bg-rose-600/40 border border-white/20 text-rose-300 font-bold text-xs uppercase flex items-center justify-center cursor-pointer shadow-xl select-none"
              >
                BRAKE
              </button>

              {/* Gas / Accelerate */}
              <button
                onTouchStart={() => handleTouchStart('forward')}
                onTouchEnd={() => handleTouchEnd('forward')}
                onMouseDown={() => handleTouchStart('forward')}
                onMouseUp={() => handleTouchEnd('forward')}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-pink-600 active:bg-pink-500 border border-pink-400 text-white font-black text-sm uppercase flex items-center justify-center cursor-pointer shadow-2xl shadow-pink-600/40 select-none"
              >
                GAS
              </button>
            </div>
          </div>
        )}

        {/* Speedometer & Nitro HUD Dashboard */}
        <div className="flex justify-between items-end w-full">
          {/* Left: Nitro Gauge */}
          <div className="flex flex-col w-44 sm:w-56 glass-panel p-3.5 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1 text-cyan-400">
                <Zap size={12} className={hudState?.isNitroActive ? 'animate-bounce text-cyan-300' : ''} />
                NITRO
              </span>
              <span className="font-mono text-white/80">
                {Math.round(hudState?.nitroRemaining || 0)}%
              </span>
            </div>

            {/* Glowing Nitro Bar */}
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/15">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  hudState?.isNitroActive
                    ? 'bg-gradient-to-r from-cyan-400 to-white shadow-[0_0_12px_#38bdf8]'
                    : 'bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, nitroRatio * 100))}%` }}
              />
            </div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest mt-1 text-right">
              SPACE TO BOOST
            </span>
          </div>

          {/* Right: Digital Speedometer & Gear */}
          <div className="flex items-baseline gap-4 glass-panel px-6 py-3.5 rounded-2xl border border-white/15 shadow-2xl">
            {/* Gear indicator */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">GEAR</span>
              <span className="text-xl font-black font-mono text-pink-400">{gear}</span>
            </div>

            {/* Speed Value */}
            <div className="flex items-baseline">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                {speed}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-white/50 ml-1.5">
                KM/H
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PAUSE OVERLAY MODAL */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-50 pointer-events-auto">
          <div className="flex flex-col items-center p-8 rounded-3xl glass-panel border border-white/15 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-1">
              PAUSED
            </h2>
            <p className="text-xs text-white/50 uppercase tracking-widest mb-6">
              Midnight Drive
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => {
                  soundManager.playUIClick();
                  onTogglePause();
                }}
                className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-pink-600/30"
              >
                RESUME RACE
              </button>

              <button
                onClick={() => {
                  soundManager.playUIClick();
                  onRestartRace();
                }}
                className="w-full py-3.5 rounded-xl glass-panel glass-panel-hover border border-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                RESTART
              </button>

              <button
                onClick={() => {
                  soundManager.playUIClick();
                  onExitToMenu();
                }}
                className="w-full py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                EXIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
