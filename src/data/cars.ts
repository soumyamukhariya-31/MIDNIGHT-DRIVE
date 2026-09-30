import { CarDefinition } from '../types/game';

export const CARS: CarDefinition[] = [
  {
    id: 'spectre_gt',
    name: 'Spectre GT',
    tagline: 'Balanced precision, engineered for the midnight city streets.',
    price: 0,
    stats: {
      topSpeed: 215,
      acceleration: 6.8,
      handling: 7.2,
      nitroCapacity: 6.5,
    },
    baseColor: '#252530',
    accentColor: '#ec4899',
    unlockedByDefault: true,
  },
  {
    id: 'valkyrie_r',
    name: 'Valkyrie R',
    tagline: 'Streamlined longtail hypercar built for pure straight-line supremacy.',
    price: 900,
    stats: {
      topSpeed: 248,
      acceleration: 7.6,
      handling: 6.4,
      nitroCapacity: 7.0,
    },
    baseColor: '#181b22',
    accentColor: '#38bdf8',
  },
  {
    id: 'aethelgard_apex',
    name: 'Aethelgard Apex',
    tagline: 'Featherweight tuned chassis with laser-sharp drift responsiveness.',
    price: 1800,
    stats: {
      topSpeed: 232,
      acceleration: 8.2,
      handling: 9.4,
      nitroCapacity: 7.8,
    },
    baseColor: '#241a2e',
    accentColor: '#c084fc',
  },
  {
    id: 'obsidian_phantom',
    name: 'Obsidian Phantom',
    tagline: 'Twin-turbocharged heavyweight muscle with violent low-end torque.',
    price: 2900,
    stats: {
      topSpeed: 260,
      acceleration: 9.0,
      handling: 6.8,
      nitroCapacity: 8.5,
    },
    baseColor: '#121214',
    accentColor: '#fb7185',
  },
  {
    id: 'solaris_evo',
    name: 'Solaris Evo',
    tagline: 'Futuristic hybrid prototype with dual-core nitro boost discharge.',
    price: 4400,
    stats: {
      topSpeed: 278,
      acceleration: 9.4,
      handling: 8.6,
      nitroCapacity: 9.8,
    },
    baseColor: '#1e1c28',
    accentColor: '#f43f5e',
  },
  {
    id: 'nocturne_koenig',
    name: 'Nocturne Koenig',
    tagline: 'The undisputed monarch of the dark. Peak speed, downforce, and elegance.',
    price: 6500,
    stats: {
      topSpeed: 305,
      acceleration: 9.9,
      handling: 9.6,
      nitroCapacity: 10.0,
    },
    baseColor: '#0d0d12',
    accentColor: '#e879f9',
  },
];

export const UNDERGLOW_COLORS = [
  { name: 'Neon Rose', value: '#f43f5e' },
  { name: 'Electric Violet', value: '#a855f7' },
  { name: 'Cyber Cyan', value: '#06b6d4' },
  { name: 'Dusty Pink', value: '#ec4899' },
  { name: 'Sunset Amber', value: '#f59e0b' },
  { name: 'Ghost White', value: '#e2e8f0' },
];

export const UPGRADE_PRICES = {
  engine: [400, 950, 1800],
  handling: [350, 850, 1600],
  nitro: [300, 750, 1500],
};
