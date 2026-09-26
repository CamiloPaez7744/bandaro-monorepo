export type BallId = 'white' | 'yellow' | 'red';
export type CushionSide = 'top' | 'bottom' | 'left' | 'right';

export interface Vec2 {
    x: number;
    y: number;
}

export interface Ball {
    id: BallId;
    pos: Vec2;
    vel: Vec2;
    spin: Vec2; // x: lateral (sidespin / horario / antihorario), y: longitudinal (corrido > 0 / retroceso < 0)
    radius: number;
}

export interface SpinEffect {
    x: number; // -1 (izq / antihorario) .. +1 (der / horario)
    y: number; // -1 (abajo / retroceso) .. +1 (arriba / corrido)
    magnitude: number; // 0 .. 1
}

export interface ShotConfig {
    cueBallId: BallId;
    direction: Vec2;
    power: number;
    spin: SpinEffect;
}

export interface CushionContact {
    ballId?: BallId;
    side?: CushionSide;
    cushionNumber?: number;
    position: Vec2;
    normal: Vec2;
    timestamp: number;
}

export interface BallCollision {
    ball1: BallId;
    ball2: BallId;
    position: Vec2;
    timestamp: number;
}

export interface ShotEvent {
    type: 'cushion' | 'ball_collision' | 'ball_pocketed' | 'shot_end';
    timestamp: number;
    data: CushionContact | BallCollision | { ballId: BallId };
}

export interface TrailPoint {
    pos: Vec2;
    timestamp?: number;
    type?: 'normal' | 'cushion' | 'ball_collision';
    cushionSide?: CushionSide;
    cushionNumber?: number;
    otherBallId?: BallId;
}

export interface BallTrajectoryTrail {
    ballId: BallId;
    points: TrailPoint[];
}

export interface SimulationState {
    balls: Ball[];
    events: ShotEvent[];
    trails?: Record<BallId, TrailPoint[]>;
    time: number;
    isRunning: boolean;
}

export interface TableDimensions {
    width: number;
    height: number;
    railThickness: number;
    cushionThickness: number;
}

export const DEFAULT_TABLE: TableDimensions = {
    width: 284,
    height: 142,
    railThickness: 8.27,
    cushionThickness: 4.73,
};

export const BALL_RADIUS = 3.075;

export const PHYSICS = {
    friction: 0.990,
    minVelocity: 0.05,
    maxIterations: 15000,
    timeStep: 0.016,
    cushionRestitution: 0.74,
    cushionFriction: 0.22,
    ballRestitution: 0.95,
    spinDecay: 0.970,
    spinInfluence: 0.25,
    englishBounceFactor: 1.25,
};

export const VELOCITY_CALIBRATION_POINTS = [
    { pct: 0, v: 0.0 },
    { pct: 10, v: 1.439 },
    { pct: 20, v: 2.828 }, // 1 largo de mesa (Velocidad 1: casi toca banda corta opuesta)
    { pct: 30, v: 4.723 },
    { pct: 40, v: 6.601 }, // 2 largos de mesa (Velocidad 2: regresa a la posición de salida)
    { pct: 50, v: 9.159 },
    { pct: 60, v: 11.696 }, // 3 largos de mesa (Velocidad 3: rebota en 2 bandas cortas y casi toca la opuesta)
    { pct: 70, v: 15.140 },
    { pct: 80, v: 18.555 }, // 4 largos de mesa (Velocidad 4: rebota en 3 bandas cortas y regresa a la inicial)
    { pct: 90, v: 23.212 },
    { pct: 100, v: 27.838 }, // 5 largos de mesa (Velocidad 5: 5 largos de mesa)
] as const;

export function calculateShotVelocity(powerPercentage: number): number {
    const clamped = Math.max(0, Math.min(100, powerPercentage));
    if (clamped <= 0) return 0;

    for (let i = 0; i < VELOCITY_CALIBRATION_POINTS.length - 1; i++) {
        const p0 = VELOCITY_CALIBRATION_POINTS[i];
        const p1 = VELOCITY_CALIBRATION_POINTS[i + 1];
        if (clamped >= p0.pct && clamped <= p1.pct) {
            const ratio = (clamped - p0.pct) / (p1.pct - p0.pct);
            return p0.v + ratio * (p1.v - p0.v);
        }
    }

    return VELOCITY_CALIBRATION_POINTS[VELOCITY_CALIBRATION_POINTS.length - 1].v;
}

export interface PowerLevel {
    level: number;
    label: string;
    description: string;
    velocity: number;
}

export const POWER_LEVELS: PowerLevel[] = [
    {
        level: 1,
        label: 'Muy suave',
        description: 'La bola casi llega a la banda corta (1 largo)',
        velocity: 2.828,
    },
    {
        level: 2,
        label: 'Suave',
        description: 'Llega a la banda corta y regresa a la posición inicial (2 largos)',
        velocity: 6.601,
    },
    {
        level: 3,
        label: 'Medio',
        description: 'Rebota en 2 bandas cortas y regresa a la opuesta (3 largos)',
        velocity: 11.696,
    },
    {
        level: 4,
        label: 'Fuerte',
        description: 'Rebota en 3 bandas cortas y regresa a la inicial (4 largos)',
        velocity: 18.555,
    },
    {
        level: 5,
        label: 'Muy fuerte',
        description: 'Máxima potencia para 5 largos de mesa (5 largos)',
        velocity: 27.838,
    },
];

