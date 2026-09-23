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

export function computeCushionSpinImpulse(
    spin: Vec2,
    normal: Vec2,
    normalSpeed: number
): Vec2 {
    const factor = PHYSICS.englishBounceFactor;
    const sideSpin = spin.x; // +1 right/horario, -1 left/antihorario
    const magnitude = Math.abs(normalSpeed) * factor * sideSpin;

    if (normal.x > 0.5) {
        // Left cushion (normal points right: +x)
        return vec2(0, -magnitude);
    } else if (normal.x < -0.5) {
        // Right cushion (normal points left: -x)
        return vec2(0, magnitude);
    } else if (normal.y > 0.5) {
        // Top cushion (normal points down: +y)
        return vec2(magnitude, 0);
    } else if (normal.y < -0.5) {
        // Bottom cushion (normal points up: -y)
        return vec2(-magnitude, 0);
    }
    return vec2(0, 0);
}

export function resolveCushionCollision(ball: Ball, normal: Vec2): Ball {
    const dot = vec2Dot(ball.vel, normal);
    const reflected = vec2Sub(ball.vel, vec2Scale(normal, 2 * dot));
    const newVel = vec2Scale(reflected, PHYSICS.cushionRestitution);

    // Apply spin English impulse along the cushion rail
    const spinImpulse = computeCushionSpinImpulse(ball.spin, normal, dot);
    const finalVel = vec2Add(newVel, spinImpulse);

    // Cushion consumes part of the side spin
    const remainingSpin = vec2(ball.spin.x * 0.70, ball.spin.y * 0.85);

    return {
        ...ball,
        vel: finalVel,
        spin: remainingSpin,
    };
}

export function checkBallCollision(b1: Ball, b2: Ball): boolean {
    const distance = vec2Distance(b1.pos, b2.pos);
    return distance < b1.radius + b2.radius;
}

export function applyLongitudinalSpinAfterCollision(
    cueBall: Ball,
    targetBall: Ball,
    normal: Vec2,
    impulseMagnitude: number
): Ball {
    const longitudinalSpin = cueBall.spin.y; // +1 = corrido (follow), -1 = retroceso (draw)
    if (Math.abs(longitudinalSpin) < 0.05) return cueBall;

    if (longitudinalSpin > 0) {
        // Corrido (Follow / Topspin): empuja hacia adelante a lo largo del vector de impacto
        const followBoost = vec2Scale(normal, longitudinalSpin * impulseMagnitude * 0.38);
        return {
            ...cueBall,
            vel: vec2Add(cueBall.vel, followBoost),
            spin: vec2(cueBall.spin.x * 0.75, cueBall.spin.y * 0.40),
        };
    } else {
        // Retroceso (Draw / Backspin): frena y muerde el paño hacia atrás (-normal)
        const drawPull = vec2Scale(normal, longitudinalSpin * impulseMagnitude * 0.55); // longitudinalSpin es negativo
        return {
            ...cueBall,
            vel: vec2Add(cueBall.vel, drawPull),
            spin: vec2(cueBall.spin.x * 0.75, cueBall.spin.y * 0.30),
        };
    }
}

