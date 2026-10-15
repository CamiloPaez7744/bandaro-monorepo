/**
 * Data definitions for Sistema Base 50
 * Strictly adheres to:
 * - AM Billiard Academy reference: https://www.youtube.com/watch?v=o2kk7p6ig1Q
 * - Reference pin styling: numeración.png
 * - Reference clock effects: reloj.png
 * - Formula: Llegada = Salida - Ataque
 * - Colors: Salida (Amarillo #facc15), Ataque (Rojo #ef4444), Llegada (Verde #10b981)
 * - Regla 11: Salidas y Ataques se miden por Diamante (madera); TODAS las Llegadas van siempre frente al caucho (en la banda / cushion nose), solo las llegadas.
 */

export interface DiamondPin {
    slotId: string;
    rail: 'top' | 'right' | 'bottom' | 'left';
    diamondIndex: number;
    x: number;
    y: number;
    role: 'departure' | 'attack' | 'arrival_3rd' | 'arrival_4th';
    value: number;
    label: string;
    pinColor: string; // '#facc15' | '#ef4444' | '#10b981'
    pinDirection: 'down' | 'up' | 'left' | 'right';
}

export interface CanonicalTrajectoryPoint {
    x: number;
    y: number;
}

export interface Base50CanonicalShot {
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
        system: 'reloj';
        point: number; // 0, 1, 2, 3, 4
        hour: string; // '3:00'
        tips: number; // 3 tips
        description: string;
    };
    balls: {
        white: CanonicalTrajectoryPoint;
        yellow: CanonicalTrajectoryPoint;
        red: CanonicalTrajectoryPoint;
    };
    points1to3: CanonicalTrajectoryPoint[];
    points3to4: CanonicalTrajectoryPoint[];
    points4to5: CanonicalTrajectoryPoint[];
    fullTrajectory: CanonicalTrajectoryPoint[];
}

