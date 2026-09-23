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
    friction: 0.992,
    minVelocity: 0.05,
    maxIterations: 15000,
    timeStep: 0.016,
    cushionRestitution: 0.82,
    cushionFriction: 0.18,
    ballRestitution: 0.96,
    spinDecay: 0.965,
    spinInfluence: 0.28,
    englishBounceFactor: 1.45,
};

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
        description: 'La bola casi llega a la banda corta (1 banda)',
        velocity: 1.2,
    },
    {
        level: 2,
        label: 'Suave',
        description: 'Llega a la banda corta y rebota casi hasta la opuesta (2 bandas)',
        velocity: 2.2,
    },
    {
        level: 3,
        label: 'Medio',
        description: 'Recorrido estándar de carambola a 3 bandas (3 bandas)',
        velocity: 3.5,
    },
    {
        level: 4,
        label: 'Fuerte',
        description: 'Múltiples rebotes con velocidad para pasebolas o cajones (4-5 bandas)',
        velocity: 5.2,
    },
    {
        level: 5,
        label: 'Muy fuerte',
        description: 'Máxima potencia para recorridos largos o dobles vueltas (5+ bandas)',
        velocity: 7.5,
    },
];

