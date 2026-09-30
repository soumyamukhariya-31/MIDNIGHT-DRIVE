import { ArrowLeft, Clock, Gauge, Trophy } from 'lucide-react';
import React from 'react';
import { soundManager } from '../audio/soundManager';
import { TRACKS } from '../data/tracks';
import { StoredGameData } from '../utils/storage';

interface RecordsModalProps {
  gameData: StoredGameData;
  onClose: () => void;
}

export const RecordsModal: React.FC<RecordsModalProps> = ({ gameData, onClose }) => {
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-50 p-4 select-none">
      <div className="flex flex-col max-w-xl w-full p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-amber-400 font-bold">
              HALL OF RECORDS
            </span>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white mt-0.5">
              CIRCUIT TIMES
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

        {/* Track Records List */}
        <div className="space-y-4 mb-6">
          {TRACKS.map((track) => {
            const record = gameData.records[track.id];
            const hasPlayed = record && record.bestRaceTime > 0;

            return (
              <div
                key={track.id}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between"
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-bold uppercase tracking-wider text-white">
                    {track.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-pink-400 font-semibold">
                    3 LAPS • {track.lengthKm} KM
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-amber-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">
                        Best Lap
                      </span>
                      <span className="text-sm font-mono font-bold text-white">
                        {formatTime(record?.bestLapTime)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Gauge size={14} className="text-pink-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">
                        Total Time
                      </span>
                      <span className="text-sm font-mono font-bold text-white">
                        {formatTime(record?.bestRaceTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {!hasPlayed && (
                  <span className="text-[10px] text-white/30 italic mt-2">
                    No recorded time yet. Complete a race on this circuit!
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Career Stats Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs text-white/50">
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-white/40" />
            Times saved to local storage
          </span>
          <span className="font-mono text-white/80">
            Total Credits: {gameData.coins.toLocaleString()} CR
          </span>
        </div>
      </div>
    </div>
  );
};
