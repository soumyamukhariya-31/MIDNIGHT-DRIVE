import confetti from 'canvas-confetti';
import { ArrowRight, Award, CheckCircle2, Flame, RotateCcw, Trophy, Wrench } from 'lucide-react';
import React, { useEffect } from 'react';
import { soundManager } from '../audio/soundManager';
import { RaceResult } from '../types/game';

interface FinishModalProps {
  result: RaceResult;
  onRestart: () => void;
  onGoToGarage: () => void;
  onGoToMenu: () => void;
}

export const FinishModal: React.FC<FinishModalProps> = ({
  result,
  onRestart,
  onGoToGarage,
  onGoToMenu,
}) => {
  useEffect(() => {
    // Fire celebratory confetti if on podium (1st or 2nd)
    if (result.position <= 2) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#a855f7', '#38bdf8', '#f59e0b', '#ffffff'],
      });
    }
  }, [result.position]);

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getPositionText = (pos: number) => {
    if (pos === 1) return '1ST PLACE • WINNER';
    if (pos === 2) return '2ND PLACE • RUNNER UP';
    if (pos === 3) return '3RD PLACE • PODIUM';
    return `${pos}TH PLACE`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-50 p-4 select-none">
      <div className="relative flex flex-col items-center max-w-lg w-full p-6 sm:p-8 rounded-3xl glass-panel border border-pink-500/30 shadow-2xl overflow-hidden">
        {/* Top ambient highlight */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-pink-500/20 rounded-full blur-[80px] pointer-events-none" />

        {/* Trophy / Position Badge */}
        <div className="flex flex-col items-center mb-4 z-10">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl ${
              result.position === 1
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-amber-500/30'
                : result.position === 2
                ? 'bg-gradient-to-tr from-slate-400 to-slate-200 text-black'
                : 'bg-gradient-to-tr from-rose-800 to-rose-600 text-white'
            }`}
          >
            {result.position === 1 ? <Trophy size={32} /> : <Award size={32} />}
          </div>

          <span
            className={`text-xs font-black uppercase tracking-[0.25em] ${
              result.position === 1 ? 'text-amber-400' : 'text-pink-400'
            }`}
          >
            {getPositionText(result.position)}
          </span>

          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mt-0.5">
            RACE COMPLETE
          </h2>

          <div className="flex items-center gap-2 mt-1 text-xs text-white/50 uppercase tracking-wider font-light">
            <span>{result.trackName}</span>
            <span>•</span>
            <span>{result.carName}</span>
          </div>
        </div>

        {/* New Record Banner if flagged */}
        {result.newRecord && (
          <div className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
            <CheckCircle2 size={14} /> NEW RECORD SET!
          </div>
        )}

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mb-5 z-10">
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              Total Time
            </span>
            <span className="text-lg font-black font-mono text-white mt-0.5">
              {formatTime(result.totalTime)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              Best Lap
            </span>
            <span className="text-lg font-black font-mono text-pink-400 mt-0.5">
              {formatTime(result.bestLapTime)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold flex items-center gap-1">
              <Flame size={11} className="text-violet-400" /> Drift Score
            </span>
            <span className="text-base font-black font-mono text-violet-300 mt-0.5">
              +{result.driftScore.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              Near Misses
            </span>
            <span className="text-base font-black font-mono text-cyan-300 mt-0.5">
              {result.nearMissCount}
            </span>
          </div>
        </div>

        {/* Prize Money Award */}
        <div className="w-full flex items-center justify-between p-4 rounded-2xl bg-pink-950/30 border border-pink-500/30 shadow-lg glow-box-pink mb-6 z-10">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-pink-400 font-bold">
              PRIZE REWARD
            </span>
            <span className="text-xs text-white/60">Position prize & drift bonuses</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-2xl font-black text-white">
            <span className="text-pink-400 text-lg">CR</span>
            <span>+{result.coinsEarned.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full z-10">
          <button
            onClick={() => {
              soundManager.playUIClick();
              onRestart();
            }}
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} />
            <span>RACE AGAIN</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUIClick();
              onGoToGarage();
            }}
            className="w-full sm:flex-1 py-3.5 rounded-xl glass-panel glass-panel-hover border border-white/15 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Wrench size={14} />
            <span>GARAGE</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUIClick();
              onGoToMenu();
            }}
            className="w-full sm:w-auto p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            title="Main Menu"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
