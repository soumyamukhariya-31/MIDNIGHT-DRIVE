import { CARS } from '../data/cars';
import { GameSettings, PlayerCarState, RimStyle, TrackId, TrackRecord } from '../types/game';

const STORAGE_KEYS = {
  COINS: 'midnight_drive_coins_v1',
  SELECTED_CAR: 'midnight_drive_selected_car_v1',
  CARS_STATE: 'midnight_drive_cars_state_v1',
  RECORDS: 'midnight_drive_records_v1',
  SETTINGS: 'midnight_drive_settings_v1',
};

export interface StoredGameData {
  coins: number;
  selectedCarId: string;
  cars: Record<string, PlayerCarState>;
  records: Record<TrackId, TrackRecord>;
  settings: GameSettings;
}

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.85,
  sfxVolume: 0.9,
  engineVolume: 0.85,
  musicVolume: 0.75,
  touchControls: false,
  graphicsQuality: 'high',
};

const DEFAULT_CARS_STATE: Record<string, PlayerCarState> = CARS.reduce((acc, car) => {
  acc[car.id] = {
    unlocked: car.unlockedByDefault || false,
    upgrades: { engine: 0, handling: 0, nitro: 0 },
    customization: {
      underglowColor: car.accentColor,
      rimStyle: 'mesh' as RimStyle,
    },
  };
  return acc;
}, {} as Record<string, PlayerCarState>);

const DEFAULT_RECORDS: Record<TrackId, TrackRecord> = {
  midnight_city: { bestLapTime: 0, bestRaceTime: 0, lastPlayed: 0 },
  rainy_boulevard: { bestLapTime: 0, bestRaceTime: 0, lastPlayed: 0 },
  sunset_highway: { bestLapTime: 0, bestRaceTime: 0, lastPlayed: 0 },
};

export const loadGameData = (): StoredGameData => {
  try {
    const coinsStr = localStorage.getItem(STORAGE_KEYS.COINS);
    const selectedCar = localStorage.getItem(STORAGE_KEYS.SELECTED_CAR) || 'spectre_gt';
    const carsStr = localStorage.getItem(STORAGE_KEYS.CARS_STATE);
    const recordsStr = localStorage.getItem(STORAGE_KEYS.RECORDS);
    const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);

    const coins = coinsStr !== null ? parseInt(coinsStr, 10) : 250; // Give starting 250 coins
    const cars = carsStr ? { ...DEFAULT_CARS_STATE, ...JSON.parse(carsStr) } : DEFAULT_CARS_STATE;
    const records = recordsStr ? { ...DEFAULT_RECORDS, ...JSON.parse(recordsStr) } : DEFAULT_RECORDS;
    const settings = settingsStr ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsStr) } : DEFAULT_SETTINGS;

    return {
      coins,
      selectedCarId: selectedCar,
      cars,
      records,
      settings,
    };
  } catch (e) {
    console.warn('Failed to load storage, using defaults:', e);
    return {
      coins: 250,
      selectedCarId: 'spectre_gt',
      cars: DEFAULT_CARS_STATE,
      records: DEFAULT_RECORDS,
      settings: DEFAULT_SETTINGS,
    };
  }
};

export const saveGameData = (data: Partial<StoredGameData>) => {
  try {
    if (data.coins !== undefined) {
      localStorage.setItem(STORAGE_KEYS.COINS, data.coins.toString());
    }
    if (data.selectedCarId !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CAR, data.selectedCarId);
    }
    if (data.cars !== undefined) {
      localStorage.setItem(STORAGE_KEYS.CARS_STATE, JSON.stringify(data.cars));
    }
    if (data.records !== undefined) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(data.records));
    }
    if (data.settings !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};
