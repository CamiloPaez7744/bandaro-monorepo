import {
    Ball,
    BallId,
    Vec2,
    TableDimensions,
    DEFAULT_TABLE,
    PHYSICS,
    SpinEffect,
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
    // Clone balls for simulation
    const simBalls = initialBalls.map((b) => ({
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

    // Calculate dynamic maxSteps based on power if not provided
    // Formula: steps until velocity < MIN_VELOCITY (0.05)
    // vel_final = vel_initial * friction^n
    // 0.05 = power * 0.992^n
    // n = log(0.05 / power) / log(0.992)
    const FRICTION = 0.992;
    const MIN_VELOCITY = 0.05;
    const calculatedMaxSteps = maxSteps ?? Math.ceil(Math.log(MIN_VELOCITY / power) / Math.log(FRICTION)) + 50;

    // Initialize paths - only cue ball starts with initial position
    const paths: Record<string, Vec2[]> = {};
    paths[cueBallId] = [{ x: cueBall.pos.x, y: cueBall.pos.y }];
    simBalls.forEach((b) => {
        if (b.id !== cueBallId) {
            paths[b.id] = [];
        }
    });

    const ballCollisions: { ball1: BallId; ball2: BallId; pointIndex: number }[] = [];
    let cushionContacts = 0;

    const CUSHION_RESTITUTION = 0.90;
    const POINT_DISTANCE_THRESHOLD = 3;
    const SUBSTEPS = 8;

    // Simulate step by step with substeps for accurate collision detection
    for (let step = 0; step < calculatedMaxSteps; step++) {
        // Substep loop for better collision detection
        for (let sub = 0; sub < SUBSTEPS; sub++) {
            // Update each ball position
            simBalls.forEach((ball) => {
                if (Math.abs(ball.vel.x) < MIN_VELOCITY && Math.abs(ball.vel.y) < MIN_VELOCITY) {
                    ball.vel.x = 0;
                    ball.vel.y = 0;
                    return;
                }

                // Update position (divided by substeps)
                ball.pos.x += ball.vel.x / SUBSTEPS;
                ball.pos.y += ball.vel.y / SUBSTEPS;

                // Cushion collisions
                const minX = ball.radius;
                const maxX = table.width - ball.radius;
                const minY = ball.radius;
                const maxY = table.height - ball.radius;

                if (ball.pos.x < minX) {
                    ball.pos.x = minX;
                    ball.vel.x = -ball.vel.x * CUSHION_RESTITUTION;
                    if (ball.id === cueBallId) {
                        cushionContacts++;
                        applySpinEffect(ball, spin, 'left');
                    }
                }
                if (ball.pos.x > maxX) {
                    ball.pos.x = maxX;
                    ball.vel.x = -ball.vel.x * CUSHION_RESTITUTION;
                    if (ball.id === cueBallId) {
                        cushionContacts++;
                        applySpinEffect(ball, spin, 'right');
                    }
                }
                if (ball.pos.y < minY) {
                    ball.pos.y = minY;
                    ball.vel.y = -ball.vel.y * CUSHION_RESTITUTION;
                    if (ball.id === cueBallId) {
                        cushionContacts++;
                        applySpinEffect(ball, spin, 'top');
                    }
                }
                if (ball.pos.y > maxY) {
                    ball.pos.y = maxY;
                    ball.vel.y = -ball.vel.y * CUSHION_RESTITUTION;
                    if (ball.id === cueBallId) {
                        cushionContacts++;
                        applySpinEffect(ball, spin, 'bottom');
                    }
                }
            });

            // Ball-to-ball collisions (check in each substep)
            for (let i = 0; i < simBalls.length; i++) {
                for (let j = i + 1; j < simBalls.length; j++) {
                    const b1 = simBalls[i];
                    const b2 = simBalls[j];
                    const dx = b2.pos.x - b1.pos.x;
                    const dy = b2.pos.y - b1.pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = b1.radius + b2.radius;

                    if (dist < minDist && dist > 0) {
                        // Resolve overlap
                        const overlap = minDist - dist;
                        const nx = dx / dist;
                        const ny = dy / dist;

                        b1.pos.x -= nx * overlap * 0.5;
                        b1.pos.y -= ny * overlap * 0.5;
                        b2.pos.x += nx * overlap * 0.5;
                        b2.pos.y += ny * overlap * 0.5;

                        // Elastic collision - momentum transfer
                        const kx = b1.vel.x - b2.vel.x;
                        const ky = b1.vel.y - b2.vel.y;
                        const p = nx * kx + ny * ky;

                        if (p > 0) {
                            b1.vel.x -= nx * p;
                            b1.vel.y -= ny * p;
                            b2.vel.x += nx * p;
                            b2.vel.y += ny * p;

                            // Record collision (only once per ball pair per step)
                            const collisionKey = `${b1.id}-${b2.id}-${step}`;
                            if (!ballCollisions.some(c => c.ball1 === b1.id && c.ball2 === b2.id && Math.floor(c.pointIndex / 10) === step)) {
                                ballCollisions.push({
                                    ball1: b1.id,
                                    ball2: b2.id,
                                    pointIndex: paths[b1.id].length,
                                });

                                // Initialize path for target ball if it's the first collision
                                if (paths[b2.id].length === 0) {
                                    paths[b2.id].push({ x: b2.pos.x, y: b2.pos.y });
                                }
                                if (paths[b1.id].length === 0) {
                                    paths[b1.id].push({ x: b1.pos.x, y: b1.pos.y });
                                }
                            }
                        }
                    }
                }
            }
        }

        // Apply friction once per step
        simBalls.forEach((ball) => {
            ball.vel.x *= FRICTION;
            ball.vel.y *= FRICTION;
        });

        // Record trajectory points (only if moved enough)
        simBalls.forEach((ball) => {
            const path = paths[ball.id];
            if (!path) return;

            const lastPoint = path[path.length - 1];
            if (!lastPoint) {
                // First point for this ball
                path.push({ x: ball.pos.x, y: ball.pos.y });
                return;
            }

            const dist = Math.sqrt(
                Math.pow(ball.pos.x - lastPoint.x, 2) +
                Math.pow(ball.pos.y - lastPoint.y, 2)
            );

            if (dist > POINT_DISTANCE_THRESHOLD) {
                path.push({ x: ball.pos.x, y: ball.pos.y });
            }
        });

        // Check if all balls have stopped
        const anyMoving = simBalls.some(
            (b) => Math.abs(b.vel.x) >= MIN_VELOCITY || Math.abs(b.vel.y) >= MIN_VELOCITY
        );
        if (!anyMoving) break;
    }

    // Convert paths to TrajectoryPath format
    const trajectoryPaths: TrajectoryPath[] = [];
    Object.entries(paths).forEach(([ballId, points]) => {
        if (points.length > 1) {
            trajectoryPaths.push({
                ballId: ballId as BallId,
                points: points.map((p) => ({
                    pos: p,
                    type: 'normal' as const,
                    timestamp: 0,
                })),
            });
        }
    });

    const isValid = validateThreeCushionRule(ballCollisions, cushionContacts);

    return {
        paths: trajectoryPaths,
        cushionContacts,
        ballCollisions,
        isValid,
    };
}

function applySpinEffect(ball: any, spin: SpinEffect, cushion: 'left' | 'right' | 'top' | 'bottom'): void {
    if (spin.magnitude === 0) return;

    const spinForce = spin.x * 1.8 * spin.magnitude;
    
    if (cushion === 'top' || cushion === 'bottom') {
        ball.vel.x += spinForce;
    } else {
        ball.vel.y -= spinForce;
    }
}

function validateThreeCushionRule(
    ballCollisions: { ball1: BallId; ball2: BallId; pointIndex: number }[],
    cushionContacts: number
): boolean {
    if (ballCollisions.length < 2) {
        return cushionContacts >= 3;
    }

    if (cushionContacts >= 3 && ballCollisions.length === 2) {
        return true;
    }

    if (ballCollisions.length === 2) {
        const cushionsBeforeSecondCollision = cushionContacts;
        return cushionsBeforeSecondCollision >= 3;
    }

    return false;
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
