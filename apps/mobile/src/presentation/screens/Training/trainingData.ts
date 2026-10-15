import { type SpinEffect } from '@bandaro/core';

export type EffectKey =
    | 'center'
    | 'top'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'left'
    | 'top-left';

export type ContactKey = '1/2' | '1/4' | '1/8' | '1/16';

export interface Point2D {
    x: number;
    y: number;
}

export interface TrainingPosition {
    id: string;
    name?: string;
    category?: string;
    hint?: string;
    white: Point2D;
    yellow: Point2D;
    red: Point2D;
    trajectory: Point2D[];
}

export interface SystemDiamondNumber {
    diamond: number;
    x: number;
    y: number;
    value: string;
}

export interface SegmentedTrajectoryDefinition {
    id: string;
    label: string;
    color: string;
    description: string;
}

export interface CheatSheetShot {
    attack: number;
    arrival: number;
    departure?: number;
    arrival3rd?: number;
    arrival4th?: number;
    points1to3: Point2D[];
    points3to4: Point2D[];
    points4to5: Point2D[];
}

export interface CheatSheetOrigin {
    origin: number;
    name: string;
    shots: CheatSheetShot[];
}

export interface TrainingSystem {
    id: string;
    name: string;
    subtitle: string;
    description?: string;
    difficulty: 'basic' | 'intermediate' | 'advanced';
    focus: string;
    recommendedPower: number;
    recommendedEffect: EffectKey;
    rules: string[];
    positions: TrainingPosition[];
    author?: string;
    youtubeUrl?: string;
    diagramUrl?: string;
    diamondNumbers?: {
        attack: SystemDiamondNumber[];
        departure: SystemDiamondNumber[];
        arrival3rd: SystemDiamondNumber[];
        arrival4th: SystemDiamondNumber[];
    };
    diamondPinMap?: Array<{
        slotId: string;
        rail: 'top' | 'right' | 'bottom' | 'left';
        diamondIndex: number;
        x: number;
        y: number;
        role: 'departure' | 'attack' | 'arrival_3rd' | 'arrival_4th';
        value: number;
        label: string;
        pinColor: string;
        pinDirection: 'down' | 'up' | 'left' | 'right';
    }>;
    canonicalShots?: Array<{
        id: string;
        index: number;
        departure: number;
        attack: number;
        arrival3rd: number;
        arrival4th: number;
        formulaText: string;
        title: string;
        description: string;
        effect: {
            system: string;
            point: number;
            hour: string;
            tips: number;
            description: string;
        };
        balls: {
            white: Point2D;
            yellow: Point2D;
            red: Point2D;
        };
        points1to3: Point2D[];
        points3to4: Point2D[];
        points4to5: Point2D[];
        fullTrajectory: Point2D[];
    }>;
    segmentedTrajectories?: SegmentedTrajectoryDefinition[];
    cheatSheets?: CheatSheetOrigin[];
}

export const EFFECT_PRESETS: Record<
    EffectKey,
    { label: string; description: string; x: number; y: number; power: number }
> = {
    center: { label: 'Natural', description: 'Sin lateral, salida estable.', x: 50, y: 50, power: 60 },
    top: { label: 'Corrido', description: 'Empuja la blanca tras impacto.', x: 50, y: 28, power: 58 },
    'top-right': { label: 'Corrido Der.', description: 'Running + lateral derecho.', x: 72, y: 30, power: 64 },
    right: { label: 'Lateral Der.', description: 'Abre angulo en banda.', x: 78, y: 50, power: 68 },
    'bottom-right': { label: 'Retro Der.', description: 'Cierra salida, mayor control.', x: 72, y: 72, power: 50 },
    bottom: { label: 'Retro', description: 'Retiene avance de la blanca.', x: 50, y: 76, power: 46 },
    'bottom-left': { label: 'Retro Izq.', description: 'Retro + lateral izquierdo.', x: 28, y: 72, power: 50 },
    left: { label: 'Lateral Izq.', description: 'Abre angulo inverso.', x: 22, y: 50, power: 68 },
    'top-left': { label: 'Corrido Izq.', description: 'Running + lateral izquierdo.', x: 28, y: 30, power: 64 },
};

export function effectKeyToSpin(effectKey: EffectKey): SpinEffect {
    const preset = EFFECT_PRESETS[effectKey];
    const x = (preset.x - 50) / 50;
    const y = (50 - preset.y) / 50;

    return {
        x,
        y,
        magnitude: Math.min(1, Math.hypot(x, y)),
    };
}