export const BASE_50_PINS: DiamondPin[] = [
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // ATAQUE (Rojo #ef4444) — 1ª Banda: Top Rail (0 en esquina [límite], 10, 20, 30, 40, 50, 70, 90 de der a izq)
    // -------------------------------------------------------------------------
    { slotId: 'T8', rail: 'top', diamondIndex: 8, x: 282, y: 0, role: 'attack', value: 0, label: '0', pinColor: '#ef4444', pinDirection: 'down' },
    { slotId: 'T7', rail: 'top', diamondIndex: 7, x: 248.5, y: 0, role: 'attack', value: 10, label: '10', pinColor: '#ef4444', pinDirection: 'down' },
    { slotId: 'T6', rail: 'top', diamondIndex: 6, x: 213, y: 0, role: 'attack', value: 20, label: '20', pinColor: '#ef4444', pinDirection: 'down' },
    { slotId: 'T5', rail: 'top', diamondIndex: 5, x: 177.5, y: 0, role: 'attack', value: 30, label: '30', pinColor: '#ef4444', pinDirection: 'down' },
    { slotId: 'T4', rail: 'top', diamondIndex: 4, x: 142, y: 0, role: 'attack', value: 40, label: '40', pinColor: '#ef4444', pinDirection: 'down' },
    { slotId: 'T3', rail: 'top', diamondIndex: 3, x: 106.5, y: 0, role: 'attack', value: 50, label: '50', pinColor: '#ef4444', pinDirection: 'down' },
    { slotId: 'T2', rail: 'top', diamondIndex: 2, x: 71, y: 0, role: 'attack', value: 70, label: '70', pinColor: '#ef4444', pinDirection: 'down' },
    { slotId: 'T1', rail: 'top', diamondIndex: 1, x: 35.5, y: 0, role: 'attack', value: 90, label: '90', pinColor: '#ef4444', pinDirection: 'down' },

    // -------------------------------------------------------------------------
    // SALIDA (Amarillo #facc15) — Banda Larga Inferior (Bottom Rail)
    // -------------------------------------------------------------------------
    { slotId: 'B8', rail: 'bottom', diamondIndex: 0, x: 0, y: 142, role: 'departure', value: 50, label: '50', pinColor: '#facc15', pinDirection: 'up' },
    { slotId: 'B7', rail: 'bottom', diamondIndex: 1, x: 35.5, y: 142, role: 'departure', value: 45, label: '45', pinColor: '#facc15', pinDirection: 'up' },
    { slotId: 'B6', rail: 'bottom', diamondIndex: 2, x: 71, y: 142, role: 'departure', value: 40, label: '40', pinColor: '#facc15', pinDirection: 'up' },
    { slotId: 'B5', rail: 'bottom', diamondIndex: 3, x: 106.5, y: 142, role: 'departure', value: 35, label: '35', pinColor: '#facc15', pinDirection: 'up' },
    { slotId: 'B4', rail: 'bottom', diamondIndex: 4, x: 142, y: 142, role: 'departure', value: 30, label: '30', pinColor: '#facc15', pinDirection: 'up' },
    { slotId: 'B3', rail: 'bottom', diamondIndex: 5, x: 177.5, y: 142, role: 'departure', value: 25, label: '25', pinColor: '#facc15', pinDirection: 'up' },
    { slotId: 'B2', rail: 'bottom', diamondIndex: 6, x: 213, y: 142, role: 'departure', value: 20, label: '20', pinColor: '#facc15', pinDirection: 'up' },
    { slotId: 'B1', rail: 'bottom', diamondIndex: 7, x: 248.5, y: 142, role: 'departure', value: 15, label: '15', pinColor: '#facc15', pinDirection: 'up' },

    // SALIDA CONTINUADA (Amarillo #facc15) — Banda Corta Izquierda (Left Rail - Salidas Abiertas)
    { slotId: 'L3', rail: 'left', diamondIndex: 3, x: 0, y: 106.5, role: 'departure', value: 60, label: '60', pinColor: '#facc15', pinDirection: 'right' },
    { slotId: 'L2', rail: 'left', diamondIndex: 2, x: 0, y: 71, role: 'departure', value: 70, label: '70', pinColor: '#facc15', pinDirection: 'right' },
    { slotId: 'L1', rail: 'left', diamondIndex: 1, x: 0, y: 35.5, role: 'departure', value: 80, label: '80', pinColor: '#facc15', pinDirection: 'right' },
    { slotId: 'L0', rail: 'left', diamondIndex: 0, x: 0, y: 0, role: 'departure', value: 90, label: '90', pinColor: '#facc15', pinDirection: 'right' },

    // -------------------------------------------------------------------------
    // LLEGADA EN 3ª BANDA (Verde #10b981) — Banda Larga Inferior (Frente al caucho: 0 en esquina, 10, 20, 30, 45, 60, 80, 100)
    // -------------------------------------------------------------------------
    { slotId: 'B8-arr', rail: 'bottom', diamondIndex: 8, x: 282, y: 142, role: 'arrival_3rd', value: 0, label: '0', pinColor: '#10b981', pinDirection: 'down' },
    { slotId: 'B7-arr', rail: 'bottom', diamondIndex: 7, x: 248.5, y: 142, role: 'arrival_3rd', value: 10, label: '10', pinColor: '#10b981', pinDirection: 'down' },
    { slotId: 'B6-arr', rail: 'bottom', diamondIndex: 6, x: 213, y: 142, role: 'arrival_3rd', value: 20, label: '20', pinColor: '#10b981', pinDirection: 'down' },
    { slotId: 'B5-arr', rail: 'bottom', diamondIndex: 5, x: 177.5, y: 142, role: 'arrival_3rd', value: 30, label: '30', pinColor: '#10b981', pinDirection: 'down' },
    { slotId: 'B4-arr', rail: 'bottom', diamondIndex: 4, x: 142, y: 142, role: 'arrival_3rd', value: 45, label: '45', pinColor: '#10b981', pinDirection: 'down' },
    { slotId: 'B3-arr', rail: 'bottom', diamondIndex: 3, x: 106.5, y: 142, role: 'arrival_3rd', value: 60, label: '60', pinColor: '#10b981', pinDirection: 'down' },
    { slotId: 'B2-arr', rail: 'bottom', diamondIndex: 2, x: 71, y: 142, role: 'arrival_3rd', value: 80, label: '80', pinColor: '#10b981', pinDirection: 'down' },
    { slotId: 'B1-arr', rail: 'bottom', diamondIndex: 1, x: 35.5, y: 142, role: 'arrival_3rd', value: 100, label: '100', pinColor: '#10b981', pinDirection: 'down' },

    // -------------------------------------------------------------------------
    // LLEGADA EN 4ª BANDA (Verde #10b981) — Banda Larga Inferior (Bottom Rail Retorno)
    // -------------------------------------------------------------------------
    { slotId: 'B7', rail: 'bottom', diamondIndex: 1, x: 35.5, y: 142, role: 'arrival_4th', value: 10, label: '10', pinColor: '#10b981', pinDirection: 'up' },
    { slotId: 'B6', rail: 'bottom', diamondIndex: 2, x: 71, y: 142, role: 'arrival_4th', value: 20, label: '20', pinColor: '#10b981', pinDirection: 'up' },
    { slotId: 'B5', rail: 'bottom', diamondIndex: 3, x: 106.5, y: 142, role: 'arrival_4th', value: 30, label: '30', pinColor: '#10b981', pinDirection: 'up' },
    { slotId: 'B4', rail: 'bottom', diamondIndex: 4, x: 142, y: 142, role: 'arrival_4th', value: 40, label: '40', pinColor: '#10b981', pinDirection: 'up' },
    { slotId: 'B3', rail: 'bottom', diamondIndex: 5, x: 177.5, y: 142, role: 'arrival_4th', value: 50, label: '50', pinColor: '#10b981', pinDirection: 'up' },
    { slotId: 'B2', rail: 'bottom', diamondIndex: 6, x: 213, y: 142, role: 'arrival_4th', value: 60, label: '60', pinColor: '#10b981', pinDirection: 'up' },
    { slotId: 'B1', rail: 'bottom', diamondIndex: 7, x: 248.5, y: 142, role: 'arrival_4th', value: 70, label: '70', pinColor: '#10b981', pinDirection: 'up' },
];

