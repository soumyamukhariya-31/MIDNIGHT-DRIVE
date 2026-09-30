import { ArrowLeft, Check, ChevronLeft, ChevronRight, Lock, Play, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { soundManager } from '../audio/soundManager';
import { CARS, UNDERGLOW_COLORS, UPGRADE_PRICES } from '../data/cars';
import { Car3DInstance, createCarModel } from '../game/carBuilder';
import { GameScreen, RimStyle } from '../types/game';
import { StoredGameData } from '../utils/storage';

interface GarageProps {
  gameData: StoredGameData;
  onUpdateGameData: (data: Partial<StoredGameData>) => void;
  onNavigate: (screen: GameScreen) => void;
}

export const Garage: React.FC<GarageProps> = ({
  gameData,
  onUpdateGameData,
  onNavigate,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const idx = CARS.findIndex((c) => c.id === gameData.selectedCarId);
    return idx >= 0 ? idx : 0;
  });

  const [activeTab, setActiveTab] = useState<'specs' | 'tuning' | 'styling'>('specs');
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const car3DRef = useRef<Car3DInstance | null>(null);

  const currentCar = CARS[selectedIdx];
  const carState = gameData.cars[currentCar.id] || {
    unlocked: currentCar.unlockedByDefault || false,
    upgrades: { engine: 0, handling: 0, nitro: 0 },
    customization: {
      underglowColor: currentCar.accentColor,
      rimStyle: 'mesh' as RimStyle,
    },
  };

  const isUnlocked = carState.unlocked;
  const isSelected = gameData.selectedCarId === currentCar.id;

  // 3D Turntable Scene
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.5, 2.2, 5.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Showroom Lighting
    const ambient = new THREE.AmbientLight(0x2d1d3d, 1.6);
    scene.add(ambient);

    const topLight = new THREE.DirectionalLight(0xffffff, 2.0);
    topLight.position.set(0, 15, 5);
    scene.add(topLight);

    const rimPink = new THREE.PointLight(0xec4899, 3.5, 25);
    rimPink.position.set(-6, 3, -6);
    scene.add(rimPink);

    const rimBlue = new THREE.PointLight(0x38bdf8, 2.8, 25);
    rimBlue.position.set(6, 3, 6);
    scene.add(rimBlue);

    // Showroom Floor / Reflective Turntable
    const turntableGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.2, 48);
    const turntableMat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      roughness: 0.15,
      metalness: 0.85,
    });
    const turntable = new THREE.Mesh(turntableGeo, turntableMat);
    turntable.position.y = -0.1;
    scene.add(turntable);

    // Glowing circle perimeter
    const ringGeo = new THREE.RingGeometry(4.15, 4.3, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(currentCar.accentColor),
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.02;
    scene.add(ringMesh);

    // Car 3D Model
    const car = createCarModel(
      currentCar.id,
      carState.customization.underglowColor,
      carState.customization.rimStyle
    );
    scene.add(car.group);
    car3DRef.current = car;

    camera.lookAt(0, 0.7, 0);

    // Mouse / Touch rotation control
    let isDragging = false;
    let previousMouseX = 0;
    let rotationSpeed = 0.005;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouseX = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMouseX;
      car.group.rotation.y += deltaX * 0.01;
      previousMouseX = e.clientX;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        car.group.rotation.y += rotationSpeed;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [currentCar.id, carState.customization.underglowColor, carState.customization.rimStyle]);

  // Car unlock handler
  const handleUnlockCar = () => {
    if (gameData.coins < currentCar.price) {
      soundManager.playCollision(0.2);
      return;
    }
    soundManager.playPurchase();
    const updatedCars = {
      ...gameData.cars,
      [currentCar.id]: {
        ...carState,
        unlocked: true,
      },
    };
    onUpdateGameData({
      coins: gameData.coins - currentCar.price,
      cars: updatedCars,
      selectedCarId: currentCar.id,
    });
  };

  // Car select handler
  const handleSelectCar = () => {
    soundManager.playUIClick();
    onUpdateGameData({ selectedCarId: currentCar.id });
  };

  // Upgrade handler
  const handleUpgrade = (type: 'engine' | 'handling' | 'nitro') => {
    const currentTier = carState.upgrades[type];
    if (currentTier >= 3) return;

    const cost = UPGRADE_PRICES[type][currentTier];
    if (gameData.coins < cost) {
      soundManager.playCollision(0.2);
      return;
    }

    soundManager.playPurchase();
    const updatedCars = {
      ...gameData.cars,
      [currentCar.id]: {
        ...carState,
        upgrades: {
          ...carState.upgrades,
          [type]: currentTier + 1,
        },
      },
    };
    onUpdateGameData({
      coins: gameData.coins - cost,
      cars: updatedCars,
    });
  };

  // Customization handler
  const handleSetUnderglow = (color: string) => {
    soundManager.playUIClick();
    const updatedCars = {
      ...gameData.cars,
      [currentCar.id]: {
        ...carState,
        customization: {
          ...carState.customization,
          underglowColor: color,
        },
      },
    };
    onUpdateGameData({ cars: updatedCars });
  };

  const handleSetRim = (style: RimStyle) => {
    soundManager.playUIClick();
    const updatedCars = {
      ...gameData.cars,
      [currentCar.id]: {
        ...carState,
        customization: {
          ...carState.customization,
          rimStyle: style,
        },
      },
    };
    onUpdateGameData({ cars: updatedCars });
  };

  const nextCar = () => {
    soundManager.playUIClick();
    setSelectedIdx((prev) => (prev + 1) % CARS.length);
  };

  const prevCar = () => {
    soundManager.playUIClick();
    setSelectedIdx((prev) => (prev - 1 + CARS.length) % CARS.length);
  };

  // Compute stat bars with upgrade boosts
  const topSpeedBoost = (carState.upgrades.engine * 16);
  const totalTopSpeed = currentCar.stats.topSpeed + topSpeedBoost;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-8 z-20 overflow-y-auto select-none bg-[#09080e]">
      {/* Top Bar */}
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-white/10 shadow-lg">
            <span className="text-pink-400 font-bold text-sm tracking-wider">CR</span>
            <span className="text-white font-semibold font-mono tracking-tight text-sm">
              {gameData.coins.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => {
              soundManager.playUIClick();
              onNavigate('track_select');
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-pink-600/30"
          >
            <Play size={14} />
            <span>RACE NOW</span>
          </button>
        </div>
      </div>

      {/* Main Garage Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto w-full max-w-7xl mx-auto z-10">
        {/* Left Column: 3D Turntable Viewer */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Turntable Container */}
          <div className="relative w-full h-[320px] sm:h-[420px] rounded-3xl glass-panel border border-white/10 overflow-hidden flex items-center justify-center">
            <div ref={canvasContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Turntable hint */}
            <div className="absolute bottom-3 left-4 text-[10px] uppercase tracking-widest text-white/40 pointer-events-none">
              Drag to rotate 360°
            </div>

            {/* Car Nav Chevrons */}
            <button
              onClick={prevCar}
              aria-label="Previous Car"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full glass-panel glass-panel-hover border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextCar}
              aria-label="Next Car"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full glass-panel glass-panel-hover border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>

            {/* Locked Overlay Badge if not unlocked */}
            {!isUnlocked && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-xs font-semibold uppercase tracking-wider text-pink-300">
                <Lock size={12} />
                LOCKED
              </div>
            )}
          </div>

          {/* Quick Car Dots / Pills */}
          <div className="flex items-center gap-2 mt-4">
            {CARS.map((car, idx) => (
              <button
                key={car.id}
                onClick={() => {
                  soundManager.playUIClick();
                  setSelectedIdx(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === selectedIdx
                    ? 'w-8 bg-pink-500'
                    : gameData.cars[car.id]?.unlocked
                    ? 'w-2 bg-white/40 hover:bg-white/70'
                    : 'w-2 bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Car Details, Stats, Tuning & Customization */}
        <div className="lg:col-span-5 flex flex-col glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
          {/* Header & Tagline */}
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-pink-400 font-bold">
                TIER 0{selectedIdx + 1}
              </span>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white mt-0.5">
                {currentCar.name}
              </h2>
              <p className="text-xs text-white/50 mt-1 max-w-sm font-light leading-relaxed">
                {currentCar.tagline}
              </p>
            </div>

            {isSelected && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                ACTIVE
              </span>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 mt-5 mb-4">
            <button
              onClick={() => {
                soundManager.playUIClick();
                setActiveTab('specs');
              }}
              className={`pb-2.5 px-3 text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer ${
                activeTab === 'specs'
                  ? 'text-pink-400 border-b-2 border-pink-400'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Specs
            </button>
            <button
              onClick={() => {
                soundManager.playUIClick();
                setActiveTab('tuning');
              }}
              className={`pb-2.5 px-3 text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer ${
                activeTab === 'tuning'
                  ? 'text-pink-400 border-b-2 border-pink-400'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Tuning
            </button>
            <button
              onClick={() => {
                soundManager.playUIClick();
                setActiveTab('styling');
              }}
              className={`pb-2.5 px-3 text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer ${
                activeTab === 'styling'
                  ? 'text-pink-400 border-b-2 border-pink-400'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Styling
            </button>
          </div>

          {/* TAB 1: SPECS */}
          {activeTab === 'specs' && (
            <div className="space-y-3.5 my-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-white/60 uppercase tracking-wider">Top Speed</span>
                  <span className="text-white font-mono">{totalTopSpeed} km/h</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-300"
                    style={{ width: `${(totalTopSpeed / 330) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-white/60 uppercase tracking-wider">Acceleration</span>
                  <span className="text-white font-mono">
                    {(currentCar.stats.acceleration + carState.upgrades.engine * 0.4).toFixed(1)} / 10
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${((currentCar.stats.acceleration + carState.upgrades.engine * 0.4) / 10) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-white/60 uppercase tracking-wider">Drift & Handling</span>
                  <span className="text-white font-mono">
                    {(currentCar.stats.handling + carState.upgrades.handling * 0.35).toFixed(1)} / 10
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${((currentCar.stats.handling + carState.upgrades.handling * 0.35) / 10) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-white/60 uppercase tracking-wider">Nitro Capacity</span>
                  <span className="text-white font-mono">
                    {(currentCar.stats.nitroCapacity + carState.upgrades.nitro * 0.5).toFixed(1)} / 10
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${((currentCar.stats.nitroCapacity + carState.upgrades.nitro * 0.5) / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TUNING / UPGRADES */}
          {activeTab === 'tuning' && (
            <div className="space-y-3 my-1">
              {!isUnlocked ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] text-xs text-white/50">
                  <ShieldAlert size={14} className="text-pink-400" />
                  Unlock this vehicle first to install performance upgrades.
                </div>
              ) : (
                <>
                  {/* Engine upgrade */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={13} className="text-pink-400" />
                        Engine Tune
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        Stage {carState.upgrades.engine} / 3 • +16 km/h top speed
                      </div>
                    </div>
                    {carState.upgrades.engine < 3 ? (
                      <button
                        onClick={() => handleUpgrade('engine')}
                        disabled={gameData.coins < UPGRADE_PRICES.engine[carState.upgrades.engine]}
                        className="px-3 py-1.5 rounded-lg bg-pink-600/80 hover:bg-pink-500 disabled:opacity-40 disabled:hover:bg-pink-600/80 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {UPGRADE_PRICES.engine[carState.upgrades.engine]} CR
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                        MAXED
                      </span>
                    )}
                  </div>

                  {/* Handling upgrade */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={13} className="text-violet-400" />
                        Sport Suspension
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        Stage {carState.upgrades.handling} / 3 • Drift stability & response
                      </div>
                    </div>
                    {carState.upgrades.handling < 3 ? (
                      <button
                        onClick={() => handleUpgrade('handling')}
                        disabled={gameData.coins < UPGRADE_PRICES.handling[carState.upgrades.handling]}
                        className="px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600/80 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {UPGRADE_PRICES.handling[carState.upgrades.handling]} CR
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                        MAXED
                      </span>
                    )}
                  </div>

                  {/* Nitro upgrade */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={13} className="text-cyan-400" />
                        Dual Nitro Tank
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        Stage {carState.upgrades.nitro} / 3 • +25% capacity & duration
                      </div>
                    </div>
                    {carState.upgrades.nitro < 3 ? (
                      <button
                        onClick={() => handleUpgrade('nitro')}
                        disabled={gameData.coins < UPGRADE_PRICES.nitro[carState.upgrades.nitro]}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600/80 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {UPGRADE_PRICES.nitro[carState.upgrades.nitro]} CR
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                        MAXED
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: STYLING & UNDERGLOW */}
          {activeTab === 'styling' && (
            <div className="space-y-4 my-1">
              {/* Underglow Colors */}
              <div>
                <label className="text-[11px] uppercase tracking-widest text-white/60 font-semibold mb-2 block">
                  Neon Underglow Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {UNDERGLOW_COLORS.map((ug) => (
                    <button
                      key={ug.value}
                      onClick={() => handleSetUnderglow(ug.value)}
                      title={ug.name}
                      className={`h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        carState.customization.underglowColor === ug.value
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-white/20 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: ug.value }}
                    >
                      {carState.customization.underglowColor === ug.value && (
                        <Check size={14} className="text-black drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rim Styles */}
              <div>
                <label className="text-[11px] uppercase tracking-widest text-white/60 font-semibold mb-2 block">
                  Wheel Rim Pattern
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['mesh', 'aero', 'star', 'hex'] as RimStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => handleSetRim(style)}
                      className={`p-2 rounded-xl text-center text-xs uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
                        carState.customization.rimStyle === style
                          ? 'bg-pink-600/20 border-pink-500 text-white'
                          : 'glass-panel border-white/10 text-white/50 hover:text-white/80'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Primary Action Button (Unlock or Select) */}
          <div className="mt-5 pt-4 border-t border-white/10">
            {!isUnlocked ? (
              <button
                onClick={handleUnlockCar}
                disabled={gameData.coins < currentCar.price}
                className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:hover:bg-pink-600 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
              >
                <Lock size={15} />
                <span>
                  {gameData.coins < currentCar.price
                    ? `NEED ${(currentCar.price - gameData.coins).toLocaleString()} MORE CR`
                    : `UNLOCK FOR ${currentCar.price.toLocaleString()} CR`}
                </span>
              </button>
            ) : isSelected ? (
              <button
                onClick={() => {
                  soundManager.playUIClick();
                  onNavigate('track_select');
                }}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                <Play size={15} />
                <span>RACE WITH THIS CAR</span>
              </button>
            ) : (
              <button
                onClick={handleSelectCar}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check size={15} />
                <span>SELECT CAR</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
