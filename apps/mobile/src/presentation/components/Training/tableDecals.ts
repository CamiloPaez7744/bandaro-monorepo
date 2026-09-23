import { TableDecal } from './tablePreferences';

export interface TableDecalDef {
  id: TableDecal;
  name: string;
  category: 'street' | 'tournament' | 'luxury' | 'classic';
  description: string;
  defaultOpacity: number;
  badge: string;
  isImage?: boolean;
  imageSource?: any;
}

// Calcomanía de Calavera (Skull) en alta resolución para marca de agua en paño
export const SKULL_DECAL_SOURCE = require('@/assets/decals/skull.png');

export const TABLE_DECAL_DEFS: TableDecalDef[] = [
  {
    id: 'none',
    name: 'Sin Calcomanía',
    category: 'classic',
    description: 'Paño liso y despejado sin ninguna marca de agua central.',
    defaultOpacity: 0,
    badge: '❖',
    isImage: false,
  },
  {
    id: 'skull',
    name: 'Calavera & Tacos (Skull)',
    category: 'street',
    description: 'Ilustración tattoo de calavera con tacos cruzados, estelas de humo y bolas de carambola.',
    defaultOpacity: 0.18,
    badge: '💀',
    isImage: true,
    imageSource: SKULL_DECAL_SOURCE,
  },
  {
    id: 'tournament_crest',
    name: 'Emblema UMB Oficial',
    category: 'tournament',
    description: 'Sello circular de torneo profesional con triple mira concéntrica.',
    defaultOpacity: 0.14,
    badge: '🏆',
    isImage: false,
  },
  {
    id: 'crown_filigree',
    name: 'Corona Royal VIP',
    category: 'luxury',
    description: 'Corona imperial dorada con filigranas de alta gama para salones de lujo.',
    defaultOpacity: 0.14,
    badge: '👑',
    isImage: false,
  },
  {
    id: 'cyber_rings',
    name: 'Anillos Cyber Arcade',
    category: 'street',
    description: 'Órbitas futuristas de neón luminiscente inspiradas en Neo-Tokyo.',
    defaultOpacity: 0.16,
    badge: '🌐',
    isImage: false,
  },
  {
    id: 'classic_carom',
    name: 'Trío Carambola UMB',
    category: 'classic',
    description: 'Triángulo canónico de las 3 bolas de billar con estela geométrica.',
    defaultOpacity: 0.13,
    badge: '🎱',
    isImage: false,
  },
];
