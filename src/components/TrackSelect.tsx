import { ArrowLeft, CloudRain, Flame, Gauge, MapPin, Play, Sun, Trophy } from 'lucide-react';
import React, { useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { CARS } from '../data/cars';
import { TRACKS } from '../data/tracks';
import { GameScreen, TrackId } from '../types/game';
import { StoredGameData } from '../utils/storage';

interface TrackSelectProps {
  gameData: StoredGameData;
  onSelectTrackAndRace: (trackId: TrackId) => void;
  onNavigate: (screen: GameScreen) => void;
}

export const TrackSelect: React.FC<TrackSelectProps> = ({
  gameData,
  onSelectTrackAndRace,
  onNavigate,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>('midnight_city');
  const currentCar = CARS.find((c) => c.id === gameData.selectedCarId) || CARS[0];

  const handleStartRace = (trackId: TrackId) => {
    soundManager.playUIClick();
    onSelectTrackAndRace(trackId);
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-8 z-20 overflow-y-auto select-none bg-[#09080e]">
      {/* Top Header */}
      <div className="flex justify-between items-center w-full z-10 mb-2">
        <button
          onClick={() => {
            soundManager.playUIClick();
            onNavigate('menu');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel glass-panel-hover border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span className="text-xs uppercase tracking-widest font-semibold">MENU</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Active Car info */}
          <button
            onClick={() => {
              soundManager.playUIClick();
              onNavigate('garage');
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass-panel glass-panel-hover border border-white/10 text-xs text-white/80 cursor-pointer"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentCar.accentColor }}
            />
            <span className="font-semibold">{currentCar.name}</span>
            <span className="text-white/40 uppercase tracking-wider text-[10px]">(Change)</span>
          </button>
        </div>
      </div>

      {/* Main Track Selection Area */}
      <div className="max-w-6xl w-full mx-auto my-auto z-10">
        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-[0.3em] text-pink-400 font-bold">
            STAGE SELECT
          </span>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white mt-1">
            CIRCUITS OF THE NIGHT
          </h2>
          <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto mt-2 font-light">
            All circuits are sanctioned 3-lap underground trials. Master the corners, drift through the wet apexes, and set the all-time record.
          </p>
        </div>

        {/* 3 Track Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TRACKS.map((track) => {
            const isSelected = selectedTrackId === track.id;
            const record = gameData.records[track.id];

            return (
              <div
                key={track.id}
                onClick={() => {
                  soundManager.playUIClick();
                  setSelectedTrackId(track.id);
                }}
                className={`flex flex-col justify-between p-6 rounded-3xl glass-panel transition-all duration-300 cursor-pointer border ${
                  isSelected
                    ? 'border-pink-500 bg-pink-950/20 shadow-2xl shadow-pink-950/40 scale-[1.02]'
                    : 'border-white/10 hover:border-white/30 hover:bg-white/[0.04]'
                }`}
              >
                <div>
                  {/* Card Header & Badges */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-white/10 text-white/80">
                      3 LAPS • {track.lengthKm} KM
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${
                        track.difficulty === 'EASY'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : track.difficulty === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {track.difficulty}
                    </span>
                  </div>

                  {/* Track Name & Subtitle */}
                  <div className="mb-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-pink-400">
                      {track.subtitle}
                    </span>
                    <h3 className="text-2xl font-bold uppercase tracking-wide text-white mt-0.5">
                      {track.name}
                    </h3>
                  </div>

                  <p className="text-xs text-white/50 leading-relaxed font-light mb-5">
                    {track.description}
                  </p>

                  {/* Atmosphere perks */}
                  <div className="flex items-center gap-2 mb-5">
                    {track.rain ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] uppercase font-semibold">
                        <CloudRain size={12} /> Wet Surface & Rain
                      </div>
                    ) : track.neonTheme === 'sunset_gold' ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] uppercase font-semibold">
                        <Sun size={12} /> Dusk Sunset Ridge
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20 text-[10px] uppercase font-semibold">
                        <Flame size={12} /> High Neon Glow
                      </div>
                    )}
                  </div>

                  {/* Track Best Records */}
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 mb-5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/40 flex items-center gap-1">
                        <Trophy size={11} className="text-amber-400" /> Best Lap:
                      </span>
                      <span className="font-mono text-white/90 font-semibold">
                        {formatTime(record?.bestLapTime)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/40 flex items-center gap-1">
                        <Gauge size={11} className="text-pink-400" /> Total Time:
                      </span>
                      <span className="font-mono text-white/90 font-semibold">
                        {formatTime(record?.bestRaceTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Race Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRace(track.id);
                  }}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/30'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Play size={14} />
                  <span>START RACE</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center text-center text-[11px] text-white/30 uppercase tracking-widest z-10 pt-4">
        <MapPin size={12} className="mr-1" />
        Select your track and press Start Race to engage
      </div>
    </div>
  );
};
