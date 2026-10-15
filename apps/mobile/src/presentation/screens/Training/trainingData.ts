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
        name: 'Sistema Conti / Base 50',
        subtitle: 'Fórmula clásica de 3 bandas (Llegada = Salida - Ataque)',
        difficulty: 'basic',
        author: 'Sistema Conti / AM Billiard Academy',
        youtubeUrl: 'https://www.youtube.com/watch?v=HGfTj9vQTpY',
        diagramUrl: '/assets/images/theory/billiard_base50_conti.jpg',
        focus: 'Memoria de salidas y lectura de diamantes',
        recommendedPower: 60,
        recommendedEffect: 'center',
        rules: ['Llegada = Salida - Ataque', 'Efecto a favor (rotación natural)', 'Potencia media 55%-65%'],
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
            ],
            arrival3rd: [
                { diamond: 0, x: 0, y: 0, value: '0' },
                { diamond: 1, x: 0, y: 35.5, value: '10' },
                { diamond: 2, x: 0, y: 71, value: '20' },
                { diamond: 3, x: 0, y: 106.5, value: '30' },
                { diamond: 4, x: 0, y: 142, value: '40' },
            ],
            arrival4th: [
                { diamond: 1, x: 35.5, y: 142, value: '10' },
                { diamond: 2, x: 71, y: 142, value: '20' },
                { diamond: 3, x: 106.5, y: 142, value: '30' },
                { diamond: 4, x: 142, y: 142, value: '40' },
                { diamond: 5, x: 177.5, y: 142, value: '50' },
            ],
        },
        segmentedTrajectories: [
            { id: 'seg-1-3', label: '1ª a 3ª Banda', color: '#06b6d4', description: 'Trayectoria inicial de la fórmula matemática' },
            { id: 'seg-3-4', label: '3ª a 4ª Banda', color: '#f59e0b', description: 'Rebote con rotación a favor hacia banda larga' },
            { id: 'seg-4-5', label: '4ª a 5ª Banda', color: '#10b981', description: 'Recorrido final de llegada hacia la carambola' },
        ],
        cheatSheets: [
            {
                origin: 50,
                name: 'Partiendo de Salida 50 (Esquina)',
                shots: [
                    {
                        attack: 10,
                        arrival: 40,
                        points1to3: [{ x: 12, y: 135 }, { x: 35.5, y: 0 }, { x: 284, y: 24 }, { x: 12, y: 138 }],
                        points3to4: [{ x: 12, y: 138 }, { x: 142, y: 142 }],
                        points4to5: [{ x: 142, y: 142 }, { x: 278, y: 10 }],
                    },
                    {
                        attack: 20,
                        arrival: 30,
                        points1to3: [{ x: 12, y: 135 }, { x: 71, y: 0 }, { x: 284, y: 45 }, { x: 0, y: 106.5 }],
                        points3to4: [{ x: 0, y: 106.5 }, { x: 106.5, y: 142 }],
                        points4to5: [{ x: 106.5, y: 142 }, { x: 260, y: 25 }],
                    },
                    {
                        attack: 30,
                        arrival: 20,
                        points1to3: [{ x: 12, y: 135 }, { x: 106.5, y: 0 }, { x: 284, y: 71 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 230, y: 40 }],
                    },
                    {
                        attack: 40,
                        arrival: 10,
                        points1to3: [{ x: 12, y: 135 }, { x: 142, y: 0 }, { x: 284, y: 100 }, { x: 0, y: 35.5 }],
                        points3to4: [{ x: 0, y: 35.5 }, { x: 35.5, y: 142 }],
                        points4to5: [{ x: 35.5, y: 142 }, { x: 200, y: 55 }],
                    },
                ],
            },
            {
                origin: 40,
                name: 'Partiendo de Salida 40 (Diamante 2)',
                shots: [
                    {
                        attack: 10,
                        arrival: 30,
                        points1to3: [{ x: 71, y: 135 }, { x: 35.5, y: 0 }, { x: 284, y: 40 }, { x: 0, y: 106.5 }],
                        points3to4: [{ x: 0, y: 106.5 }, { x: 106.5, y: 142 }],
                        points4to5: [{ x: 106.5, y: 142 }, { x: 260, y: 30 }],
                    },
                    {
                        attack: 20,
                        arrival: 20,
                        points1to3: [{ x: 71, y: 135 }, { x: 71, y: 0 }, { x: 284, y: 68 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 230, y: 45 }],
                    },
                    {
                        attack: 30,
                        arrival: 10,
                        points1to3: [{ x: 71, y: 135 }, { x: 106.5, y: 0 }, { x: 284, y: 95 }, { x: 0, y: 35.5 }],
                        points3to4: [{ x: 0, y: 35.5 }, { x: 35.5, y: 142 }],
                        points4to5: [{ x: 35.5, y: 142 }, { x: 200, y: 60 }],
                    },
                ],
            },
            {
                origin: 30,
                name: 'Partiendo de Salida 30 (Diamante 4)',
                shots: [
                    {
                        attack: 10,
                        arrival: 20,
                        points1to3: [{ x: 142, y: 135 }, { x: 35.5, y: 0 }, { x: 284, y: 60 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 230, y: 50 }],
                    },
                    {
                        attack: 20,
                        arrival: 10,
                        points1to3: [{ x: 142, y: 135 }, { x: 71, y: 0 }, { x: 284, y: 90 }, { x: 0, y: 35.5 }],
                        points3to4: [{ x: 0, y: 35.5 }, { x: 35.5, y: 142 }],
                        points4to5: [{ x: 35.5, y: 142 }, { x: 200, y: 65 }],
                    },
                ],
            },
            {
                origin: 60,
                name: 'Partiendo de Salida 60 (Banda Corta)',
                shots: [
                    {
                        attack: 20,
                        arrival: 40,
                        points1to3: [{ x: 0, y: 106.5 }, { x: 71, y: 0 }, { x: 284, y: 25 }, { x: 12, y: 138 }],
                        points3to4: [{ x: 12, y: 138 }, { x: 142, y: 142 }],
                        points4to5: [{ x: 142, y: 142 }, { x: 278, y: 15 }],
                    },
                    {
                        attack: 30,
                        arrival: 30,
                        points1to3: [{ x: 0, y: 106.5 }, { x: 106.5, y: 0 }, { x: 284, y: 50 }, { x: 0, y: 106.5 }],
                        points3to4: [{ x: 0, y: 106.5 }, { x: 106.5, y: 142 }],
                        points4to5: [{ x: 106.5, y: 142 }, { x: 260, y: 35 }],
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
