import AsyncStorage from '@react-native-async-storage/async-storage';

export type DiamondShape = 'rhombus' | 'circle';
export type DiamondCount = '9_5' | '7_3';
export type WoodFinish = 'ebony' | 'mahogany' | 'walnut';

export interface ClothSkinPreset {
  id: string;
  name: string;
  hex: string;
  description: string;
}

export const CLOTH_SKIN_PRESETS: ClothSkinPreset[] = [
  {
    id: 'tournament_blue',
    name: 'Azul Torneo',
    hex: '#10638c',
    description: 'Simonis 300 Rapide Oficial UMB',
  },
  {
    id: 'simonis_green',
    name: 'Verde Clásico',
    hex: '#13654e',
    description: 'Verde tradicional de carambola',
  },
  {
    id: 'dufferin_burgundy',
    name: 'Tinto Borgoña',
    hex: '#7b1828',
    description: 'Elegante terciopelo granate',
  },
  {
    id: 'royal_navy',
    name: 'Azul Marino',
    hex: '#0f243d',
    description: 'Azul noche profundo de alta visibilidad',
  },
  {
    id: 'slate_charcoal',
    name: 'Gris Antracita',
    hex: '#2b3440',
    description: 'Estilo moderno minimalista',
  },
  {
    id: 'golden_camel',
    name: 'Camel Dorado',
    hex: '#8c592a',
    description: 'Tono habano cálido clásico',
  },
];

export interface TablePreferences {
  clothColor: string; // Preset id or raw hex ('#10638c')
  diamondShape: DiamondShape; // 'rhombus' (rombos al centro) | 'circle' (puntos)
  diamondCount: DiamondCount; // '9_5' (9 largas, 5 cortas) | '7_3' (7 largas, 3 cortas)
  showCornerDiamonds: boolean; // Mostrar u ocultar diamantes en las esquinas
  showGrid: boolean; // Cuadrícula táctica 8x4
  showDiamondNumbers: boolean; // Numeración del sistema de diamantes
  woodFinish: WoodFinish; // Acabado de la madera del pasamanos
}

export const DEFAULT_TABLE_PREFERENCES: TablePreferences = {
  clothColor: 'tournament_blue',
  diamondShape: 'rhombus',
  diamondCount: '9_5',
  showCornerDiamonds: true,
  showGrid: true,
  showDiamondNumbers: false,
  woodFinish: 'ebony',
};

const STORAGE_KEY = '@bandaro_table_preferences_v1';

export async function loadTablePreferences(): Promise<TablePreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_TABLE_PREFERENCES, ...parsed };
    }
  } catch (err) {
    console.warn('[TablePreferences] Failed to load preferences:', err);
  }
  return DEFAULT_TABLE_PREFERENCES;
}

export async function saveTablePreferences(prefs: TablePreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('[TablePreferences] Failed to save preferences:', err);
  }
}

/**
 * Smoothly scales color lightness preserving hue and chroma.
 * factor >= 0: tints towards white (highlight luster)
 * factor < 0: shades down multiplicatively (preserves rich color, never crushes to black)
 */
export function adjustBrightness(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return hex;

  const fullHex = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;

  const num = parseInt(fullHex, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;

  let newR: number;
  let newG: number;
  let newB: number;

  if (factor >= 0) {
    newR = Math.round(r + (255 - r) * factor);
    newG = Math.round(g + (255 - g) * factor);
    newB = Math.round(b + (255 - b) * factor);
  } else {
    // Multiplicative darkening: keeps color hue intact, never plunges prematurely to 0
    const mult = Math.max(0.08, 1 + factor);
    newR = Math.round(r * mult);
    newG = Math.round(g * mult);
    newB = Math.round(b * mult);
  }

  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Resolves full 3D lighting and cushion colors for any cloth color (preset or custom hex).
 * Maintains full vibrancy across the entire table with gentle tournament lighting.
 */
export function resolveClothPalette(clothColor: string) {
  let baseHex = '#10638c'; // default tournament blue

  const preset = CLOTH_SKIN_PRESETS.find((p) => p.id === clothColor);
  if (preset) {
    baseHex = preset.hex;
  } else if (clothColor.startsWith('#') && (clothColor.length === 7 || clothColor.length === 4)) {
    baseHex = clothColor;
  }

  return {
    base: baseHex,
    // Soft overhead luminaire: bright luster in center, rich tone at edges (NOT black)
    highlight: adjustBrightness(baseHex, 0.14),
    edge: adjustBrightness(baseHex, -0.10), // only 10% deeper shade at outer edges
    deepDark: adjustBrightness(baseHex, -0.15),
    // Cushions wrapped in the same cloth: natural lighting variations
    cushionTop: adjustBrightness(baseHex, 0.05),     // catches overhead light
    cushionBottom: adjustBrightness(baseHex, -0.12), // soft lower shade
    cushionLeft: adjustBrightness(baseHex, -0.06),   // left cushion
    cushionRight: adjustBrightness(baseHex, -0.08),  // right cushion
    cushionNose: adjustBrightness(baseHex, 0.20),    // crisp inner nose boundary
  };
}

/**
 * Resolves hardwood rail gradient colors based on wood finish.
 */
export function resolveWoodPalette(finish: WoodFinish = 'ebony') {
  switch (finish) {
    case 'mahogany':
      return {
        start: '#3b1812',
        mid: '#2b100a',
        end: '#1a0805',
        bevel: '#4d2019',
      };
    case 'walnut':
      return {
        start: '#3a2718',
        mid: '#281a10',
        end: '#170e08',
        bevel: '#4c3321',
      };
    case 'ebony':
    default:
      return {
        start: '#2c1a11',
        mid: '#1e120c',
        end: '#140b07',
        bevel: '#3d251a',
      };
  }
}
