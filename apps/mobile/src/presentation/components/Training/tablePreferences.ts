import AsyncStorage from '@react-native-async-storage/async-storage';
import { BreakFormat, PbaFormationId, BallId } from '@bandaro/core';
import { useState, useEffect, useCallback } from 'react';

export type DiamondShape = 'rhombus' | 'circle';
export type DiamondCount = '9_5' | '7_3';
export type WoodFinish = 'ebony' | 'mahogany' | 'walnut';
export type CornerMetalStyle = 'brass' | 'gold_24k' | 'chrome' | 'neon_cyan' | 'antique_bronze';
export type TableDecal =
  | 'blackhole'
  | 'skull'
  | 'constelacion'
  | 'pulpo'
  | 'tiburon'
  | 'tigre'
  | 'trofeo'
  | 'none';

export interface ClothSkinPreset {
  id: string;
  name: string;
  hex: string;
  description: string;
}

export interface TableArenaSkin {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  clothColor: string;
  clothVignetteHex: string;
  woodFinish: WoodFinish;
  cornerMetal: CornerMetalStyle;
  diamondShape: DiamondShape;
  diamondColor: string;
  tableDecal: TableDecal;
  accentGlow: string;
}

export const TABLE_ARENA_SKINS: TableArenaSkin[] = [
  {
    id: 'rebel_skull',
    name: 'Rebel Skull Arena',
    subtitle: 'Edición Calavera Street & Rock',
    description: 'Diseño audaz con la icónica marca de agua Calavera (Skull), paño gris carbón de alta visibilidad, madera de ébano y cantoneras cromadas.',
    clothColor: '#1e293b',
    clothVignetteHex: '#0f172a',
    woodFinish: 'ebony',
    cornerMetal: 'chrome',
    diamondShape: 'rhombus',
    diamondColor: '#f8fafc',
    tableDecal: 'skull',
    accentGlow: '#94a3b8',
  },
  {
    id: 'tournament_umb',
    name: 'Arena Torneo UMB',
    subtitle: 'Simonis 300 Rapide Oficial',
    description: 'La mesa oficial de los campeonatos mundiales. Paño azul clásico, madera noble de caoba y cantoneras de bronce satinado.',
    clothColor: '#10638c',
    clothVignetteHex: '#1b80b0',
    woodFinish: 'mahogany',
    cornerMetal: 'brass',
    diamondShape: 'rhombus',
    diamondColor: '#f1f5f9',
    tableDecal: 'trofeo',
    accentGlow: '#38bdf8',
  },
  {
    id: 'royal_high_roller',
    name: 'Royal High Roller',
    subtitle: 'Edición Las Vegas VIP',
    description: 'Lujo absoluto: paño azul noche con filigranas de oro, madera negro piano laqueado y esquineras de oro de 24 quilates.',
    clothColor: '#0b192c',
    clothVignetteHex: '#142c4c',
    woodFinish: 'ebony',
    cornerMetal: 'gold_24k',
    diamondShape: 'rhombus',
    diamondColor: '#fbbf24',
    tableDecal: 'trofeo',
    accentGlow: '#fbbf24',
  },
  {
    id: 'neo_tokyo_cyber',
    name: 'Neo-Tokyo Cybercarom',
    subtitle: 'Futurista & Luminiscente',
    description: 'Estética ciberpunk arcade: paño grafito/cian eléctrico, marco negro de fibra de carbono e inserciones de neón cian radiante.',
    clothColor: '#081d28',
    clothVignetteHex: '#0c354a',
    woodFinish: 'ebony',
    cornerMetal: 'neon_cyan',
    diamondShape: 'circle',
    diamondColor: '#22d3ee',
    tableDecal: 'blackhole',
    accentGlow: '#06b6d4',
  },
  {
    id: 'monte_carlo_luxe',
    name: 'Monte Carlo Grand Luxe',
    subtitle: 'Granate Francés & Platino',
    description: 'Elegancia clásica europea: paño de terciopelo borgoña tinto, madera de nogal italiano y cantoneras de platino cromado.',
    clothColor: '#6b1422',
    clothVignetteHex: '#881b2d',
    woodFinish: 'walnut',
    cornerMetal: 'chrome',
    diamondShape: 'rhombus',
    diamondColor: '#ffffff',
    tableDecal: 'tigre',
    accentGlow: '#f43f5e',
  },
  {
    id: 'emerald_classic',
    name: 'Esmeralda Tradicional',
    subtitle: 'El Billar de Siempre',
    description: 'El verde eterno del billar clásico, realzado con maderas cálidas de roble oscuro y cantoneras de latón envejecido.',
    clothColor: '#0d5c3a',
    clothVignetteHex: '#13784d',
    woodFinish: 'walnut',
    cornerMetal: 'antique_bronze',
    diamondShape: 'circle',
    diamondColor: '#fef08a',
    tableDecal: 'constelacion',
    accentGlow: '#4ade80',
  },
];

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