export function spinToEffectKey(spin: SpinEffect): EffectKey {
    const entries = Object.entries(EFFECT_PRESETS) as Array<[EffectKey, (typeof EFFECT_PRESETS)[EffectKey]]>;

    let bestKey: EffectKey = 'center';
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const [key, preset] of entries) {
        const presetSpinX = (preset.x - 50) / 50;
        const presetSpinY = (50 - preset.y) / 50;
        const distance = Math.hypot(spin.x - presetSpinX, spin.y - presetSpinY);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestKey = key;
        }
    }

    return bestKey;
}

export const CONTACT_PRESETS: Record<ContactKey, { label: string; description: string }> = {
    '1/2': { label: 'Media bola', description: 'Impacto pleno para lineas estables.' },
    '1/4': { label: 'Cuarto de bola', description: 'Corte moderado con control de salida.' },
    '1/8': { label: 'Octavo de bola', description: 'Corte fino para ajustar banda larga.' },
    '1/16': { label: 'Dieciseisavo', description: 'Rozada extrema, muy tecnico.' },
};

export const TRAINING_SYSTEMS: TrainingSystem[] = [
    {
        id: 'base-50',
        name: 'Sistema Base 50',
        subtitle: 'Fórmula clásica de 3 bandas (Llegada = Salida - Ataque)',
        difficulty: 'basic',
        author: 'AM Billiard Academy',
        youtubeUrl: 'https://www.youtube.com/watch?v=o2kk7p6ig1Q',
        diagramUrl: '/assets/images/theory/billiard_base50_conti.jpg',
        focus: 'Memoria de salidas y lectura de diamantes',
        recommendedPower: 60,
        recommendedEffect: 'center',
        rules: [
            'Llegada = Salida - Ataque',
            'Efecto 3 canónico (reloj a las 3:00 / 9:00 a favor)',
            'Potencia media 55%-65% con tacada penetrada',
            'Regla 11: Salidas y Ataques se miden por Diamante (madera); TODAS las Llegadas van siempre frente al caucho (en la banda), solo las llegadas',
        ],
        diamondNumbers: {
            attack: [
                { diamond: 1, x: 35.5, y: 0, value: '10' },
                { diamond: 2, x: 71, y: 0, value: '20' },
                { diamond: 3, x: 106.5, y: 0, value: '30' },
                { diamond: 4, x: 142, y: 0, value: '40' },
                { diamond: 5, x: 177.5, y: 0, value: '50' },
                { diamond: 6, x: 213, y: 0, value: '60' },
                { diamond: 7, x: 248.5, y: 0, value: '70' },
                { diamond: 8, x: 284, y: 0, value: '80' },
            ],
            departure: [
                { diamond: 0, x: 0, y: 142, value: '50' },
                { diamond: 1, x: 35.5, y: 142, value: '45' },
                { diamond: 2, x: 71, y: 142, value: '40' },
                { diamond: 3, x: 106.5, y: 142, value: '35' },
                { diamond: 4, x: 142, y: 142, value: '30' },
                { diamond: 5, x: 177.5, y: 142, value: '25' },
                { diamond: 6, x: 213, y: 142, value: '20' },
                { diamond: 7, x: 248.5, y: 142, value: '15' },
            ],
            arrival3rd: [
                { diamond: 8, x: 282, y: 142, value: '0' },
                { diamond: 7, x: 248.5, y: 142, value: '10' },
                { diamond: 6, x: 213, y: 142, value: '20' },
                { diamond: 5, x: 177.5, y: 142, value: '30' },
                { diamond: 4, x: 142, y: 142, value: '45' },
                { diamond: 3, x: 106.5, y: 142, value: '60' },
                { diamond: 2, x: 71, y: 142, value: '80' },
                { diamond: 1, x: 35.5, y: 142, value: '100' },
            ],
            arrival4th: [
                { diamond: 1, x: 35.5, y: 142, value: '10' },
                { diamond: 2, x: 71, y: 142, value: '20' },
                { diamond: 3, x: 106.5, y: 142, value: '30' },
                { diamond: 4, x: 142, y: 142, value: '40' },
                { diamond: 5, x: 177.5, y: 142, value: '50' },
                { diamond: 6, x: 213, y: 142, value: '60' },
                { diamond: 7, x: 248.5, y: 142, value: '70' },
            ],
        },
        diamondPinMap: [
            // ATAQUE (Rojo #ef4444) — 1ª Banda: Top Rail (0 en esquina [límite], 10, 20, 30, 40, 50, 70, 90 de der a izq)
            { slotId: 'T8', rail: 'top', diamondIndex: 8, x: 282, y: 0, role: 'attack', value: 0, label: '0', pinColor: '#ef4444', pinDirection: 'down' },
            { slotId: 'T7', rail: 'top', diamondIndex: 7, x: 248.5, y: 0, role: 'attack', value: 10, label: '10', pinColor: '#ef4444', pinDirection: 'down' },
            { slotId: 'T6', rail: 'top', diamondIndex: 6, x: 213, y: 0, role: 'attack', value: 20, label: '20', pinColor: '#ef4444', pinDirection: 'down' },
            { slotId: 'T5', rail: 'top', diamondIndex: 5, x: 177.5, y: 0, role: 'attack', value: 30, label: '30', pinColor: '#ef4444', pinDirection: 'down' },
            { slotId: 'T4', rail: 'top', diamondIndex: 4, x: 142, y: 0, role: 'attack', value: 40, label: '40', pinColor: '#ef4444', pinDirection: 'down' },
            { slotId: 'T3', rail: 'top', diamondIndex: 3, x: 106.5, y: 0, role: 'attack', value: 50, label: '50', pinColor: '#ef4444', pinDirection: 'down' },
            { slotId: 'T2', rail: 'top', diamondIndex: 2, x: 71, y: 0, role: 'attack', value: 70, label: '70', pinColor: '#ef4444', pinDirection: 'down' },
            { slotId: 'T1', rail: 'top', diamondIndex: 1, x: 35.5, y: 0, role: 'attack', value: 90, label: '90', pinColor: '#ef4444', pinDirection: 'down' },

            // SALIDA (Amarillo #facc15) — Banda Larga Inferior
            { slotId: 'B8', rail: 'bottom', diamondIndex: 0, x: 0, y: 142, role: 'departure', value: 50, label: '50', pinColor: '#facc15', pinDirection: 'up' },
            { slotId: 'B7', rail: 'bottom', diamondIndex: 1, x: 35.5, y: 142, role: 'departure', value: 45, label: '45', pinColor: '#facc15', pinDirection: 'up' },
            { slotId: 'B6', rail: 'bottom', diamondIndex: 2, x: 71, y: 142, role: 'departure', value: 40, label: '40', pinColor: '#facc15', pinDirection: 'up' },
            { slotId: 'B5', rail: 'bottom', diamondIndex: 3, x: 106.5, y: 142, role: 'departure', value: 35, label: '35', pinColor: '#facc15', pinDirection: 'up' },
            { slotId: 'B4', rail: 'bottom', diamondIndex: 4, x: 142, y: 142, role: 'departure', value: 30, label: '30', pinColor: '#facc15', pinDirection: 'up' },
            { slotId: 'B3', rail: 'bottom', diamondIndex: 5, x: 177.5, y: 142, role: 'departure', value: 25, label: '25', pinColor: '#facc15', pinDirection: 'up' },
            { slotId: 'B2', rail: 'bottom', diamondIndex: 6, x: 213, y: 142, role: 'departure', value: 20, label: '20', pinColor: '#facc15', pinDirection: 'up' },
            { slotId: 'B1', rail: 'bottom', diamondIndex: 7, x: 248.5, y: 142, role: 'departure', value: 15, label: '15', pinColor: '#facc15', pinDirection: 'up' },

            // SALIDA CONTINUADA (Amarillo #facc15) — Banda Corta Izquierda
            { slotId: 'L3', rail: 'left', diamondIndex: 3, x: 0, y: 106.5, role: 'departure', value: 60, label: '60', pinColor: '#facc15', pinDirection: 'right' },
            { slotId: 'L2', rail: 'left', diamondIndex: 2, x: 0, y: 71, role: 'departure', value: 70, label: '70', pinColor: '#facc15', pinDirection: 'right' },
            { slotId: 'L1', rail: 'left', diamondIndex: 1, x: 0, y: 35.5, role: 'departure', value: 80, label: '80', pinColor: '#facc15', pinDirection: 'right' },
            { slotId: 'L0', rail: 'left', diamondIndex: 0, x: 0, y: 0, role: 'departure', value: 90, label: '90', pinColor: '#facc15', pinDirection: 'right' },

            // LLEGADA 3ª BANDA (Verde #10b981) — Banda Larga Inferior (Frente al caucho: 0 en esquina, 10, 20, 30, 45, 60, 80, 100)
            { slotId: 'B8-arr', rail: 'bottom', diamondIndex: 8, x: 282, y: 142, role: 'arrival_3rd', value: 0, label: '0', pinColor: '#10b981', pinDirection: 'down' },
            { slotId: 'B7-arr', rail: 'bottom', diamondIndex: 7, x: 248.5, y: 142, role: 'arrival_3rd', value: 10, label: '10', pinColor: '#10b981', pinDirection: 'down' },
            { slotId: 'B6-arr', rail: 'bottom', diamondIndex: 6, x: 213, y: 142, role: 'arrival_3rd', value: 20, label: '20', pinColor: '#10b981', pinDirection: 'down' },
            { slotId: 'B5-arr', rail: 'bottom', diamondIndex: 5, x: 177.5, y: 142, role: 'arrival_3rd', value: 30, label: '30', pinColor: '#10b981', pinDirection: 'down' },
            { slotId: 'B4-arr', rail: 'bottom', diamondIndex: 4, x: 142, y: 142, role: 'arrival_3rd', value: 45, label: '45', pinColor: '#10b981', pinDirection: 'down' },
            { slotId: 'B3-arr', rail: 'bottom', diamondIndex: 3, x: 106.5, y: 142, role: 'arrival_3rd', value: 60, label: '60', pinColor: '#10b981', pinDirection: 'down' },
            { slotId: 'B2-arr', rail: 'bottom', diamondIndex: 2, x: 71, y: 142, role: 'arrival_3rd', value: 80, label: '80', pinColor: '#10b981', pinDirection: 'down' },
            { slotId: 'B1-arr', rail: 'bottom', diamondIndex: 1, x: 35.5, y: 142, role: 'arrival_3rd', value: 100, label: '100', pinColor: '#10b981', pinDirection: 'down' },

            // LLEGADA 4ª BANDA (Verde #10b981) — Banda Larga Inferior Retorno
            { slotId: 'B7', rail: 'bottom', diamondIndex: 1, x: 35.5, y: 142, role: 'arrival_4th', value: 10, label: '10', pinColor: '#10b981', pinDirection: 'up' },
            { slotId: 'B6', rail: 'bottom', diamondIndex: 2, x: 71, y: 142, role: 'arrival_4th', value: 20, label: '20', pinColor: '#10b981', pinDirection: 'up' },
            { slotId: 'B5', rail: 'bottom', diamondIndex: 3, x: 106.5, y: 142, role: 'arrival_4th', value: 30, label: '30', pinColor: '#10b981', pinDirection: 'up' },
            { slotId: 'B4', rail: 'bottom', diamondIndex: 4, x: 142, y: 142, role: 'arrival_4th', value: 40, label: '40', pinColor: '#10b981', pinDirection: 'up' },
            { slotId: 'B3', rail: 'bottom', diamondIndex: 5, x: 177.5, y: 142, role: 'arrival_4th', value: 50, label: '50', pinColor: '#10b981', pinDirection: 'up' },
            { slotId: 'B2', rail: 'bottom', diamondIndex: 6, x: 213, y: 142, role: 'arrival_4th', value: 60, label: '60', pinColor: '#10b981', pinDirection: 'up' },
            { slotId: 'B1', rail: 'bottom', diamondIndex: 7, x: 248.5, y: 142, role: 'arrival_4th', value: 70, label: '70', pinColor: '#10b981', pinDirection: 'up' },
        ],
        canonicalShots: [
            {
                id: 'base-50-shot-1',
                index: 1,
                departure: 50,
                attack: 30,
                arrival3rd: 20,
                arrival4th: 20,
                formulaText: '50 - 30 = 20',
                title: 'Tiro Canónico Maestro: 50 - 30 = 20',
                description: 'La columna vertebral de la geometría de 3 bandas: salida 50 y ataque a 30 para llegar a 20.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 horario penetrado.' },
                balls: { white: { x: 14, y: 136 }, yellow: { x: 95, y: 22 }, red: { x: 232, y: 44 } },
                points1to3: [{ x: 14, y: 136 }, { x: 106.5, y: 0 }, { x: 284, y: 71 }, { x: 0, y: 71 }],
                points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                fullTrajectory: [{ x: 14, y: 136 }, { x: 106.5, y: 0 }, { x: 284, y: 71 }, { x: 0, y: 71 }, { x: 71, y: 142 }, { x: 232, y: 44 }],
            },
            {
                id: 'base-50-shot-2',
                index: 2,
                departure: 50,
                attack: 20,
                arrival3rd: 30,
                arrival4th: 30,
                formulaText: '50 - 20 = 30',
                title: 'Ataque Abierto: 50 - 20 = 30',
                description: 'Ataque al diamante 20 para llegada profunda a diamante 30 en 3ª banda.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj estándar.' },
                balls: { white: { x: 14, y: 136 }, yellow: { x: 62, y: 26 }, red: { x: 260, y: 28 } },
                points1to3: [{ x: 14, y: 136 }, { x: 71, y: 0 }, { x: 284, y: 46 }, { x: 0, y: 106.5 }],
                points3to4: [{ x: 0, y: 106.5 }, { x: 106.5, y: 142 }],
                points4to5: [{ x: 106.5, y: 142 }, { x: 260, y: 28 }],
                fullTrajectory: [{ x: 14, y: 136 }, { x: 71, y: 0 }, { x: 284, y: 46 }, { x: 0, y: 106.5 }, { x: 106.5, y: 142 }, { x: 260, y: 28 }],
            },
            {
                id: 'base-50-shot-3',
                index: 3,
                departure: 50,
                attack: 10,
                arrival3rd: 40,
                arrival4th: 40,
                formulaText: '50 - 10 = 40',
                title: 'Ataque al Rincón 10: 50 - 10 = 40',
                description: 'Máxima apertura hacia el rincón opuesto con llegada 40.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj alargado.' },
                balls: { white: { x: 14, y: 136 }, yellow: { x: 30, y: 30 }, red: { x: 275, y: 16 } },
                points1to3: [{ x: 14, y: 136 }, { x: 35.5, y: 0 }, { x: 284, y: 24 }, { x: 14, y: 138 }],
                points3to4: [{ x: 14, y: 138 }, { x: 142, y: 142 }],
                points4to5: [{ x: 142, y: 142 }, { x: 275, y: 16 }],
                fullTrajectory: [{ x: 14, y: 136 }, { x: 35.5, y: 0 }, { x: 284, y: 24 }, { x: 14, y: 138 }, { x: 142, y: 142 }, { x: 275, y: 16 }],
            },
            {
                id: 'base-50-shot-4',
                index: 4,
                departure: 50,
                attack: 40,
                arrival3rd: 10,
                arrival4th: 10,
                formulaText: '50 - 40 = 10',
                title: 'Ataque al Centro: 50 - 40 = 10',
                description: 'Ataque perpendicular hacia el diamante 40 con llegada a 10.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj.' },
                balls: { white: { x: 14, y: 136 }, yellow: { x: 132, y: 18 }, red: { x: 202, y: 58 } },
                points1to3: [{ x: 14, y: 136 }, { x: 142, y: 0 }, { x: 284, y: 98 }, { x: 0, y: 35.5 }],
                points3to4: [{ x: 0, y: 35.5 }, { x: 35.5, y: 142 }],
                points4to5: [{ x: 35.5, y: 142 }, { x: 202, y: 58 }],
                fullTrajectory: [{ x: 14, y: 136 }, { x: 142, y: 0 }, { x: 284, y: 98 }, { x: 0, y: 35.5 }, { x: 35.5, y: 142 }, { x: 202, y: 58 }],
            },
            {
                id: 'base-50-shot-5',
                index: 5,
                departure: 50,
                attack: 50,
                arrival3rd: 0,
                arrival4th: 0,
                formulaText: '50 - 50 = 0',
                title: 'Cierre al Rincón Superior: 50 - 50 = 0',
                description: 'Ataque a 50 para converger en el vértice cero en 3ª banda.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj acelerado.' },
                balls: { white: { x: 14, y: 136 }, yellow: { x: 168, y: 16 }, red: { x: 160, y: 72 } },
                points1to3: [{ x: 14, y: 136 }, { x: 177.5, y: 0 }, { x: 284, y: 120 }, { x: 0, y: 0 }],
                points3to4: [{ x: 0, y: 0 }, { x: 18, y: 138 }],
                points4to5: [{ x: 18, y: 138 }, { x: 160, y: 72 }],
                fullTrajectory: [{ x: 14, y: 136 }, { x: 177.5, y: 0 }, { x: 284, y: 120 }, { x: 0, y: 0 }, { x: 18, y: 138 }, { x: 160, y: 72 }],
            },
            {
                id: 'base-50-shot-6',
                index: 6,
                departure: 50,
                attack: 25,
                arrival3rd: 25,
                arrival4th: 25,
                formulaText: '50 - 25 = 25',
                title: 'Partición Media: 50 - 25 = 25',
                description: 'Ataque entre diamante 2 y 3 (punto 25), llegando exactamente a 25 en 3ª banda.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj.' },
                balls: { white: { x: 14, y: 136 }, yellow: { x: 80, y: 22 }, red: { x: 246, y: 36 } },
                points1to3: [{ x: 14, y: 136 }, { x: 88.75, y: 0 }, { x: 284, y: 58 }, { x: 0, y: 88.75 }],
                points3to4: [{ x: 0, y: 88.75 }, { x: 88.75, y: 142 }],
                points4to5: [{ x: 88.75, y: 142 }, { x: 246, y: 36 }],
                fullTrajectory: [{ x: 14, y: 136 }, { x: 88.75, y: 0 }, { x: 284, y: 58 }, { x: 0, y: 88.75 }, { x: 88.75, y: 142 }, { x: 246, y: 36 }],
            },
            {
                id: 'base-50-shot-7',
                index: 7,
                departure: 45,
                attack: 25,
                arrival3rd: 20,
                arrival4th: 20,
                formulaText: '45 - 25 = 20',
                title: 'Variación Salida 45: 45 - 25 = 20',
                description: 'Salida desde diamante 1 inferior con llegada a 20.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj.' },
                balls: { white: { x: 35.5, y: 136 }, yellow: { x: 80, y: 22 }, red: { x: 232, y: 44 } },
                points1to3: [{ x: 35.5, y: 136 }, { x: 88.75, y: 0 }, { x: 284, y: 69 }, { x: 0, y: 71 }],
                points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                fullTrajectory: [{ x: 35.5, y: 136 }, { x: 88.75, y: 0 }, { x: 284, y: 69 }, { x: 0, y: 71 }, { x: 71, y: 142 }, { x: 232, y: 44 }],
            },
            {
                id: 'base-50-shot-8',
                index: 8,
                departure: 40,
                attack: 20,
                arrival3rd: 20,
                arrival4th: 20,
                formulaText: '40 - 20 = 20',
                title: 'Variación Salida 40: 40 - 20 = 20',
                description: 'Salida desde diamante 2 inferior con llegada a 20.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj.' },
                balls: { white: { x: 71, y: 136 }, yellow: { x: 65, y: 24 }, red: { x: 232, y: 44 } },
                points1to3: [{ x: 71, y: 136 }, { x: 71, y: 0 }, { x: 284, y: 67 }, { x: 0, y: 71 }],
                points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                fullTrajectory: [{ x: 71, y: 136 }, { x: 71, y: 0 }, { x: 284, y: 67 }, { x: 0, y: 71 }, { x: 71, y: 142 }, { x: 232, y: 44 }],
            },
            {
                id: 'base-50-shot-9',
                index: 9,
                departure: 35,
                attack: 15,
                arrival3rd: 20,
                arrival4th: 20,
                formulaText: '35 - 15 = 20',
                title: 'Variación Salida 35: 35 - 15 = 20',
                description: 'Salida desde diamante 3 inferior con llegada a 20.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj.' },
                balls: { white: { x: 106.5, y: 136 }, yellow: { x: 50, y: 22 }, red: { x: 232, y: 44 } },
                points1to3: [{ x: 106.5, y: 136 }, { x: 53.25, y: 0 }, { x: 284, y: 65 }, { x: 0, y: 71 }],
                points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                fullTrajectory: [{ x: 106.5, y: 136 }, { x: 53.25, y: 0 }, { x: 284, y: 65 }, { x: 0, y: 71 }, { x: 71, y: 142 }, { x: 232, y: 44 }],
            },
            {
                id: 'base-50-shot-10',
                index: 10,
                departure: 60,
                attack: 40,
                arrival3rd: 20,
                arrival4th: 20,
                formulaText: '60 - 40 = 20',
                title: 'Salida Abierta en Banda Corta: 60 - 40 = 20',
                description: 'Salida abierta desde banda corta con llegada a 20.',
                effect: { system: 'reloj', point: 3, hour: '3:00', tips: 3, description: 'Efecto 3 reloj penetrado.' },
                balls: { white: { x: 14, y: 106.5 }, yellow: { x: 134, y: 22 }, red: { x: 232, y: 44 } },
                points1to3: [{ x: 14, y: 106.5 }, { x: 142, y: 0 }, { x: 284, y: 73 }, { x: 0, y: 71 }],
                points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                fullTrajectory: [{ x: 14, y: 106.5 }, { x: 142, y: 0 }, { x: 284, y: 73 }, { x: 0, y: 71 }, { x: 71, y: 142 }, { x: 232, y: 44 }],
            },
        ],
        segmentedTrajectories: [
            { id: 'seg-1-3', label: '1ª a 3ª Banda', color: '#ef4444', description: 'Trayectoria inicial de la fórmula matemática' },
            { id: 'seg-3-4', label: '3ª a 4ª Banda', color: '#10b981', description: 'Rebote con rotación a favor hacia banda larga' },
            { id: 'seg-4-5', label: '4ª a 5ª Banda', color: '#38bdf8', description: 'Recorrido final de llegada hacia la carambola' },
        ],
        cheatSheets: [
            {
                origin: 50,
                name: 'Partiendo de Salida 50 (Esquina)',
                shots: [
                    {
                        attack: 30,
                        arrival: 20,
                        departure: 50,
                        arrival3rd: 20,
                        arrival4th: 20,
                        points1to3: [{ x: 14, y: 136 }, { x: 106.5, y: 0 }, { x: 284, y: 71 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                    },
                    {
                        attack: 20,
                        arrival: 30,
                        departure: 50,
                        arrival3rd: 30,
                        arrival4th: 30,
                        points1to3: [{ x: 14, y: 136 }, { x: 71, y: 0 }, { x: 284, y: 46 }, { x: 0, y: 106.5 }],
                        points3to4: [{ x: 0, y: 106.5 }, { x: 106.5, y: 142 }],
                        points4to5: [{ x: 106.5, y: 142 }, { x: 260, y: 28 }],
                    },
                    {
                        attack: 10,
                        arrival: 40,
                        departure: 50,
                        arrival3rd: 40,
                        arrival4th: 40,
                        points1to3: [{ x: 14, y: 136 }, { x: 35.5, y: 0 }, { x: 284, y: 24 }, { x: 14, y: 138 }],
                        points3to4: [{ x: 14, y: 138 }, { x: 142, y: 142 }],
                        points4to5: [{ x: 142, y: 142 }, { x: 275, y: 16 }],
                    },
                    {
                        attack: 40,
                        arrival: 10,
                        departure: 50,
                        arrival3rd: 10,
                        arrival4th: 10,
                        points1to3: [{ x: 14, y: 136 }, { x: 142, y: 0 }, { x: 284, y: 98 }, { x: 0, y: 35.5 }],
                        points3to4: [{ x: 0, y: 35.5 }, { x: 35.5, y: 142 }],
                        points4to5: [{ x: 35.5, y: 142 }, { x: 202, y: 58 }],
                    },
                    {
                        attack: 50,
                        arrival: 0,
                        departure: 50,
                        arrival3rd: 0,
                        arrival4th: 0,
                        points1to3: [{ x: 14, y: 136 }, { x: 177.5, y: 0 }, { x: 284, y: 120 }, { x: 0, y: 0 }],
                        points3to4: [{ x: 0, y: 0 }, { x: 18, y: 138 }],
                        points4to5: [{ x: 18, y: 138 }, { x: 160, y: 72 }],
                    },
                    {
                        attack: 25,
                        arrival: 25,
                        departure: 50,
                        arrival3rd: 25,
                        arrival4th: 25,
                        points1to3: [{ x: 14, y: 136 }, { x: 88.75, y: 0 }, { x: 284, y: 58 }, { x: 0, y: 88.75 }],
                        points3to4: [{ x: 0, y: 88.75 }, { x: 88.75, y: 142 }],
                        points4to5: [{ x: 88.75, y: 142 }, { x: 246, y: 36 }],
                    },
                ],
            },
            {
                origin: 45,
                name: 'Partiendo de Salida 45 (Diamante 1)',
                shots: [
                    {
                        attack: 25,
                        arrival: 20,
                        departure: 45,
                        arrival3rd: 20,
                        arrival4th: 20,
                        points1to3: [{ x: 35.5, y: 136 }, { x: 88.75, y: 0 }, { x: 284, y: 69 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                    },
                ],
            },
            {
                origin: 40,
                name: 'Partiendo de Salida 40 (Diamante 2)',
                shots: [
                    {
                        attack: 20,
                        arrival: 20,
                        departure: 40,
                        arrival3rd: 20,
                        arrival4th: 20,
                        points1to3: [{ x: 71, y: 136 }, { x: 71, y: 0 }, { x: 284, y: 67 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                    },
                ],
            },
            {
                origin: 35,
                name: 'Partiendo de Salida 35 (Diamante 3)',
                shots: [
                    {
                        attack: 15,
                        arrival: 20,
                        departure: 35,
                        arrival3rd: 20,
                        arrival4th: 20,
                        points1to3: [{ x: 106.5, y: 136 }, { x: 53.25, y: 0 }, { x: 284, y: 65 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                    },
                ],
            },
            {
                origin: 60,
                name: 'Partiendo de Salida 60 (Banda Corta)',
                shots: [
                    {
                        attack: 40,
                        arrival: 20,
                        departure: 60,
                        arrival3rd: 20,
                        arrival4th: 20,
                        points1to3: [{ x: 14, y: 106.5 }, { x: 142, y: 0 }, { x: 284, y: 73 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
                    },
                ],
            },
        ],
        positions: [
            {
                id: 'b50-1',
                white: { x: 44, y: 110 },
                yellow: { x: 176, y: 76 },
                red: { x: 40, y: 44 },
                trajectory: [
                    { x: 44, y: 110 },
                    { x: 30, y: 0 },
                    { x: 284, y: 24 },
                    { x: 0, y: 126 },
                    { x: 176, y: 76 },
                ],
            },
            {
                id: 'b50-2',
                white: { x: 72, y: 118 },
                yellow: { x: 188, y: 58 },
                red: { x: 54, y: 52 },
                trajectory: [
                    { x: 72, y: 118 },
                    { x: 96, y: 0 },
                    { x: 284, y: 36 },
                    { x: 0, y: 122 },
                    { x: 188, y: 58 },
                ],
            },
        ],
    },
    {
        id: 'cajones-largos',
        name: 'Sistema Cajones (Retros)',
        subtitle: 'Progresión por diamantes y tacada detrás de bola 2',
        difficulty: 'intermediate',
        focus: 'Ritmo de retro y control de potencia para recorridos largos',
        recommendedPower: 66,
        recommendedEffect: 'bottom-right',
        rules: ['Salida = Cajón x 0.5', 'Ajuste por paño y banda', 'Potencia 60%-72%'],
        positions: [
            {
                id: 'cl-1',
                white: { x: 50, y: 106 },
                yellow: { x: 220, y: 82 },
                red: { x: 74, y: 36 },
                trajectory: [
                    { x: 50, y: 106 },
                    { x: 16, y: 0 },
                    { x: 284, y: 18 },
                    { x: 0, y: 130 },
                    { x: 220, y: 82 },
                ],
            },
            {
                id: 'cl-2',
                white: { x: 62, y: 116 },
                yellow: { x: 226, y: 70 },
                red: { x: 88, y: 34 },
                trajectory: [
                    { x: 62, y: 116 },
                    { x: 20, y: 0 },
                    { x: 284, y: 32 },
                    { x: 0, y: 136 },
                    { x: 226, y: 70 },
                ],
            },
        ],
    },
    {
        id: 'renverse',
        name: 'Sistema Renversé (Contra-efecto)',
        subtitle: 'Control de retroceso y cierre por banda corta',
        difficulty: 'intermediate',
        focus: 'Cerrar ángulos con efecto retrógrado / contra-efecto',
        recommendedPower: 50,
        recommendedEffect: 'bottom-right',
        rules: ['Efecto retrógrado dominante (contra)', 'Ataque de primera banda corta', 'Potencia 45%-55%'],
        positions: [
            {
                id: 'ren-1',
                white: { x: 54, y: 112 },
                yellow: { x: 210, y: 86 },
                red: { x: 36, y: 62 },
                trajectory: [
                    { x: 54, y: 112 },
                    { x: 96, y: 0 },
                    { x: 284, y: 42 },
                    { x: 0, y: 132 },
                    { x: 210, y: 86 },
                ],
            },
            {
                id: 'ren-2',
                white: { x: 62, y: 104 },
                yellow: { x: 204, y: 74 },
                red: { x: 42, y: 56 },
                trajectory: [
                    { x: 62, y: 104 },
                    { x: 92, y: 0 },
                    { x: 284, y: 28 },
                    { x: 0, y: 126 },
                    { x: 204, y: 74 },
                ],
            },
        ],
    },
    {
        id: 'previas',
        name: 'Sistema Previas (Banda Previa)',
        subtitle: 'Ataque a primera banda antes del contacto con bola objetivo',
        difficulty: 'advanced',
        focus: 'Lectura de llegada y ángulo natural sin desvío de bola',
        recommendedPower: 58,
        recommendedEffect: 'center',
        rules: ['Ataque directo a banda previa', 'Compensación de salida según paño', 'Potencia controlada 50%-60%'],
        positions: [
            {
                id: 'prev-1',
                white: { x: 48, y: 114 },
                yellow: { x: 200, y: 78 },
                red: { x: 44, y: 38 },
                trajectory: [
                    { x: 48, y: 114 },
                    { x: 24, y: 0 },
                    { x: 284, y: 26 },
                    { x: 0, y: 128 },
                    { x: 200, y: 78 },
                ],
            },
        ],
    },
    {
        id: 'pasones-zigzag',
        name: 'Sistema Pasones (Zigzag)',
        subtitle: 'Travesía transversal continua entre bandas largas',
        difficulty: 'advanced',
        focus: 'Control de penetración y efecto para zigzag a lo ancho',
        recommendedPower: 68,
        recommendedEffect: 'top-left',
        rules: ['Ataque perpendicular a banda larga', 'Efecto de avance sostenido', 'Potencia viva 62%-72%'],
        positions: [
            {
                id: 'pas-1',
                white: { x: 64, y: 118 },
                yellow: { x: 220, y: 72 },
                red: { x: 52, y: 46 },
                trajectory: [
                    { x: 64, y: 118 },
                    { x: 80, y: 0 },
                    { x: 140, y: 142 },
                    { x: 200, y: 0 },
                    { x: 220, y: 72 },
                ],
            },
        ],
    },
];

export function getTrainingSystemById(systemId: string) {
    return TRAINING_SYSTEMS.find((system) => system.id === systemId) ?? null;
}
