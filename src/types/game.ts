export type GameScreen = 'menu' | 'garage' | 'track_select' | 'race' | 'records' | 'settings';

export type TrackId = 'midnight_city' | 'rainy_boulevard' | 'sunset_highway';

export type RimStyle = 'mesh' | 'aero' | 'star' | 'hex';

export interface CarStats {
  topSpeed: number;     // e.g. 180 - 320 km/h
  acceleration: number; // 1 - 10
  handling: number;     // 1 - 10
  nitroCapacity: number;// 1 - 10
}

export interface CarUpgrades {
  engine: number;   // 0 to 3
  handling: number; // 0 to 3
  nitro: number;    // 0 to 3
}

export interface CarDefinition {
  id: string;
  name: string;
  tagline: string;
  price: number;
  stats: CarStats;
  baseColor: string;
  accentColor: string;
  unlockedByDefault?: boolean;
}

export interface TrackDefinition {
  id: TrackId;
  name: string;
  subtitle: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'EXPERT';
  laps: number;
  lengthKm: number;
  skyColor: string;
  ambientColor: string;
  fogColor: string;
  fogDensity: number;
  rain: boolean;
  neonTheme: 'pink_violet' | 'amber_blue' | 'sunset_gold';
}

export interface PlayerCustomization {
  underglowColor: string;
  rimStyle: RimStyle;
}

export interface PlayerCarState {
  unlocked: boolean;
  upgrades: CarUpgrades;
  customization: PlayerCustomization;
}

export interface TrackRecord {
  bestLapTime: number; // seconds
  bestRaceTime: number; // seconds
  lastPlayed: number; // timestamp
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  engineVolume: number;
  musicVolume: number;
  touchControls: boolean;
  graphicsQuality: 'high' | 'medium';
}

export interface RaceResult {
  trackId: TrackId;
  trackName: string;
  carName: string;
  position: number;
  totalTime: number;
  bestLapTime: number;
  driftScore: number;
  nearMissCount: number;
  coinsEarned: number;
  newRecord: boolean;
}

export interface GameInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  nitro: boolean;
  restart: boolean;
}