export type CueSkinId = 'venom_azure' | 'classic_gold' | 'carbon_stealth';

export interface CueSkinPreset {
  id: CueSkinId;
  name: string;
  subtitle: string;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export const CUE_SKIN_PRESETS: CueSkinPreset[] = [
  {
    id: 'venom_azure',
    name: 'Venom Azure WS',
    subtitle: 'Edición Pro Sin Letras • Neón Azul Eléctrico',
    description: 'Inspirado en el taco Venom Win Streak: proporciones esbeltas de competición, cuerpo negro grafito, flecha de arce oscuro y llamas geométricas de púas en azul cian vibrante.',
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
  },
  {
    id: 'classic_gold',
    name: 'Clásico Ébano & Oro',
    subtitle: 'Arce Canadiense Seleccionado',
    description: 'Flecha tradicional en arce canadiense rubio, empuñadura de hilo irlandés negro, incrustaciones de cuatro puntas y anillos de oro 24K pulido.',
    primaryColor: '#eab308',
    accentColor: '#fef08a',
  },
  {
    id: 'carbon_stealth',
    name: 'Carbon Stealth',
    subtitle: 'Fibra de Carbono Mate & Titanio',
    description: 'Estructura ultraligera de carbono aeroespacial tejido en patrón sarga, collarín de titanio cepillado y acentos carmesí de alta precisión.',
    primaryColor: '#ef4444',
    accentColor: '#f87171',
  },
];

export type BallSkinId = 'aramith_pro_cup' | 'cosmo_helix_pba' | 'dynaspheres' | 'classic_solid';

export interface BallSkinPreset {
  id: BallSkinId;
  name: string;
  subtitle: string;
  manufacturer: string;
  origin: string;
  description: string;
  dotsColorWhite: string;
  dotsColorYellow: string;
  dotsColorRed?: string;
  hasRings?: boolean;
}

export const BALL_SKIN_PRESETS: BallSkinPreset[] = [
  {
    id: 'aramith_pro_cup',
    name: 'Super Aramith Pro-Cup (UMB)',
    subtitle: 'Estándar Oficial UMB Mundial',
    manufacturer: 'Saluc (Bélgica)',
    origin: 'Bélgica 🇧🇪',
    description: 'Resina fenólica pura con los célebres 6 puntos rojos (measle dots) para máxima precisión de lectura de rotación.',
    dotsColorWhite: '#dc2626',
    dotsColorYellow: '#dc2626',
  },
  {
    id: 'cosmo_helix_pba',
    name: 'Cosmo Helix Vision (PBA)',
    subtitle: 'Estándar Oficial PBA Tour Corea',
    manufacturer: 'Cosmos Billiards (Corea)',
    origin: 'Corea del Sur 🇰🇷',
    description: 'Tecnología Vision para transmisiones TV 4K con 6 puntos azul cian neón de alto contraste y anillos de rotación.',
    dotsColorWhite: '#00e5ff',
    dotsColorYellow: '#0284c7',
    dotsColorRed: '#ffffff',
    hasRings: true,
  },
  {
    id: 'dynaspheres',
    name: 'Dynaspheres Platinum Carom',
    subtitle: 'Diseño Rotor Dynamic de Compás',
    manufacturer: 'Dynaspheres',
    origin: 'Bélgica / Internacional 🌐',
    description: 'Patrón de rotor concéntrico en gris platino y cobalto para visualizar el eje giroscópico exacto.',
    dotsColorWhite: '#475569',
    dotsColorYellow: '#3b82f6',
    hasRings: true,
  },
  {
    id: 'classic_solid',
    name: 'Clásica Tradicional (Solid Vintage)',
    subtitle: 'Acabado Marfil & Rubí Liso',
    manufacturer: 'Tradicional',
    origin: 'Vintage 🏛️',
    description: 'Bolas lisas de competición tradicional con punto único sutil de identificación.',
    dotsColorWhite: '#000000',
    dotsColorYellow: '#dc2626',
  },
];

export interface TablePreferences {
  activeSkinId: string; // 'tournament_umb' | 'royal_high_roller' | ...
  clothColor: string; // Preset id or raw hex ('#10638c')
  diamondShape: DiamondShape; // 'rhombus' | 'circle'
  diamondCount: DiamondCount; // '9_5' | '7_3'
  showCornerDiamonds: boolean; // Mostrar u ocultar diamantes en las esquinas
  showGrid: boolean; // Cuadrícula táctica 8x4
  showDiamondNumbers: boolean; // Numeración del sistema de diamantes
  woodFinish: WoodFinish; // Acabado de la madera del pasamanos
  cornerMetal: CornerMetalStyle; // Estilo metálico de las cantoneras
  tableDecal: TableDecal; // Marca de agua central del paño
  decalOpacity: number; // Opacidad de la marca de agua del paño (0.05 a 0.50)
  showSpotlight: boolean; // Luz cenital de estadio
  showTableDecal: boolean; // Mostrar emblema central
  cueSkin: CueSkinId; // Modelo visual del taco de billar
  ballSkin: BallSkinId; // Skin visual del set de bolas
  showBallDots: boolean; // Mostrar puntos de rotación
  cueBallId?: BallId; // Bola tiradora preferida del jugador ('white' o 'yellow')
  breakFormat: BreakFormat; // Formato de salida por defecto ('umb' o 'pba')
  pbaFormation: PbaFormationId; // Formación PBA ('159', '357', '258', etc.)
  umbSide: 'right' | 'left'; // Lado de la bola blanca en UMB ('right' o 'left')
}

export const DEFAULT_TABLE_PREFERENCES: TablePreferences = {
  activeSkinId: 'tournament_umb',
  clothColor: 'tournament_blue',
  diamondShape: 'rhombus',
  diamondCount: '9_5',
  showCornerDiamonds: true,
  showGrid: true,
  showDiamondNumbers: false,
  woodFinish: 'mahogany',
  cornerMetal: 'brass',
  tableDecal: 'blackhole',
  decalOpacity: 0.20,
  showSpotlight: true,
  showTableDecal: true,
  cueSkin: 'venom_azure',
  ballSkin: 'aramith_pro_cup',
  showBallDots: true,
  cueBallId: 'white',
  breakFormat: 'umb',
  pbaFormation: '159',
  umbSide: 'right',
};

const STORAGE_KEY = '@bandaro_table_preferences_v1';

// In-memory cache for synchronous availability across all components
let cachedTablePreferences: TablePreferences = { ...DEFAULT_TABLE_PREFERENCES };
let isHydratedFromStorage = false;
const preferenceListeners = new Set<(prefs: TablePreferences) => void>();

/**
 * Returns current in-memory cached table preferences synchronously (never blocks or delays).
 */
export function getCachedTablePreferences(): TablePreferences {
  return cachedTablePreferences;
}

/**
 * Subscribes a listener callback to any preferences changes.
 * Calls listener immediately with current cached preferences, and returns an unsubscribe function.
 */
export function subscribeTablePreferences(listener: (prefs: TablePreferences) => void): () => void {
  preferenceListeners.add(listener);
  listener(cachedTablePreferences);
  return () => {
    preferenceListeners.delete(listener);
  };
}

export async function loadTablePreferences(): Promise<TablePreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedTablePreferences = { ...DEFAULT_TABLE_PREFERENCES, ...parsed };
      isHydratedFromStorage = true;
      preferenceListeners.forEach((listener) => {
        try {
          listener(cachedTablePreferences);
        } catch (e) {
          console.warn('[TablePreferences] Listener error:', e);
        }
      });
      return cachedTablePreferences;
    }
  } catch (err) {
    console.warn('[TablePreferences] Failed to load preferences:', err);
  }
  isHydratedFromStorage = true;
  return cachedTablePreferences;
}

