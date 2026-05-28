import {
    Ball,
    BallId,
    Vec2,
    ShotEvent,
    TableDimensions,
    DEFAULT_TABLE,
    BALL_RADIUS,
    PHYSICS,
    SpinEffect,
} from './types';

export function vec2(x: number, y: number): Vec2 {
    return { x, y };
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v: Vec2, s: number): Vec2 {
    return { x: v.x * s, y: v.y * s };
}

export function vec2Length(v: Vec2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2Normalize(v: Vec2): Vec2 {
    const len = vec2Length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

export function vec2Dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
}

export function vec2Distance(a: Vec2, b: Vec2): number {
    return vec2Length(vec2Sub(a, b));
}

export function createBall(id: BallId, x: number, y: number): Ball {
    return {
        id,
        pos: vec2(x, y),
        vel: vec2(0, 0),
        spin: vec2(0, 0),
        radius: BALL_RADIUS,
    };
}

export function isBallMoving(ball: Ball): boolean {
    return vec2Length(ball.vel) > PHYSICS.minVelocity;
}

export function applyFriction(ball: Ball): Ball {
    return {
        ...ball,
        vel: vec2Scale(ball.vel, PHYSICS.friction),
        spin: vec2Scale(ball.spin, PHYSICS.spinDecay),
    };
}

export function updateBallPosition(ball: Ball, dt: number): Ball {
    const spinInfluence = vec2Scale(ball.spin, PHYSICS.spinInfluence * dt);
    const newVel = vec2Add(ball.vel, spinInfluence);
    const newPos = vec2Add(ball.pos, vec2Scale(newVel, dt));
    return {
        ...ball,
        pos: newPos,
        vel: newVel,
    };
}

export function checkCushionCollision(
    ball: Ball,
    table: TableDimensions = DEFAULT_TABLE
): { collided: boolean; normal: Vec2; position: Vec2 } | null {
    const playAreaMinX = 0;
    const playAreaMaxX = table.width;
    const playAreaMinY = 0;
    const playAreaMaxY = table.height;

    if (ball.pos.x - ball.radius < playAreaMinX) {
        return {
            collided: true,
            normal: vec2(1, 0),
            position: vec2(playAreaMinX, ball.pos.y),
        };
    }

    if (ball.pos.x + ball.radius > playAreaMaxX) {
        return {
            collided: true,
            normal: vec2(-1, 0),
            position: vec2(playAreaMaxX, ball.pos.y),
        };
    }

    if (ball.pos.y - ball.radius < playAreaMinY) {
        return {
            collided: true,
            normal: vec2(0, 1),
            position: vec2(ball.pos.x, playAreaMinY),
        };
    }

    if (ball.pos.y + ball.radius > playAreaMaxY) {
        return {
            collided: true,
            normal: vec2(0, -1),
            position: vec2(ball.pos.x, playAreaMaxY),
        };
    }

    return null;
}

export function resolveCushionCollision(ball: Ball, normal: Vec2): Ball {
    const dot = vec2Dot(ball.vel, normal);
    const reflected = vec2Sub(ball.vel, vec2Scale(normal, 2 * dot));
    const newVel = vec2Scale(reflected, PHYSICS.cushionRestitution);

    const tangent = vec2(-normal.y, normal.x);
    const spinForce = vec2Length(ball.spin) * 1.8;
    const spinDirection = vec2Normalize(ball.spin);
    const spinInfluence = vec2Scale(tangent, vec2Dot(spinDirection, tangent) * spinForce);

    const finalVel = vec2Add(newVel, spinInfluence);

    return {
        ...ball,
        vel: finalVel,
        spin: vec2Scale(ball.spin, 0.6),
    };
}

export function checkBallCollision(b1: Ball, b2: Ball): boolean {
    const distance = vec2Distance(b1.pos, b2.pos);
    return distance < b1.radius + b2.radius;
}

export function resolveBallCollision(b1: Ball, b2: Ball): [Ball, Ball] {
    const normal = vec2Normalize(vec2Sub(b2.pos, b1.pos));
    const relVel = vec2Sub(b1.vel, b2.vel);
    const velAlongNormal = vec2Dot(relVel, normal);

    if (velAlongNormal > 0) return [b1, b2];

    const impulse = vec2Scale(normal, velAlongNormal * PHYSICS.ballRestitution);

    const newB1Vel = vec2Sub(b1.vel, impulse);
    const newB2Vel = vec2Add(b2.vel, impulse);

    const overlap = b1.radius + b2.radius - vec2Distance(b1.pos, b2.pos);
    const separation = vec2Scale(normal, overlap / 2);

    return [
        {
            ...b1,
            pos: vec2Sub(b1.pos, separation),
            vel: newB1Vel,
        },
        {
            ...b2,
            pos: vec2Add(b2.pos, separation),
            vel: newB2Vel,
        },
    ];
}

export function applyShot(
    ball: Ball,
    direction: Vec2,
    power: number,
    spin: SpinEffect
): Ball {
    const normalizedDir = vec2Normalize(direction);
    const velocity = vec2Scale(normalizedDir, power);
    const spinVec = vec2Scale(vec2(spin.x, spin.y), spin.magnitude);

    return {
        ...ball,
        vel: velocity,
        spin: spinVec,
    };
}

export function simulateStep(
    balls: Ball[],
    table: TableDimensions = DEFAULT_TABLE
): { balls: Ball[]; events: ShotEvent[] } {
    const events: ShotEvent[] = [];
    let updatedBalls = balls.map((b) => ({ ...b }));
    
    const SUBSTEPS = 8;
    const FRICTION = 0.992;
    const CUSHION_RESTITUTION = 0.90;

    // Simulate with substeps for consistency with predictTrajectory
    for (let sub = 0; sub < SUBSTEPS; sub++) {
        // Update positions
        for (let i = 0; i < updatedBalls.length; i++) {
            const ball = updatedBalls[i];
            if (!isBallMoving(ball)) continue;

            // Move ball (velocity divided by substeps)
            updatedBalls[i] = {
                ...ball,
                pos: {
                    x: ball.pos.x + ball.vel.x / SUBSTEPS,
                    y: ball.pos.y + ball.vel.y / SUBSTEPS,
                },
            };

            // Cushion collisions
            const minX = ball.radius;
            const maxX = table.width - ball.radius;
            const minY = ball.radius;
            const maxY = table.height - ball.radius;

            let newVel = { ...updatedBalls[i].vel };
            let newPos = { ...updatedBalls[i].pos };

            if (newPos.x < minX) {
                newPos.x = minX;
                newVel.x = -newVel.x * CUSHION_RESTITUTION;
                events.push({
                    type: 'cushion',
                    timestamp: 0,
                    data: {
                        position: { x: minX, y: newPos.y },
                        normal: vec2(1, 0),
                        timestamp: 0,
                    },
                });
            }
            if (newPos.x > maxX) {
                newPos.x = maxX;
                newVel.x = -newVel.x * CUSHION_RESTITUTION;
                events.push({
                    type: 'cushion',
                    timestamp: 0,
                    data: {
                        position: { x: maxX, y: newPos.y },
                        normal: vec2(-1, 0),
                        timestamp: 0,
                    },
                });
            }
            if (newPos.y < minY) {
                newPos.y = minY;
                newVel.y = -newVel.y * CUSHION_RESTITUTION;
                events.push({
                    type: 'cushion',
                    timestamp: 0,
                    data: {
                        position: { x: newPos.x, y: minY },
                        normal: vec2(0, 1),
                        timestamp: 0,
                    },
                });
            }
            if (newPos.y > maxY) {
                newPos.y = maxY;
                newVel.y = -newVel.y * CUSHION_RESTITUTION;
                events.push({
                    type: 'cushion',
                    timestamp: 0,
                    data: {
                        position: { x: newPos.x, y: maxY },
                        normal: vec2(0, -1),
                        timestamp: 0,
                    },
                });
            }

            updatedBalls[i] = {
                ...updatedBalls[i],
                pos: newPos,
                vel: newVel,
            };
        }

        // Ball-to-ball collisions
        for (let i = 0; i < updatedBalls.length; i++) {
            for (let j = i + 1; j < updatedBalls.length; j++) {
                const b1 = updatedBalls[i];
                const b2 = updatedBalls[j];
                const dx = b2.pos.x - b1.pos.x;
                const dy = b2.pos.y - b1.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist && dist > 0) {
                    // Resolve overlap
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    const newB1Pos = {
                        x: b1.pos.x - nx * overlap * 0.5,
                        y: b1.pos.y - ny * overlap * 0.5,
                    };
                    const newB2Pos = {
                        x: b2.pos.x + nx * overlap * 0.5,
                        y: b2.pos.y + ny * overlap * 0.5,
                    };

                    // Elastic collision - momentum transfer
                    const kx = b1.vel.x - b2.vel.x;
                    const ky = b1.vel.y - b2.vel.y;
                    const p = nx * kx + ny * ky;

                    if (p > 0) {
                        const newB1Vel = {
                            x: b1.vel.x - nx * p,
                            y: b1.vel.y - ny * p,
                        };
                        const newB2Vel = {
                            x: b2.vel.x + nx * p,
                            y: b2.vel.y + ny * p,
                        };

                        updatedBalls[i] = { ...b1, pos: newB1Pos, vel: newB1Vel };
                        updatedBalls[j] = { ...b2, pos: newB2Pos, vel: newB2Vel };

                        events.push({
                            type: 'ball_collision',
                            timestamp: 0,
                            data: {
                                ball1: b1.id,
                                ball2: b2.id,
                                position: newB1Pos,
                                timestamp: 0,
                            },
                        });
                    }
                }
            }
        }
    }

    // Apply friction once per step
    for (let i = 0; i < updatedBalls.length; i++) {
        updatedBalls[i] = {
            ...updatedBalls[i],
            vel: vec2Scale(updatedBalls[i].vel, FRICTION),
            spin: vec2Scale(updatedBalls[i].spin, PHYSICS.spinDecay),
        };
    }

    return { balls: updatedBalls, events };
}

export function simulateShot(
    initialBalls: Ball[],
    maxIterations: number = PHYSICS.maxIterations,
    table: TableDimensions = DEFAULT_TABLE
): { finalBalls: Ball[]; events: ShotEvent[] } {
    let balls = initialBalls.map((b) => ({ ...b }));
    const allEvents: ShotEvent[] = [];
    let iterations = 0;

    while (iterations < maxIterations) {
        const anyMoving = balls.some((b) => isBallMoving(b));
        if (!anyMoving) break;

        const { balls: newBalls, events } = simulateStep(balls, table);
        balls = newBalls;
        allEvents.push(...events);
        iterations++;
    }

    return { finalBalls: balls, events: allEvents };
}