export function resolveBallCollision(b1: Ball, b2: Ball): [Ball, Ball] {
    const normal = vec2Normalize(vec2Sub(b2.pos, b1.pos));
    const relVel = vec2Sub(b1.vel, b2.vel);
    const velAlongNormal = vec2Dot(relVel, normal);

    // Si velAlongNormal <= 0, las bolas ya se están alejando entre sí
    if (velAlongNormal <= 0) return [b1, b2];

    const impulse = vec2Scale(normal, velAlongNormal * PHYSICS.ballRestitution);

    let newB1Vel = vec2Sub(b1.vel, impulse);
    const newB2Vel = vec2Add(b2.vel, impulse);

    // Apply spin reactions for draw / follow if either ball has longitudinal spin
    let b1Result: Ball = {
        ...b1,
        vel: newB1Vel,
    };
    if (Math.abs(b1.spin.y) > 0.05) {
        b1Result = applyLongitudinalSpinAfterCollision(b1Result, b2, normal, Math.abs(velAlongNormal));
    }

    const overlap = b1.radius + b2.radius - vec2Distance(b1.pos, b2.pos);
    const separation = vec2Scale(normal, overlap / 2);

    return [
        {
            ...b1Result,
            pos: vec2Sub(b1.pos, separation),
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
    const spinVec = vec2(spin.x * spin.magnitude, spin.y * spin.magnitude);

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
    const FRICTION = PHYSICS.friction;

    // Simulate with substeps for consistency and tunneling prevention
    for (let sub = 0; sub < SUBSTEPS; sub++) {
        // 1. Update ball positions and check cushion bounds
        for (let i = 0; i < updatedBalls.length; i++) {
            const ball = updatedBalls[i];
            if (!isBallMoving(ball)) continue;

            const nextPos = {
                x: ball.pos.x + ball.vel.x / SUBSTEPS,
                y: ball.pos.y + ball.vel.y / SUBSTEPS,
            };

            const minX = ball.radius;
            const maxX = table.width - ball.radius;
            const minY = ball.radius;
            const maxY = table.height - ball.radius;

            let normal: Vec2 | null = null;
            let side: 'left' | 'right' | 'top' | 'bottom' | null = null;
            const clampedPos = { ...nextPos };

            if (nextPos.x <= minX) {
                clampedPos.x = minX;
                normal = vec2(1, 0);
                side = 'left';
            } else if (nextPos.x >= maxX) {
                clampedPos.x = maxX;
                normal = vec2(-1, 0);
                side = 'right';
            } else if (nextPos.y <= minY) {
                clampedPos.y = minY;
                normal = vec2(0, 1);
                side = 'top';
            } else if (nextPos.y >= maxY) {
                clampedPos.y = maxY;
                normal = vec2(0, -1);
                side = 'bottom';
            }

            if (normal && side) {
                const resolved = resolveCushionCollision({ ...ball, pos: clampedPos }, normal);
                updatedBalls[i] = resolved;

                events.push({
                    type: 'cushion',
                    timestamp: 0,
                    data: {
                        ballId: ball.id,
                        side,
                        position: { x: clampedPos.x, y: clampedPos.y },
                        normal,
                        timestamp: 0,
                    },
                });
            } else {
                updatedBalls[i] = {
                    ...ball,
                    pos: clampedPos,
                };
            }
        }

        // 2. Ball-to-ball collisions
        for (let i = 0; i < updatedBalls.length; i++) {
            for (let j = i + 1; j < updatedBalls.length; j++) {
                const b1 = updatedBalls[i];
                const b2 = updatedBalls[j];
                const dx = b2.pos.x - b1.pos.x;
                const dy = b2.pos.y - b1.pos.y;
                const dist = Math.hypot(dx, dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist && dist > 0.001) {
                    const [res1, res2] = resolveBallCollision(b1, b2);
                    updatedBalls[i] = res1;
                    updatedBalls[j] = res2;

                    events.push({
                        type: 'ball_collision',
                        timestamp: 0,
                        data: {
                            ball1: b1.id,
                            ball2: b2.id,
                            position: { x: (b1.pos.x + b2.pos.x) / 2, y: (b1.pos.y + b2.pos.y) / 2 },
                            timestamp: 0,
                        },
                    });
                }
            }
        }
    }

    // 3. Apply cloth friction and spin decay once per full step
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
): {
    finalBalls: Ball[];
    events: ShotEvent[];
    trails: Record<BallId, { pos: Vec2; timestamp: number }[]>;
} {
    let balls = initialBalls.map((b) => ({ ...b }));
    const allEvents: ShotEvent[] = [];
    let iterations = 0;

    const trails: Record<BallId, { pos: Vec2; timestamp: number }[]> = {
        white: [{ pos: { ...balls.find((b) => b.id === 'white')?.pos ?? vec2(0, 0) }, timestamp: 0 }],
        yellow: [{ pos: { ...balls.find((b) => b.id === 'yellow')?.pos ?? vec2(0, 0) }, timestamp: 0 }],
        red: [{ pos: { ...balls.find((b) => b.id === 'red')?.pos ?? vec2(0, 0) }, timestamp: 0 }],
    };

    while (iterations < maxIterations) {
        const anyMoving = balls.some((b) => isBallMoving(b));
        if (!anyMoving) break;

        const { balls: newBalls, events } = simulateStep(balls, table);
        balls = newBalls;
        allEvents.push(...events);

        for (const b of balls) {
            trails[b.id].push({ pos: { ...b.pos }, timestamp: iterations });
        }

        iterations++;
    }

    return { finalBalls: balls, events: allEvents, trails };
}

