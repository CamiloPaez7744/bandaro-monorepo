import type { DiamondPinItem, TablePoint } from './TrainingPlayTable';

export type AristaCorner = 'bottom_left' | 'bottom_right' | 'top_right' | 'top_left';

export interface Base50ShotData {
    departure: number;
    attack: number;
    arrival: number;
    arrival3rd: number;
    arrival4th: number;
    points1to3: TablePoint[];
    points3to4: TablePoint[];
    points4to5: TablePoint[];
    projectionLine?: TablePoint[];
}

export interface AristaConfig {
    id: AristaCorner;
    title: string;
    subtitle: string;
    label: string;
    shortLabel: string;
    whiteBall: TablePoint;
    yellowBall: TablePoint;
    redBall: TablePoint;
    pins: DiamondPinItem[];
    shots: Base50ShotData[];
}

// Canonical shots from Salida 50 (Bottom-Left Arista)
// Canonical shots from Salida 50 (Bottom-Left Arista)
// Rebounding: 1ª Top (Ataque: 10..90 de der a izq) -> 2ª Right -> 3ª Bottom (Llegada: S - A frente al caucho) -> 4ª Top-Left carom
const CANONICAL_BL_SHOTS: Base50ShotData[] = [
    {
        attack: 30,
        departure: 50,
        arrival: 20,
        arrival3rd: 20,
        arrival4th: 20,
        // Canónica principal: Salida 50 proyectada a Ataque 30 (diamante x = 177.5).
        // En el caucho impacta antes a x = 166.1 (un poco más atrás en el recorrido hacia el diamante).
        // Línea punteada entre el caucho (166.1, 2) y el diamante (177.5, -7.7).
        points1to3: [{ x: 18, y: 128 }, { x: 166.1, y: 2 }, { x: 282, y: 78 }, { x: 213, y: 140 }],
        points3to4: [{ x: 213, y: 140 }, { x: 25, y: 25 }],
        points4to5: [{ x: 25, y: 25 }, { x: 38, y: 18 }],
        projectionLine: [{ x: 166.1, y: 2 }, { x: 177.5, y: -7.7 }],
    },
    {
        attack: 20,
        departure: 50,
        arrival: 30,
        arrival3rd: 30,
        arrival4th: 30,
        // Salida 50 proyectada a Ataque 20 (diamante x = 213.0). Impacto caucho en x = 199.1
        points1to3: [{ x: 18, y: 128 }, { x: 199.1, y: 2 }, { x: 282, y: 58 }, { x: 177.5, y: 140 }],
        points3to4: [{ x: 177.5, y: 140 }, { x: 14, y: 65 }],
        points4to5: [{ x: 14, y: 65 }, { x: 45, y: 25 }],
        projectionLine: [{ x: 199.1, y: 2 }, { x: 213.0, y: -7.7 }],
    },
    {
        attack: 40,
        departure: 50,
        arrival: 10,
        arrival3rd: 10,
        arrival4th: 10,
        // Salida 50 proyectada a Ataque 40 (diamante x = 142.0). Impacto caucho en x = 133.1
        points1to3: [{ x: 18, y: 128 }, { x: 133.1, y: 2 }, { x: 282, y: 102 }, { x: 248.5, y: 140 }],
        points3to4: [{ x: 248.5, y: 140 }, { x: 38, y: 18 }],
        points4to5: [{ x: 38, y: 18 }, { x: 18, y: 25 }],
        projectionLine: [{ x: 133.1, y: 2 }, { x: 142.0, y: -7.7 }],
    },
    {
        attack: 50,
        departure: 50,
        arrival: 0,
        arrival3rd: 0,
        arrival4th: 0,
        // Salida 50 proyectada a Ataque 50 (diamante x = 106.5). Impacto caucho en x = 100.2
        points1to3: [{ x: 18, y: 128 }, { x: 100.2, y: 2 }, { x: 282, y: 126 }, { x: 282, y: 140 }],
        points3to4: [{ x: 282, y: 140 }, { x: 55, y: 15 }],
        points4to5: [{ x: 55, y: 15 }, { x: 18, y: 30 }],
        projectionLine: [{ x: 100.2, y: 2 }, { x: 106.5, y: -7.7 }],
    },
    {
        attack: 5,
        departure: 50,
        arrival: 45,
        arrival3rd: 45,
        arrival4th: 45,
        // Salida 50 proyectada a Ataque 5 (punto x = 265.0). Impacto caucho en x = 247.6
        points1to3: [{ x: 18, y: 128 }, { x: 247.6, y: 2 }, { x: 282, y: 38 }, { x: 142, y: 140 }],
        points3to4: [{ x: 142, y: 140 }, { x: 14, y: 90 }],
        points4to5: [{ x: 14, y: 90 }, { x: 55, y: 25 }],
        projectionLine: [{ x: 247.6, y: 2 }, { x: 265.0, y: -7.7 }],
    },
    {
        attack: 10,
        departure: 70,
        arrival: 60,
        arrival3rd: 60,
        arrival4th: 60,
        // Salida 70 proyectada a Ataque 10 (diamante x = 248.5). Impacto caucho en x = 219.7
        points1to3: [{ x: 15, y: 71 }, { x: 219.7, y: 2 }, { x: 282, y: 32 }, { x: 106.5, y: 140 }],
        points3to4: [{ x: 106.5, y: 140 }, { x: 14, y: 115 }],
        points4to5: [{ x: 14, y: 115 }, { x: 60, y: 28 }],
        projectionLine: [{ x: 219.7, y: 2 }, { x: 248.5, y: -7.7 }],
    },
    {
        attack: 10,
        departure: 90,
        arrival: 80,
        arrival3rd: 80,
        arrival4th: 80,
        // Salida 90 proyectada a Ataque 10 (diamante x = 248.5). Impacto caucho en x = 196.1
        points1to3: [{ x: 15, y: 35.5 }, { x: 196.1, y: 2 }, { x: 282, y: 28 }, { x: 71, y: 140 }],
        points3to4: [{ x: 71, y: 140 }, { x: 14, y: 130 }],
        points4to5: [{ x: 14, y: 130 }, { x: 70, y: 25 }],
        projectionLine: [{ x: 196.1, y: 2 }, { x: 248.5, y: -7.7 }],
    },
    {
        attack: 0,
        departure: 100,
        arrival: 100,
        arrival3rd: 100,
        arrival4th: 100,
        // Salida 100 proyectada a Ataque 0 (esquina límite x = 282.0). Impacto caucho en x = 250.0
        points1to3: [{ x: 15, y: 10 }, { x: 250.0, y: 2 }, { x: 282, y: 22 }, { x: 35.5, y: 140 }],
        points3to4: [{ x: 35.5, y: 140 }, { x: 14, y: 138 }],
        points4to5: [{ x: 14, y: 138 }, { x: 75, y: 25 }],
        projectionLine: [{ x: 250.0, y: 2 }, { x: 282.0, y: -7.7 }],
    },
];

