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
    white: Point2D;
    yellow: Point2D;
    red: Point2D;
    trajectory: Point2D[];
}

export interface TrainingSystem {
    id: string;
    name: string;
    subtitle: string;
    difficulty: 'basic' | 'intermediate' | 'advanced';
    focus: string;
    recommendedPower: number;
    recommendedEffect: EffectKey;
    rules: string[];
    positions: TrainingPosition[];
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

export const CONTACT_PRESETS: Record<ContactKey, { label: string; description: string }> = {
    '1/2': { label: 'Media bola', description: 'Impacto pleno para lineas estables.' },
    '1/4': { label: 'Cuarto de bola', description: 'Corte moderado con control de salida.' },
    '1/8': { label: 'Octavo de bola', description: 'Corte fino para ajustar banda larga.' },
    '1/16': { label: 'Dieciseisavo', description: 'Rozada extrema, muy tecnico.' },
};

export const TRAINING_SYSTEMS: TrainingSystem[] = [
    {
        id: 'base-50',
        name: 'Base 50',
        subtitle: 'Fundamentos de tres bandas',
        difficulty: 'basic',
        focus: 'Memoria de salidas y lectura de diamantes',
        recommendedPower: 60,
        recommendedEffect: 'center',
        rules: ['Llegada = Salida + Bola 1', 'Sin efecto lateral', 'Potencia media 55%-65%'],
        positions: [
            {
                id: 'b50-1',
                white: { x: 44, y: 110 },
                yellow: { x: 176, y: 76 },
                red: { x: 40, y: 44 },
                trajectory: [
                    { x: 44, y: 110 },
                    { x: 84, y: 6 },
                    { x: 280, y: 66 },
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
                    { x: 92, y: 8 },
                    { x: 276, y: 64 },
                    { x: 188, y: 58 },
                ],
            },
        ],
    },
    {
        id: 'renverse',
        name: 'Renverse',
        subtitle: 'Control de retroceso y cierre',
        difficulty: 'intermediate',
        focus: 'Cerrar angulos con efecto retrogrado',
        recommendedPower: 50,
        recommendedEffect: 'bottom-right',
        rules: ['Efecto retrógrado dominante', 'Ataque de primera banda corta', 'Potencia 45%-55%'],
        positions: [
            {
                id: 'ren-1',
                white: { x: 54, y: 112 },
                yellow: { x: 210, y: 86 },
                red: { x: 36, y: 62 },
                trajectory: [
                    { x: 54, y: 112 },
                    { x: 100, y: 8 },
                    { x: 92, y: 140 },
                    { x: 86, y: 6 },
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
                    { x: 96, y: 8 },
                    { x: 102, y: 140 },
                    { x: 110, y: 8 },
                    { x: 204, y: 74 },
                ],
            },
        ],
    },
    {
        id: 'cajones-largos',
        name: 'Cajones Largos',
        subtitle: 'Progresion por diamantes',
        difficulty: 'advanced',
        focus: 'Ritmo de potencia para recorridos largos',
        recommendedPower: 66,
        recommendedEffect: 'top-right',
        rules: ['Salida = Cajon x 0.5', 'Ajuste por paño y banda', 'Potencia 60%-72%'],
        positions: [
            {
                id: 'cl-1',
                white: { x: 50, y: 106 },
                yellow: { x: 220, y: 82 },
                red: { x: 74, y: 36 },
                trajectory: [
                    { x: 50, y: 106 },
                    { x: 16, y: 20 },
                    { x: 122, y: 6 },
                    { x: 204, y: 136 },
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
                    { x: 20, y: 24 },
                    { x: 128, y: 8 },
                    { x: 214, y: 138 },
                    { x: 226, y: 70 },
                ],
            },
        ],
    },
];

export function getTrainingSystemById(systemId: string) {
    return TRAINING_SYSTEMS.find((system) => system.id === systemId) ?? null;
}
