import {
    Ball,
    BallId,
    Vec2,
    TableDimensions,
    DEFAULT_TABLE,
    PHYSICS,
    SpinEffect,
    CushionContact,
    BallCollision,
} from './types';
import {
    vec2,
    vec2Add,
    vec2Sub,
    vec2Scale,
    vec2Length,
    vec2Normalize,
    vec2Dot,
    vec2Distance,
    isBallMoving,
    applyFriction,
    updateBallPosition,
    checkCushionCollision,
    resolveCushionCollision,
    checkBallCollision,
    resolveBallCollision,
    simulateStep,
} from './physics';

export interface TrajectoryPoint {
    pos: Vec2;
    type: 'normal' | 'cushion' | 'collision';
    timestamp: number;
}

export interface TrajectoryPath {
    ballId: BallId;
    points: TrajectoryPoint[];
}

export interface TrajectoryPrediction {
    paths: TrajectoryPath[];
    cushionContacts: number;
    ballCollisions: { ball1: BallId; ball2: BallId; pointIndex: number }[];
    isValid: boolean;
}

export function predictTrajectory(
    initialBalls: Ball[],
    cueBallId: BallId,
    direction: Vec2,
    power: number,
    spin: SpinEffect,
    maxSteps?: number,
    table: TableDimensions = DEFAULT_TABLE
): TrajectoryPrediction {
    if (power <= 0) {
        return { paths: [], cushionContacts: 0, ballCollisions: [], isValid: false };
    }

    // Clone balls for simulation
    let simBalls = initialBalls.map((b) => ({
        id: b.id,
        pos: { ...b.pos },
        vel: { x: 0, y: 0 },
        spin: { x: 0, y: 0 },
        radius: b.radius,
    }));

    const cueBall = simBalls.find((b) => b.id === cueBallId);
    if (!cueBall) {
        return { paths: [], cushionContacts: 0, ballCollisions: [], isValid: false };
    }

    // Apply initial velocity to cue ball
    const normalizedDir = vec2Normalize(direction);
    cueBall.vel = vec2Scale(normalizedDir, power);
    cueBall.spin = vec2Scale(vec2(spin.x, spin.y), spin.magnitude);

    const calculatedMaxSteps = maxSteps ?? Math.min(
        800,
        Math.ceil(Math.log(PHYSICS.minVelocity / Math.max(0.1, power)) / Math.log(PHYSICS.friction)) + 40
    );

    // Initialize paths - only cue ball starts with initial position
    const paths: Record<string, TrajectoryPoint[]> = {};
    paths[cueBallId] = [{ pos: { x: cueBall.pos.x, y: cueBall.pos.y }, type: 'normal', timestamp: 0 }];
    simBalls.forEach((b) => {
        if (b.id !== cueBallId) {
            paths[b.id] = [];
        }
    });

    const ballCollisions: { ball1: BallId; ball2: BallId; pointIndex: number }[] = [];
    let cushionContacts = 0;
    let cushionsBeforeSecondCollision = 0;
    let secondCollisionRegistered = false;
    const POINT_DISTANCE_THRESHOLD = 2.5;

    // Simulate step by step using simulateStep (identical to real runtime execution)
    for (let step = 0; step < calculatedMaxSteps; step++) {
        const anyMoving = simBalls.some((b) => isBallMoving(b));
        if (!anyMoving) break;

        const { balls: nextBalls, events } = simulateStep(simBalls, table);
        simBalls = nextBalls;

        const stepEventTypes: Record<string, 'cushion' | 'collision'> = {};

        // Process collision and cushion events
        for (const evt of events) {
            if (evt.type === 'cushion') {
                const data = evt.data as CushionContact;
                if (data.ballId === cueBallId) {
                    cushionContacts++;
                }
                if (data.ballId) {
                    stepEventTypes[data.ballId] = 'cushion';
                }
            } else if (evt.type === 'ball_collision') {
                const data = evt.data as BallCollision;
                const isCueBallCollision = data.ball1 === cueBallId || data.ball2 === cueBallId;
                const alreadyCollided = ballCollisions.some(
                    (c) => (c.ball1 === data.ball1 && c.ball2 === data.ball2) || (c.ball1 === data.ball2 && c.ball2 === data.ball1)
                );

                stepEventTypes[data.ball1] = 'collision';
                stepEventTypes[data.ball2] = 'collision';

                if (isCueBallCollision && !alreadyCollided) {
                    const pointIndex = Math.max(0, paths[cueBallId].length - 1);
                    ballCollisions.push({
                        ball1: data.ball1,
                        ball2: data.ball2,
                        pointIndex,
                    });

                    if (ballCollisions.length === 2 && !secondCollisionRegistered) {
                        cushionsBeforeSecondCollision = cushionContacts;
                        secondCollisionRegistered = true;
                    }
                }
            }
        }

        // Record positions every step if ball moved significantly or collision/cushion occurred
        simBalls.forEach((ball) => {
            const ballPath = paths[ball.id];
            const eventType = stepEventTypes[ball.id];

            if (eventType) {
                ballPath.push({
                    pos: { x: ball.pos.x, y: ball.pos.y },
                    type: eventType,
                    timestamp: step,
                });
            } else if (ballPath.length === 0) {
                if (ball.vel.x !== 0 || ball.vel.y !== 0) {
                    ballPath.push({
                        pos: { x: ball.pos.x, y: ball.pos.y },
                        type: 'normal',
                        timestamp: step,
                    });
                }
            } else {
                const lastPoint = ballPath[ballPath.length - 1];
                const distFromLast = Math.hypot(ball.pos.x - lastPoint.pos.x, ball.pos.y - lastPoint.pos.y);
                if (distFromLast >= POINT_DISTANCE_THRESHOLD) {
                    ballPath.push({
                        pos: { x: ball.pos.x, y: ball.pos.y },
                        type: 'normal',
                        timestamp: step,
                    });
                }
            }
        });
    }

    // Convert paths to TrajectoryPath format
    const trajectoryPaths: TrajectoryPath[] = [];
    Object.entries(paths).forEach(([ballId, points]) => {
        if (points.length > 1) {
            trajectoryPaths.push({
                ballId: ballId as BallId,
                points,
            });
        }
    });

    const isValid = ballCollisions.length >= 2 && cushionsBeforeSecondCollision >= 3;

    return {
        paths: trajectoryPaths,
        cushionContacts,
        ballCollisions,
        isValid,
    };
}

export function getTrajectoryForBall(
    prediction: TrajectoryPrediction,
    ballId: BallId
): TrajectoryPoint[] {
    const path = prediction.paths.find((p) => p.ballId === ballId);
    return path ? path.points : [];
}

export function getCushionContactPoints(
    prediction: TrajectoryPrediction,
    ballId: BallId
): Vec2[] {
    const path = prediction.paths.find((p) => p.ballId === ballId);
    if (!path) return [];
    return path.points.filter((p) => p.type === 'cushion').map((p) => p.pos);
}

export function getCollisionPoints(prediction: TrajectoryPrediction): Vec2[] {
    return prediction.ballCollisions.map((c) => {
        const path = prediction.paths.find(
            (p) => p.ballId === c.ball1 || p.ballId === c.ball2
        );
        if (!path) return vec2(0, 0);
        const point = path.points[c.pointIndex];
        return point ? point.pos : vec2(0, 0);
    });
}