// Auto-hydrate cache in background as soon as module loads
loadTablePreferences().catch(() => {});

export async function saveTablePreferences(prefs: TablePreferences): Promise<void> {
  // Update in-memory cache and notify all listeners immediately (synchronous reactive update)
  cachedTablePreferences = { ...prefs };
  preferenceListeners.forEach((listener) => {
    try {
      listener(cachedTablePreferences);
    } catch (e) {
      console.warn('[TablePreferences] Listener error:', e);
    }
  });

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('[TablePreferences] Failed to save preferences:', err);
  }
}

/**
 * React hook to consume and update table preferences reactively across any modal or component.
 * Automatically synchronizes changes without needing a page refresh or manual re-load.
 */
export function useTablePreferences(overridePreferences?: Partial<TablePreferences>): {
  preferences: TablePreferences;
  updatePreferences: (newPrefs: TablePreferences) => void;
} {
  const [prefs, setPrefs] = useState<TablePreferences>(
    overridePreferences ? { ...cachedTablePreferences, ...overridePreferences } : cachedTablePreferences
  );

  useEffect(() => {
    if (overridePreferences) {
      setPrefs({ ...cachedTablePreferences, ...overridePreferences });
      return;
    }

    return subscribeTablePreferences((latest) => {
      setPrefs(latest);
    });
  }, [overridePreferences]);

  const updatePreferences = useCallback((newPrefs: TablePreferences) => {
    saveTablePreferences(newPrefs).catch(() => {});
  }, []);

  return {
    preferences: prefs,
    updatePreferences,
  };
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

/**
 * Resolves metallic corner bracket gradient colors.
 */
export function resolveCornerMetalPalette(style: CornerMetalStyle = 'brass') {
  switch (style) {
    case 'gold_24k':
      return {
        base: '#d97706',
        highlight: '#fef08a',
        mid: '#f59e0b',
        dark: '#78350f',
        rivet: '#fde047',
        border: 'rgba(254, 240, 138, 0.6)',
      };
    case 'chrome':
      return {
        base: '#94a3b8',
        highlight: '#f8fafc',
        mid: '#cbd5e1',
        dark: '#334155',
        rivet: '#e2e8f0',
        border: 'rgba(248, 250, 252, 0.7)',
      };
    case 'neon_cyan':
      return {
        base: '#0891b2',
        highlight: '#67e8f9',
        mid: '#06b6d4',
        dark: '#164e63',
        rivet: '#a5f3fc',
        border: 'rgba(103, 232, 249, 0.8)',
      };
    case 'antique_bronze':
      return {
        base: '#78350f',
        highlight: '#d97706',
        mid: '#92400e',
        dark: '#451a03',
        rivet: '#b45309',
        border: 'rgba(217, 119, 6, 0.5)',
      };
    case 'brass':
    default:
      return {
        base: '#b45309',
        highlight: '#fef3c7',
        mid: '#d97706',
        dark: '#451a03',
        rivet: '#fcd34d',
        border: 'rgba(254, 243, 199, 0.5)',
      };
  }
}

/**
 * Applies a full table arena skin to a preferences object.
 */
export function applyArenaSkin(skinId: string, currentPrefs: TablePreferences): TablePreferences {
  const skin = TABLE_ARENA_SKINS.find((s) => s.id === skinId);
  if (!skin) return currentPrefs;

  return {
    ...currentPrefs,
    activeSkinId: skin.id,
    clothColor: skin.clothColor,
    woodFinish: skin.woodFinish,
    cornerMetal: skin.cornerMetal,
    diamondShape: skin.diamondShape,
    tableDecal: skin.tableDecal,
    showTableDecal: skin.tableDecal !== 'none',
  };
}

