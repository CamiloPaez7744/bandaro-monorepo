export type BallId = 'white' | 'yellow' | 'red';

export interface Vec2 {
    x: number;
    y: number;
}

export interface Ball {
    id: BallId;
    pos: Vec2;
    vel: Vec2;
    spin: Vec2;
    radius: number;
}

export interface SpinEffect {
    x: number;
    y: number;
    magnitude: number;
}

export interface ShotConfig {
    cueBallId: BallId;
    direction: Vec2;
    power: number;
    spin: SpinEffect;
}

export interface CushionContact {
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

export interface SimulationState {
    balls: Ball[];
    events: ShotEvent[];
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
    cushionRestitution: 0.90,
    ballRestitution: 0.95,
    spinDecay: 0.95,
    spinInfluence: 0.25,
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
        description: 'La bola casi llega a la banda corta',
        velocity: 1.2,
    },
    {
        level: 2,
        label: 'Suave',
        description: 'Llega a la banda corta y rebota casi hasta la opuesta',
        velocity: 2.2,
    },
    {
        level: 3,
        label: 'Medio',
        description: 'Rebota en ambas bandas cortas',
        velocity: 3.5,
    },
    {
        level: 4,
        label: 'Fuerte',
        description: 'Múltiples rebotes con buena velocidad',
        velocity: 5.2,
    },
    {
        level: 5,
        label: 'Muy fuerte',
        description: 'Máxima potencia para tiros largos',
        velocity: 7.5,
    },
];
