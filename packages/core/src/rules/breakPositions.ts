import { Vec2 } from '../physics/types';
import { vec2, vec2Normalize, vec2Sub } from '../physics/physics';

export type BreakFormat = 'umb' | 'pba';

export type PbaFormationId = '159' | '357' | '258' | '248' | '268' | '257' | '259';

export interface BallPositions {
    white: Vec2;
    yellow: Vec2;
    red: Vec2;
}

export interface BreakFormationInfo {
    id: string;
    name: string;
    description: string;
    format: BreakFormat;
    balls: BallPositions;
}

/**
 * Posición de Salida Oficial UMB (Unión Mundial de Billar):
 * Mesa estándar internacional de 284 cm x 142 cm:
 * - Bola Roja: En el punto alto / pie de mesa (3/4 de la longitud = 213 cm, Y = 71 cm).
 * - Bola Amarilla (Contraria): En el punto central de la línea de salida (1/4 de la longitud = 71 cm, Y = 71 cm).
 * - Bola Blanca (Tiradora): En la línea de salida (X = 71 cm), a 18.25 cm del punto central.
 *   - Lado derecho (estándar): Y = 71 - 18.25 = 52.75 cm.
 *   - Lado izquierdo: Y = 71 + 18.25 = 89.25 cm.
 */
export const UMB_BREAK_POSITION: BallPositions = {
    white: { x: 71, y: 52.75 },
    yellow: { x: 71, y: 71.0 },
    red: { x: 213, y: 71.0 },
};

export const UMB_BREAK_LEFT_POSITION: BallPositions = {
    white: { x: 71, y: 89.25 },
    yellow: { x: 71, y: 71.0 },
    red: { x: 213, y: 71.0 },
};

/**
 * Grilla de 9 Spots Oficiales de la PBA (Professional Billiards Association):
 * Distribuidos en 3 líneas longitudinales (diamantes 1, 2, 3 = 35.5, 71.0, 106.5 cm)
 * y 3 líneas transversales (salida 1/4 = 71 cm, centro 1/2 = 142 cm, pie 3/4 = 213 cm).
 */
export const PBA_SPOTS: Record<number, Vec2> = {
    1: { x: 71, y: 35.5 },   // Línea de salida, izquierda (Diamante 1)
    2: { x: 71, y: 71.0 },   // Línea de salida, centro (Diamante 2)
    3: { x: 71, y: 106.5 },  // Línea de salida, derecha (Diamante 3)
    4: { x: 142, y: 35.5 },  // Línea central, izquierda (Diamante 1)
    5: { x: 142, y: 71.0 },  // Línea central, centro (Centro de mesa)
    6: { x: 142, y: 106.5 }, // Línea central, derecha (Diamante 3)
    7: { x: 213, y: 35.5 },  // Línea de pie, izquierda (Diamante 1)
    8: { x: 213, y: 71.0 },  // Línea de pie, centro (Punto alto tradicional)
    9: { x: 213, y: 106.5 }, // Línea de pie, derecha (Diamante 3)
};

/**
 * Formaciones oficiales de salida PBA (por sorteo de cartas de 3 spots):
 * - Blanca: elegida entre spots 1, 2, 3.
 * - Amarilla: elegida entre spots 4, 5, 6.
 * - Roja: elegida entre spots 7, 8, 9.
 */