// Canonical Pins for Bottom-Left Arista
const CANONICAL_BL_PINS: DiamondPinItem[] = [
    // 1. Ataque (Top Rail, pinDirection = 'down', Color = #ef4444)
    // Límite del sistema = 0 en ataque (esquina derecha). Numeración: 0, 10, 20, 30, 40, 50, 70, 90 de der a izq
    { x: 282.0, y: 0, label: '0', pinColor: '#ef4444', pinDirection: 'down', role: 'attack' },
    { x: 248.5, y: 0, label: '10', pinColor: '#ef4444', pinDirection: 'down', role: 'attack' },
    { x: 213.0, y: 0, label: '20', pinColor: '#ef4444', pinDirection: 'down', role: 'attack' },
    { x: 177.5, y: 0, label: '30', pinColor: '#ef4444', pinDirection: 'down', role: 'attack' },
    { x: 142.0, y: 0, label: '40', pinColor: '#ef4444', pinDirection: 'down', role: 'attack' },
    { x: 106.5, y: 0, label: '50', pinColor: '#ef4444', pinDirection: 'down', role: 'attack' },
    { x: 71.0, y: 0, label: '70', pinColor: '#ef4444', pinDirection: 'down', role: 'attack' },
    { x: 35.5, y: 0, label: '90', pinColor: '#ef4444', pinDirection: 'down', role: 'attack' },

    // 2. Salida (Bottom Rail, pinDirection = 'up', Color = #facc15)
    { x: 0, y: 142, label: '50', pinColor: '#facc15', pinDirection: 'up', role: 'departure' },
    { x: 35.5, y: 142, label: '45', pinColor: '#facc15', pinDirection: 'up', role: 'departure' },
    { x: 71, y: 142, label: '40', pinColor: '#facc15', pinDirection: 'up', role: 'departure' },
    { x: 106.5, y: 142, label: '35', pinColor: '#facc15', pinDirection: 'up', role: 'departure' },
    { x: 142, y: 142, label: '30', pinColor: '#facc15', pinDirection: 'up', role: 'departure' },
    { x: 177.5, y: 142, label: '25', pinColor: '#facc15', pinDirection: 'up', role: 'departure' },
    { x: 213, y: 142, label: '20', pinColor: '#facc15', pinDirection: 'up', role: 'departure' },
    { x: 248.5, y: 142, label: '15', pinColor: '#facc15', pinDirection: 'up', role: 'departure' },

    // 3. Salida Extension (Left Short Rail, pinDirection = 'right', Color = #facc15)
    { x: 0, y: 106.5, label: '60', pinColor: '#facc15', pinDirection: 'right', role: 'departure' },
    { x: 0, y: 71, label: '70', pinColor: '#facc15', pinDirection: 'right', role: 'departure' },
    { x: 0, y: 35.5, label: '80', pinColor: '#facc15', pinDirection: 'right', role: 'departure' },

    // 4. Llegada 3ª Banda (REGLA 11: Siempre frente al caucho / en la banda, Color = #10b981)
    // Escala Canónica: 0 en la esquina, 10, 20, 30, 45, 60, 80 y 100
    { x: 282.0, y: 142, label: '0', pinColor: '#10b981', pinDirection: 'down', role: 'arrival_3rd' },
    { x: 248.5, y: 142, label: '10', pinColor: '#10b981', pinDirection: 'down', role: 'arrival_3rd' },
    { x: 213.0, y: 142, label: '20', pinColor: '#10b981', pinDirection: 'down', role: 'arrival_3rd' },
    { x: 177.5, y: 142, label: '30', pinColor: '#10b981', pinDirection: 'down', role: 'arrival_3rd' },
    { x: 142.0, y: 142, label: '45', pinColor: '#10b981', pinDirection: 'down', role: 'arrival_3rd' },
    { x: 106.5, y: 142, label: '60', pinColor: '#10b981', pinDirection: 'down', role: 'arrival_3rd' },
    { x: 71.0, y: 142, label: '80', pinColor: '#10b981', pinDirection: 'down', role: 'arrival_3rd' },
    { x: 35.5, y: 142, label: '100', pinColor: '#10b981', pinDirection: 'down', role: 'arrival_3rd' },
];