export const BASE_50_SHOTS: Base50CanonicalShot[] = [
    {
        id: 'base-50-shot-1',
        index: 1,
        departure: 50,
        attack: 30,
        arrival3rd: 20,
        arrival4th: 20,
        formulaText: '50 - 30 = 20',
        title: 'Tiro Canónico Maestro: 50 - 30 = 20',
        description: 'La columna vertebral de la geometría de 3 bandas. Ataque al diamante 30 desde la esquina 50, llegando exactamente al centro de la banda corta (diamante 20).',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Rotación horaria pura a las 3:00 (o 9:00 si es invertido), tacada alargada y penetrada sin frenazo.',
        },
        balls: {
            white: { x: 14, y: 136 },
            yellow: { x: 95, y: 22 },
            red: { x: 232, y: 44 },
        },
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
        title: 'Ataque Cerrado: 50 - 20 = 30',
        description: 'Ataque al diamante 20. Apertura amplia en 1ª banda que viaja hacia el diamante 30 en 3ª banda corta, prolongando a diamante 30 en 4ª banda.',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 con tacada flotada y uniforme.',
        },
        balls: {
            white: { x: 14, y: 136 },
            yellow: { x: 62, y: 26 },
            red: { x: 260, y: 28 },
        },
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
        description: 'Tiro de máxima apertura. La bola viaja profunda hacia el rincón opuesto (llegada 40 en 3ª banda, esquina inferior).',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 reloj, acompañamiento total del taco a través de la bola.',
        },
        balls: {
            white: { x: 14, y: 136 },
            yellow: { x: 30, y: 30 },
            red: { x: 275, y: 16 },
        },
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
        description: 'Ataque perpendicular al centro de la mesa (diamante 40). La bola sale hacia el primer diamante de la 3ª banda corta.',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 canónico sin añadir fuerza excesiva.',
        },
        balls: {
            white: { x: 14, y: 136 },
            yellow: { x: 132, y: 18 },
            red: { x: 202, y: 58 },
        },
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
        description: 'Ataque al diamante 50. La bola converge exactamente al vértice cero (rincón superior izquierdo en 3ª banda).',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 con aceleración limpia para evitar acortamiento.',
        },
        balls: {
            white: { x: 14, y: 136 },
            yellow: { x: 168, y: 16 },
            red: { x: 160, y: 72 },
        },
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
        description: 'Ataque entre diamante 2 y 3 (punto 25). Llegada exacta al diamante 2.5 de 3ª banda corta, prolongando al diamante 25 de 4ª banda.',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 reloj estándar.',
        },
        balls: {
            white: { x: 14, y: 136 },
            yellow: { x: 80, y: 22 },
            red: { x: 246, y: 36 },
        },
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
        description: 'Salida desde diamante 1 inferior (45). Con ataque al punto 25 se consigue la misma llegada canónica de 20 en 3ª banda.',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 reloj, tacada penetrante.',
        },
        balls: {
            white: { x: 35.5, y: 136 },
            yellow: { x: 80, y: 22 },
            red: { x: 232, y: 44 },
        },
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
        description: 'Salida desde diamante 2 inferior (40). Ataque directo al diamante 20 superior para alcanzar el diamante 20 de llegada.',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 reloj.',
        },
        balls: {
            white: { x: 71, y: 136 },
            yellow: { x: 65, y: 24 },
            red: { x: 232, y: 44 },
        },
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
        description: 'Salida desde diamante 3 inferior (35). Ataque a 15 para conservar la llegada 20 canónica.',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 reloj suave para no cerrar el ángulo.',
        },
        balls: {
            white: { x: 106.5, y: 136 },
            yellow: { x: 50, y: 22 },
            red: { x: 232, y: 44 },
        },
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
        description: 'Salida abierta desde el primer diamante de la banda corta izquierda (valor 60). Ataque a 40 para llegar con precisión al 20.',
        effect: {
            system: 'reloj',
            point: 3,
            hour: '3:00',
            tips: 3,
            description: 'Efecto 3 reloj, tacada penetrante para vencer el ángulo obtuso.',
        },
        balls: {
            white: { x: 14, y: 106.5 },
            yellow: { x: 134, y: 22 },
            red: { x: 232, y: 44 },
        },
        points1to3: [{ x: 14, y: 106.5 }, { x: 142, y: 0 }, { x: 284, y: 73 }, { x: 0, y: 71 }],
        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
        points4to5: [{ x: 71, y: 142 }, { x: 232, y: 44 }],
        fullTrajectory: [{ x: 14, y: 106.5 }, { x: 142, y: 0 }, { x: 284, y: 73 }, { x: 0, y: 71 }, { x: 71, y: 142 }, { x: 232, y: 44 }],
    },
];

