import { TableDecal } from './tablePreferences';

export interface TableDecalDef {
  id: TableDecal;
  name: string;
  category: 'street' | 'tournament' | 'luxury' | 'classic';
  defaultOpacity: number;
  badge: string;
  isImage?: boolean;
  imageSource?: any;
}

// Fuentes de calcomanías de paño en alta resolución con fondo transparente
export const BLACKHOLE_DECAL_SOURCE = require('@/assets/decals/blackhole.png');
export const SKULL_DECAL_SOURCE = require('@/assets/decals/skull.png');
export const CONSTELACION_DECAL_SOURCE = require('@/assets/decals/constelacion.png');
export const PULPO_DECAL_SOURCE = require('@/assets/decals/pulpo.png');
export const TIBURON_DECAL_SOURCE = require('@/assets/decals/tiburon.png');
export const TIGRE_DECAL_SOURCE = require('@/assets/decals/tigre.png');
export const TROFEO_DECAL_SOURCE = require('@/assets/decals/trofeo.png');

export const TABLE_DECAL_DEFS: TableDecalDef[] = [
  {
    id: 'blackhole',
    name: 'Black Hole',
    category: 'street',
    defaultOpacity: 0.22,
    badge: '🕳️',
    isImage: true,
    imageSource: BLACKHOLE_DECAL_SOURCE,
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'street',
    defaultOpacity: 0.18,
    badge: '💀',
    isImage: true,
    imageSource: SKULL_DECAL_SOURCE,
  },
  {
    id: 'constelacion',
    name: 'Constelación',
    category: 'classic',
    defaultOpacity: 0.20,
    badge: '✨',
    isImage: true,
    imageSource: CONSTELACION_DECAL_SOURCE,
  },
  {
    id: 'pulpo',
    name: 'Pulpo',
    category: 'street',
    defaultOpacity: 0.20,
    badge: '🐙',
    isImage: true,
    imageSource: PULPO_DECAL_SOURCE,
  },
  {
    id: 'tiburon',
    name: 'Tiburón',
    category: 'street',
    defaultOpacity: 0.20,
    badge: '🦈',
    isImage: true,
    imageSource: TIBURON_DECAL_SOURCE,
  },
  {
    id: 'tigre',
    name: 'Tigre',
    category: 'street',
    defaultOpacity: 0.20,
    badge: '🐅',
    isImage: true,
    imageSource: TIGRE_DECAL_SOURCE,
  },
  {
    id: 'trofeo',
    name: 'Trofeo',
    category: 'tournament',
    defaultOpacity: 0.20,
    badge: '🏆',
    isImage: true,
    imageSource: TROFEO_DECAL_SOURCE,
  },
  {
    id: 'none',
    name: 'Sin Calcomanía',
    category: 'classic',
    defaultOpacity: 0,
    badge: '❖',
    isImage: false,
  },
];

/**
 * Retorna la fuente de imagen para el decal seleccionado o null si no tiene imagen / none.
 */
export function getTableDecalSource(decalId: TableDecal | string): any | null {
  switch (decalId) {
    case 'blackhole':
      return BLACKHOLE_DECAL_SOURCE;
    case 'skull':
      return SKULL_DECAL_SOURCE;
    case 'constelacion':
      return CONSTELACION_DECAL_SOURCE;
    case 'pulpo':
      return PULPO_DECAL_SOURCE;
    case 'tiburon':
      return TIBURON_DECAL_SOURCE;
    case 'tigre':
      return TIGRE_DECAL_SOURCE;
    case 'trofeo':
      return TROFEO_DECAL_SOURCE;
    default:
      return null;
  }
}