export const PBA_BREAK_FORMATIONS: Record<PbaFormationId, BreakFormationInfo> = {
    '159': {
        id: '159',
        name: 'PBA 1-5-9 (Diagonal canónica)',
        description: 'Blanca en spot 1 (izq.), Amarilla en spot 5 (centro) y Roja en spot 9 (der.). Formación oficial más emblemática del tour.',
        format: 'pba',
        balls: {
            white: PBA_SPOTS[1],
            yellow: PBA_SPOTS[5],
            red: PBA_SPOTS[9],
        },
    },
    '357': {
        id: '357',
        name: 'PBA 3-5-7 (Diagonal invertida)',
        description: 'Blanca en spot 3 (der.), Amarilla en spot 5 (centro) y Roja en spot 7 (izq.). Espejo simétrico de la 1-5-9.',
        format: 'pba',
        balls: {
            white: PBA_SPOTS[3],
            yellow: PBA_SPOTS[5],
            red: PBA_SPOTS[7],
        },
    },
    '258': {
        id: '258',
        name: 'PBA 2-5-8 (Línea central)',
        description: 'Las tres bolas alineadas en el eje longitudinal central: spot 2, 5 y 8.',
        format: 'pba',
        balls: {
            white: PBA_SPOTS[2],
            yellow: PBA_SPOTS[5],
            red: PBA_SPOTS[8],
        },
    },
    '248': {
        id: '248',
        name: 'PBA 2-4-8',
        description: 'Blanca en spot 2 (centro salida), Amarilla en spot 4 (centro izq.) y Roja en spot 8 (centro pie).',
        format: 'pba',
        balls: {
            white: PBA_SPOTS[2],
            yellow: PBA_SPOTS[4],
            red: PBA_SPOTS[8],
        },
    },
    '268': {
        id: '268',
        name: 'PBA 2-6-8',
        description: 'Blanca en spot 2 (centro salida), Amarilla en spot 6 (centro der.) y Roja en spot 8 (centro pie).',
        format: 'pba',
        balls: {
            white: PBA_SPOTS[2],
            yellow: PBA_SPOTS[6],
            red: PBA_SPOTS[8],
        },
    },
    '257': {
        id: '257',
        name: 'PBA 2-5-7',
        description: 'Blanca en spot 2, Amarilla en spot 5 y Roja en spot 7.',
        format: 'pba',
        balls: {
            white: PBA_SPOTS[2],
            yellow: PBA_SPOTS[5],
            red: PBA_SPOTS[7],
        },
    },
    '259': {
        id: '259',
        name: 'PBA 2-5-9',
        description: 'Blanca en spot 2, Amarilla en spot 5 y Roja en spot 9.',
        format: 'pba',
        balls: {
            white: PBA_SPOTS[2],
            yellow: PBA_SPOTS[5],
            red: PBA_SPOTS[9],
        },
    },
};

export const PBA_DEFAULT_BREAK_POSITION = PBA_BREAK_FORMATIONS['159'].balls;

/**
 * Obtiene las posiciones oficiales de salida según el formato elegido y opciones.
 */
export function getBreakPosition(
    format: BreakFormat = 'umb',
    options?: {
        pbaFormation?: PbaFormationId;
        umbSide?: 'right' | 'left';
    }
): BallPositions {
    if (format === 'pba') {
        const formationId = options?.pbaFormation ?? '159';
        const formation = PBA_BREAK_FORMATIONS[formationId] ?? PBA_BREAK_FORMATIONS['159'];
        return {
            white: { ...formation.balls.white },
            yellow: { ...formation.balls.yellow },
            red: { ...formation.balls.red },
        };
    }

    // UMB por defecto
    const side = options?.umbSide ?? 'right';
    const base = side === 'left' ? UMB_BREAK_LEFT_POSITION : UMB_BREAK_POSITION;
    return {
        white: { ...base.white },
        yellow: { ...base.yellow },
        red: { ...base.red },
    };
}

/**
 * Calcula la dirección de apuntado canónica para el tiro de salida,
 * orientando el taco directamente hacia la bola objetivo principal (la roja).
 */
export function getDefaultBreakAim(positions: BallPositions): Vec2 {
    const diff = vec2Sub(positions.red, positions.white);
    return vec2Normalize(diff);
}

/**
 * Genera una formación PBA aleatoria seleccionando cartas al azar:
 * 1 carta de {1, 2, 3}, 1 de {4, 5, 6}, 1 de {7, 8, 9}.
 */
export function getRandomPbaBreak(): { formationId?: PbaFormationId; balls: BallPositions; spotNumbers: [number, number, number] } {
    const wSpot = [1, 2, 3][Math.floor(Math.random() * 3)];
    const ySpot = [4, 5, 6][Math.floor(Math.random() * 3)];
    const rSpot = [7, 8, 9][Math.floor(Math.random() * 3)];

    const idCandidate = `${wSpot}${ySpot}${rSpot}` as PbaFormationId;
    const existing = PBA_BREAK_FORMATIONS[idCandidate];

    return {
        formationId: existing ? idCandidate : undefined,
        spotNumbers: [wSpot, ySpot, rSpot],
        balls: {
            white: PBA_SPOTS[wSpot],
            yellow: PBA_SPOTS[ySpot],
            red: PBA_SPOTS[rSpot],
        },
    };
}
