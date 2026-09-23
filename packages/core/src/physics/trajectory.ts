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
    let cushionsBeforeSecondCollision = 0;
    let secondCollisionRegistered = false;

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
                    const distance = vec2Distance(b1.pos, b2.pos);

                    if (distance < b1.radius + b2.radius && distance > 0) {
                        const isCueBallCollision = b1.id === cueBallId || b2.id === cueBallId;
                        const alreadyCollided = ballCollisions.some(
                            (c) => (c.ball1 === b1.id && c.ball2 === b2.id) || (c.ball1 === b2.id && c.ball2 === b1.id)
                        );

                        if (isCueBallCollision && !alreadyCollided) {
                            const pointIndex = Math.max(0, paths[cueBallId].length - 1);
                            ballCollisions.push({
                                ball1: b1.id,
                                ball2: b2.id,
                                pointIndex,
                            });

                            if (ballCollisions.length === 2 && !secondCollisionRegistered) {
                                cushionsBeforeSecondCollision = cushionContacts;
                                secondCollisionRegistered = true;
                            }
                        }

                        // Resolve elastic collision
                        const normal = vec2Normalize(vec2Sub(b2.pos, b1.pos));
                        const relVel = vec2Sub(b1.vel, b2.vel);
                        const velAlongNormal = vec2Dot(relVel, normal);

                        if (velAlongNormal > 0) {
                            const impulse = velAlongNormal * PHYSICS.ballRestitution;
                            b1.vel = vec2Sub(b1.vel, vec2Scale(normal, impulse));
                            b2.vel = vec2Add(b2.vel, vec2Scale(normal, impulse));
                        }

                        // Separate overlapping balls
                        const overlap = b1.radius + b2.radius - distance;
                        const separation = vec2Scale(normal, overlap / 2);
                        b1.pos = vec2Sub(b1.pos, separation);
                        b2.pos = vec2Add(b2.pos, separation);
                    }
                }
            }
        }


        // Apply friction once per full step
        simBalls.forEach((ball) => {
            ball.vel = vec2Scale(ball.vel, FRICTION);
        });

        // Record positions every step if ball moved significantly
        simBalls.forEach((ball) => {
            const ballPath = paths[ball.id];
            if (ballPath.length === 0) {
                if (ball.vel.x !== 0 || ball.vel.y !== 0) {
                    ballPath.push({ x: ball.pos.x, y: ball.pos.y });
                }
            } else {
                const lastPos = ballPath[ballPath.length - 1];
                const distFromLast = Math.hypot(ball.pos.x - lastPos.x, ball.pos.y - lastPos.y);
                if (distFromLast >= POINT_DISTANCE_THRESHOLD) {
                    ballPath.push({ x: ball.pos.x, y: ball.pos.y });
                }
            }
        });

        // Break early if all balls stopped
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

    const isValid = ballCollisions.length >= 2 && cushionsBeforeSecondCollision >= 3;

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
