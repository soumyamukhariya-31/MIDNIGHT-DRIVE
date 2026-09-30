import React, { useCallback, useEffect, useRef, useState } from 'react';
import { soundManager } from './audio/soundManager';
import { FinishModal } from './components/FinishModal';
import { Garage } from './components/Garage';
import { MainMenu } from './components/MainMenu';
import { RaceHUD } from './components/RaceHUD';
import { RecordsModal } from './components/RecordsModal';
import { SettingsModal } from './components/SettingsModal';
import { TrackSelect } from './components/TrackSelect';
import { CARS } from './data/cars';
import { TRACKS } from './data/tracks';
import { GameEngine } from './game/gameEngine';
import { PlayerPhysicsState } from './game/physics';
import { GameInput, GameScreen, RaceResult, TrackId } from './types/game';
import { loadGameData, saveGameData, StoredGameData } from './utils/storage';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('menu');
  const [activeTrackId, setActiveTrackId] = useState<TrackId>('midnight_city');
  const [gameData, setGameData] = useState<StoredGameData>(() => loadGameData());
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // In-race HUD state
  const [hudState, setHudState] = useState<PlayerPhysicsState | null>(null);
  const [countdownNumber, setCountdownNumber] = useState<number>(4);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Keyboard and Touch inputs
  const currentInputRef = useRef<GameInput>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    nitro: false,
    restart: false,
  });

  // Keep volume in sync with settings
  useEffect(() => {
    soundManager.setVolumes(
      gameData.settings.masterVolume,
      gameData.settings.sfxVolume,
      gameData.settings.engineVolume
    );
  }, [gameData.settings]);

  // Update Game Data & persist
  const handleUpdateGameData = useCallback((updates: Partial<StoredGameData>) => {
    setGameData((prev) => {
      const next = { ...prev, ...updates };
      saveGameData(updates);
      return next;
    });
  }, []);

  // Audio mute toggle
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundManager.setMuted(next);
      return next;
    });
  }, []);

  // Input listener (Keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') currentInputRef.current.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') currentInputRef.current.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') currentInputRef.current.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') currentInputRef.current.right = true;
      if (e.code === 'Space') currentInputRef.current.nitro = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') currentInputRef.current.drift = true;

      if (e.code === 'KeyR' && currentScreen === 'race') {
        handleRestartRace();
      }

      if (e.code === 'Escape' && currentScreen === 'race' && !raceResult) {
        setIsPaused((prev) => !prev);
      }

      engineRef.current?.setInput(currentInputRef.current);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') currentInputRef.current.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') currentInputRef.current.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') currentInputRef.current.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') currentInputRef.current.right = false;
      if (e.code === 'Space') currentInputRef.current.nitro = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') currentInputRef.current.drift = false;

      engineRef.current?.setInput(currentInputRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentScreen, raceResult]);

  // Touch input updater from HUD
  const handleTouchInputChange = useCallback((partialInput: Partial<GameInput>) => {
    currentInputRef.current = { ...currentInputRef.current, ...partialInput };
    engineRef.current?.setInput(currentInputRef.current);
  }, []);

  // Launch Race
  const startRace = useCallback((trackId: TrackId) => {
    setActiveTrackId(trackId);
    setRaceResult(null);
    setIsPaused(false);
    setCountdownNumber(4);
    setCurrentScreen('race');
  }, []);

  // Restart Race
  const handleRestartRace = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setRaceResult(null);
    setIsPaused(false);
    setCountdownNumber(4);

    // Re-initialize engine
    const container = gameContainerRef.current;
    if (container) {
      const carState = gameData.cars[gameData.selectedCarId];
      engineRef.current = new GameEngine(
        container,
        activeTrackId,
        gameData.selectedCarId,
        carState,
        {
          onUpdateHUD: (pState) => setHudState({ ...pState }),
          onRaceFinish: handleRaceFinished,
          onCountdownTick: (count) => setCountdownNumber(count),
        }
      );
    }
  }, [activeTrackId, gameData]);

  // Finish Race callback
  const handleRaceFinished = useCallback((finalState: PlayerPhysicsState) => {
    if (raceResult) return; // already handled

    const trackDef = TRACKS.find((t) => t.id === activeTrackId) || TRACKS[0];
    const carDef = CARS.find((c) => c.id === gameData.selectedCarId) || CARS[0];

    // Compute Prize Money
    const posPrizes: Record<number, number> = { 1: 750, 2: 450, 3: 250, 4: 150 };
    const basePrize = posPrizes[finalState.racePosition] || 150;
    const driftBonus = Math.floor(finalState.totalDriftScore * 0.15);
    const nearMissBonus = finalState.nearMissCount * 50;
    const totalCoinsEarned = basePrize + driftBonus + nearMissBonus + finalState.coinsEarned;

    // Check if new record
    const existingRecord = gameData.records[activeTrackId];
    let isNewRecord = false;
    let newBestLap = existingRecord?.bestLapTime || 0;
    let newBestRace = existingRecord?.bestRaceTime || 0;

    if (newBestLap === 0 || (finalState.bestLapTime > 0 && finalState.bestLapTime < newBestLap)) {
      newBestLap = finalState.bestLapTime;
      isNewRecord = true;
    }

    if (newBestRace === 0 || finalState.totalRaceTime < newBestRace) {
      newBestRace = finalState.totalRaceTime;
      isNewRecord = true;
    }

    const updatedRecords = {
      ...gameData.records,
      [activeTrackId]: {
        bestLapTime: newBestLap,
        bestRaceTime: newBestRace,
        lastPlayed: Date.now(),
      },
    };

    const newCoins = gameData.coins + totalCoinsEarned;
    handleUpdateGameData({
      coins: newCoins,
      records: updatedRecords,
    });

    setRaceResult({
      trackId: activeTrackId,
      trackName: trackDef.name,
      carName: carDef.name,
      position: finalState.racePosition,
      totalTime: finalState.totalRaceTime,
      bestLapTime: finalState.bestLapTime,
      driftScore: finalState.totalDriftScore,
      nearMissCount: finalState.nearMissCount,
      coinsEarned: totalCoinsEarned,
      newRecord: isNewRecord,
    });
  }, [activeTrackId, gameData, handleUpdateGameData, raceResult]);

  // Mount/Unmount GameEngine when entering/leaving 'race'
  useEffect(() => {
    if (currentScreen !== 'race') {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      return;
    }

    const container = gameContainerRef.current;
    if (!container) return;

    const carState = gameData.cars[gameData.selectedCarId];
    const engine = new GameEngine(
      container,
      activeTrackId,
      gameData.selectedCarId,
      carState,
      {
        onUpdateHUD: (pState) => setHudState({ ...pState }),
        onRaceFinish: handleRaceFinished,
        onCountdownTick: (count) => setCountdownNumber(count),
      }
    );

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [currentScreen, activeTrackId, gameData.selectedCarId, handleRaceFinished]);

  // Reset Career progress
  const handleResetProgress = () => {
    localStorage.clear();
    const defaults = loadGameData();
    setGameData(defaults);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08080c] select-none text-white font-sans">
      {/* 3D WebGL Viewport Container for Race */}
      <div
        ref={gameContainerRef}
        className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-500 ${
          currentScreen === 'race' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Screen: MAIN MENU */}
      {currentScreen === 'menu' && (
        <MainMenu
          gameData={gameData}
          onNavigate={(screen) => setCurrentScreen(screen)}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
        />
      )}

      {/* Screen: GARAGE */}
      {currentScreen === 'garage' && (
        <Garage
          gameData={gameData}
          onUpdateGameData={handleUpdateGameData}
          onNavigate={(screen) => setCurrentScreen(screen)}
        />
      )}

      {/* Screen: TRACK SELECTION */}
      {currentScreen === 'track_select' && (
        <TrackSelect
          gameData={gameData}
          onSelectTrackAndRace={(trackId) => startRace(trackId)}
          onNavigate={(screen) => setCurrentScreen(screen)}
        />
      )}

      {/* Screen: RACE HUD */}
      {currentScreen === 'race' && (
        <RaceHUD
          hudState={hudState}
          countdownNumber={countdownNumber}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((prev) => !prev)}
          onRestartRace={handleRestartRace}
          onExitToMenu={() => setCurrentScreen('menu')}
          onInputChange={handleTouchInputChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          showTouchControls={gameData.settings.touchControls || 'ontouchstart' in window}
        />
      )}

      {/* MODAL: RACE FINISH */}
      {currentScreen === 'race' && raceResult && (
        <FinishModal
          result={raceResult}
          onRestart={handleRestartRace}
          onGoToGarage={() => setCurrentScreen('garage')}
          onGoToMenu={() => setCurrentScreen('menu')}
        />
      )}

      {/* MODAL: RECORDS */}
      {currentScreen === 'records' && (
        <RecordsModal
          gameData={gameData}
          onClose={() => setCurrentScreen('menu')}
        />
      )}

      {/* MODAL: SETTINGS */}
      {currentScreen === 'settings' && (
        <SettingsModal
          gameData={gameData}
          onUpdateSettings={(settings) => handleUpdateGameData({ settings })}
          onResetProgress={handleResetProgress}
          onClose={() => setCurrentScreen('menu')}
        />
      )}
    </div>
  );
}