export const BASE_50_SYSTEM_RECORD = {
    id: 'base-50',
    name: 'Sistema Base 50',
    category: 'Sistemas Clásicos',
    formula: 'Llegada = Salida - Ataque',
    description: 'El sistema fundamental del billar a 3 bandas. Asigna valores fijos a cada diamante: Salida en Amarillo (#facc15), Ataque en Rojo (#ef4444) y Llegada en Verde (#10b981). Opera con efecto reloj 3:00 con tacada penetrada sin brusquedad.',
    difficulty: 2,
    defaultBalls: {
        white: { x: 14, y: 136 },
        yellow: { x: 95, y: 22 },
        red: { x: 232, y: 44 },
    },
    defaultTrajectory: BASE_50_SHOTS[0].fullTrajectory,
    author: 'AM Billiard Academy',
    youtubeUrl: 'https://www.youtube.com/watch?v=o2kk7p6ig1Q',
    diagramUrl: '/assets/images/theory/billiard_base50_conti.jpg',
    effectType: 'reloj',
    diamondPinMap: BASE_50_PINS,
    canonicalShots: BASE_50_SHOTS,
    diamondNumbers: {
        attack: BASE_50_PINS.filter((p) => p.role === 'attack').map((p) => ({
            diamond: p.diamondIndex,
            x: p.x,
            y: p.y,
            value: String(p.value),
        })),
        departure: BASE_50_PINS.filter((p) => p.role === 'departure').map((p) => ({
            diamond: p.diamondIndex,
            x: p.x,
            y: p.y,
            value: String(p.value),
        })),
        arrival3rd: BASE_50_PINS.filter((p) => p.role === 'arrival_3rd').map((p) => ({
            diamond: p.diamondIndex,
            x: p.x,
            y: p.y,
            value: String(p.value),
        })),
        arrival4th: BASE_50_PINS.filter((p) => p.role === 'arrival_4th').map((p) => ({
            diamond: p.diamondIndex,
            x: p.x,
            y: p.y,
            value: String(p.value),
        })),
    },
    segmentedTrajectories: [
        { id: 'seg-1-3', label: '1ª a 3ª Banda', color: '#ef4444', description: 'Recorrido inicial desde salida hasta 3ª banda de llegada' },
        { id: 'seg-3-4', label: '3ª a 4ª Banda', color: '#10b981', description: 'Rebote de salida de 3ª banda hacia la 4ª banda larga' },
        { id: 'seg-4-5', label: '4ª a 5ª Banda', color: '#38bdf8', description: 'Proyección final hacia la carambola' },
    ],
    cheatSheets: [
        {
            origin: 50,
            name: 'Partiendo de Salida 50 (Esquina)',
            shots: BASE_50_SHOTS.filter((s) => s.departure === 50).map((s) => ({
                attack: s.attack,
                arrival: s.arrival3rd,
                departure: s.departure,
                arrival3rd: s.arrival3rd,
                arrival4th: s.arrival4th,
                points1to3: s.points1to3,
                points3to4: s.points3to4,
                points4to5: s.points4to5,
            })),
        },
        {
            origin: 45,
            name: 'Partiendo de Salida 45 (Diamante 1)',
            shots: BASE_50_SHOTS.filter((s) => s.departure === 45).map((s) => ({
                attack: s.attack,
                arrival: s.arrival3rd,
                departure: s.departure,
                arrival3rd: s.arrival3rd,
                arrival4th: s.arrival4th,
                points1to3: s.points1to3,
                points3to4: s.points3to4,
                points4to5: s.points4to5,
            })),
        },
        {
            origin: 40,
            name: 'Partiendo de Salida 40 (Diamante 2)',
            shots: BASE_50_SHOTS.filter((s) => s.departure === 40).map((s) => ({
                attack: s.attack,
                arrival: s.arrival3rd,
                departure: s.departure,
                arrival3rd: s.arrival3rd,
                arrival4th: s.arrival4th,
                points1to3: s.points1to3,
                points3to4: s.points3to4,
                points4to5: s.points4to5,
            })),
        },
        {
            origin: 60,
            name: 'Partiendo de Salida 60 (Banda Corta)',
            shots: BASE_50_SHOTS.filter((s) => s.departure === 60).map((s) => ({
                attack: s.attack,
                arrival: s.arrival3rd,
                departure: s.departure,
                arrival3rd: s.arrival3rd,
                arrival4th: s.arrival4th,
                points1to3: s.points1to3,
                points3to4: s.points3to4,
                points4to5: s.points4to5,
            })),
        },
    ],
    isPremium: false,
};