function transformPoint(pt: TablePoint, flipX: boolean, flipY: boolean): TablePoint {
    return {
        x: flipX ? 284 - pt.x : pt.x,
        y: flipY ? 142 - pt.y : pt.y,
    };
}

function transformPin(pin: DiamondPinItem, flipX: boolean, flipY: boolean): DiamondPinItem {
    let dir = pin.pinDirection;
    if (flipY) {
        if (dir === 'down') dir = 'up';
        else if (dir === 'up') dir = 'down';
    }
    if (flipX) {
        if (dir === 'right') dir = 'left';
        else if (dir === 'left') dir = 'right';
    }

    return {
        ...pin,
        x: flipX ? 284 - pin.x : pin.x,
        y: flipY ? 142 - pin.y : pin.y,
        pinDirection: dir,
    };
}

function transformShot(shot: Base50ShotData, flipX: boolean, flipY: boolean): Base50ShotData {
    return {
        ...shot,
        points1to3: shot.points1to3.map((pt) => transformPoint(pt, flipX, flipY)),
        points3to4: shot.points3to4.map((pt) => transformPoint(pt, flipX, flipY)),
        points4to5: shot.points4to5.map((pt) => transformPoint(pt, flipX, flipY)),
        projectionLine: shot.projectionLine ? shot.projectionLine.map((pt) => transformPoint(pt, flipX, flipY)) : undefined,
    };
}

export function detectAristaFromBall(ballPos: { x: number; y: number }): AristaCorner {
    const isRight = ballPos.x > 142;
    const isBottom = ballPos.y >= 71;
    if (!isRight && isBottom) return 'bottom_left';
    if (isRight && isBottom) return 'bottom_right';
    if (isRight && !isBottom) return 'top_right';
    return 'top_left';
}

export function getAristaConfig(corner: AristaCorner): AristaConfig {
    const flipX = corner === 'bottom_right' || corner === 'top_right';
    const flipY = corner === 'top_left' || corner === 'top_right';

    const titles: Record<AristaCorner, { title: string; subtitle: string; label: string; shortLabel: string }> = {
        bottom_left: {
            title: 'Arista 1: Esquina Inf-Izq (Canónica)',
            subtitle: 'Salida en banda larga inferior / corta izq hacia banda superior',
            label: 'Inf-Izq',
            shortLabel: '◱ Inf-Izq (50)',
        },
        bottom_right: {
            title: 'Arista 2: Esquina Inf-Der',
            subtitle: 'Salida en banda larga inferior / corta der hacia banda superior',
            label: 'Inf-Der',
            shortLabel: '◲ Inf-Der (50)',
        },
        top_right: {
            title: 'Arista 3: Esquina Sup-Der',
            subtitle: 'Salida en banda larga superior / corta der hacia banda inferior',
            label: 'Sup-Der',
            shortLabel: '◳ Sup-Der (50)',
        },
        top_left: {
            title: 'Arista 4: Esquina Sup-Izq',
            subtitle: 'Salida en banda larga superior / corta izq hacia banda inferior',
            label: 'Sup-Izq',
            shortLabel: '◰ Sup-Izq (50)',
        },
    };

    const whiteBall = transformPoint({ x: 18, y: 128 }, flipX, flipY);
    const yellowBall = transformPoint({ x: 25, y: 25 }, flipX, flipY);
    const redBall = transformPoint({ x: 38, y: 18 }, flipX, flipY);

    const pins = CANONICAL_BL_PINS.map((pin) => transformPin(pin, flipX, flipY));
    const shots = CANONICAL_BL_SHOTS.map((shot) => transformShot(shot, flipX, flipY));

    return {
        id: corner,
        title: titles[corner].title,
        subtitle: titles[corner].subtitle,
        label: titles[corner].label,
        shortLabel: titles[corner].shortLabel,
        whiteBall,
        yellowBall,
        redBall,
        pins,
        shots,
    };
}
