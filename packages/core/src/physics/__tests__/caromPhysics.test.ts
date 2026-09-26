import { describe, expect, it } from 'vitest';
import {
    createBall,
    resolveCushionCollision,
    resolveBallCollision,
    simulateShot,
    vec2,
    vec2Normalize,
} from '../physics';
import { DEFAULT_TABLE, calculateShotVelocity } from '../types';

describe('Carom Physics', () => {
    describe('Cushion English Spin Interaction', () => {
        it('running English (efecto a favor) widens reflection angle along cushion', () => {
            // Ball heading northeast towards top cushion with right spin (horario)
            // Incoming velocity: vx = 2, vy = -3 (hitting top cushion, normal = (0, 1))
            const ballCenter = createBall('white', 100, 5);
            ballCenter.vel = vec2(2, -3);
            ballCenter.spin = vec2(0, 0); // Center / no spin

            const bouncedNoSpin = resolveCushionCollision(ballCenter, vec2(0, 1));

            const ballRightSpin = createBall('white', 100, 5);
            ballRightSpin.vel = vec2(2, -3);
            ballRightSpin.spin = vec2(0.8, 0); // Right spin (running English on top rail)

            const bouncedWithSpin = resolveCushionCollision(ballRightSpin, vec2(0, 1));

            // With right spin hitting top cushion, vx should be greater than with no spin (opens up angle)
            expect(bouncedWithSpin.vel.x).toBeGreaterThan(bouncedNoSpin.vel.x);
        });

        it('reverse English (efecto en contra) narrows reflection angle', () => {
            const ballCenter = createBall('white', 100, 5);
            ballCenter.vel = vec2(2, -3);
            ballCenter.spin = vec2(0, 0);

            const bouncedNoSpin = resolveCushionCollision(ballCenter, vec2(0, 1));

            const ballLeftSpin = createBall('white', 100, 5);
            ballLeftSpin.vel = vec2(2, -3);
            ballLeftSpin.spin = vec2(-0.8, 0); // Left spin (reverse English)

            const bouncedReverse = resolveCushionCollision(ballLeftSpin, vec2(0, 1));

            // Reverse English checks the velocity along the rail
            expect(bouncedReverse.vel.x).toBeLessThan(bouncedNoSpin.vel.x);
        });
    });

    describe('Ball-to-Ball Longitudinal Spin (Draw / Follow)', () => {
        it('retroceso (draw / backspin) pulls cue ball backwards after collision', () => {
            const cueStun = createBall('white', 50, 71);
            cueStun.vel = vec2(4, 0);
            cueStun.spin = vec2(0, 0); // Stun

            const target = createBall('yellow', 56.2, 71); // Direct head-on collision

            const [stunAfter] = resolveBallCollision(cueStun, target);

            const cueDraw = createBall('white', 50, 71);
            cueDraw.vel = vec2(4, 0);
            cueDraw.spin = vec2(0, -0.9); // Deep Draw (retroceso)

            const target2 = createBall('yellow', 56.2, 71);
            const [drawAfter] = resolveBallCollision(cueDraw, target2);

            // With deep draw, vel.x should be pulled backwards (negative)
            expect(drawAfter.vel.x).toBeLessThan(stunAfter.vel.x);
            expect(drawAfter.vel.x).toBeLessThan(0);
        });

        it('corrido (follow / topspin) pushes cue ball forward through collision', () => {
            const cueStun = createBall('white', 50, 71);
            cueStun.vel = vec2(4, 0);
            cueStun.spin = vec2(0, 0);

            const target = createBall('yellow', 56.2, 71);
            const [stunAfter] = resolveBallCollision(cueStun, target);

            const cueFollow = createBall('white', 50, 71);
            cueFollow.vel = vec2(4, 0);
            cueFollow.spin = vec2(0, 0.9); // Deep Follow (corrido)

            const target2 = createBall('yellow', 56.2, 71);
            const [followAfter] = resolveBallCollision(cueFollow, target2);

            // Follow continues moving forward (positive vx)
            expect(followAfter.vel.x).toBeGreaterThan(stunAfter.vel.x);
            expect(followAfter.vel.x).toBeGreaterThan(0);
        });
    });

    describe('Continuous Trajectory Trails Recording', () => {
        it('simulateShot generates continuous path trails for all 3 balls', () => {
            const cue = createBall('white', 50, 71);
            cue.vel = vec2(4, 2);
            const yellow = createBall('yellow', 150, 71);
            const red = createBall('red', 200, 100);

            const result = simulateShot([cue, yellow, red], 200, DEFAULT_TABLE);

            expect(result.trails).toBeDefined();
            expect(result.trails.white.length).toBeGreaterThan(5);
            expect(result.trails.yellow).toBeDefined();
            expect(result.trails.red).toBeDefined();
        });
    });

    describe('Power Proportionality and Realistic Cushion Decay', () => {
        it('calculateShotVelocity scales smoothly from low to max power', () => {
            expect(calculateShotVelocity(0)).toBe(0);
            expect(calculateShotVelocity(20)).toBeGreaterThan(2.0);
            expect(calculateShotVelocity(50)).toBeGreaterThan(calculateShotVelocity(20));
            expect(calculateShotVelocity(100)).toBeGreaterThan(calculateShotVelocity(50));
            expect(calculateShotVelocity(100)).toBeCloseTo(27.84, 1);
        });

        it('low power shot (20%) produces gentle travel with 1-2 cushion rebounds', () => {
            const vLow = calculateShotVelocity(20);
            const cue = createBall('white', 100, 71);
            cue.vel = vec2(vLow, 0);

            const result = simulateShot([cue], 1000, DEFAULT_TABLE);
            const cushionHits = result.events.filter((e) => e.type === 'cushion').length;
            expect(cushionHits).toBeLessThanOrEqual(2);
        });

        it('high power shot (80%) decays realistically without 15+ accordion bounces', () => {
            const vHigh = calculateShotVelocity(80);
            const dir = vec2Normalize(vec2(2, 1.2));
            const cue = createBall('white', 40, 40);
            cue.vel = vec2(dir.x * vHigh, dir.y * vHigh);

            const result = simulateShot([cue], 2000, DEFAULT_TABLE);
            const cushionHits = result.events.filter((e) => e.type === 'cushion').length;
            expect(cushionHits).toBeGreaterThanOrEqual(3);
            expect(cushionHits).toBeLessThanOrEqual(8);
        });
    });

    describe('Canonical Speed Calibration (Quetglas / UMB Standard Lengths)', () => {
        // Test ball at right cushion (x = 280.9, y = 106) shooting straight left (-1, 0)
        const startX = 280.925;
        const startY = 106;

        it('Velocidad 1 (20%): travels ~1 table length (dies at or gently kisses opposite short cushion)', () => {
            const v1 = calculateShotVelocity(20);
            const cue = createBall('white', startX, startY);
            cue.vel = vec2(-v1, 0);

            const result = simulateShot([cue], 1000, DEFAULT_TABLE);
            const finalWhite = result.finalBalls.find((b) => b.id === 'white')!;

            // Reaches near opposite cushion (x <= 15) and has at most 1 cushion contact
            expect(finalWhite.pos.x).toBeLessThan(15);
            expect(finalWhite.pos.x).toBeGreaterThanOrEqual(3.075);
        });

        it('Velocidad 2 (40%): travels ~2 table lengths (returns all the way to starting position)', () => {
            const v2 = calculateShotVelocity(40);
            const cue = createBall('white', startX, startY);
            cue.vel = vec2(-v2, 0);

            const result = simulateShot([cue], 1500, DEFAULT_TABLE);
            const finalWhite = result.finalBalls.find((b) => b.id === 'white')!;

            // Rebounds on left cushion and returns to starting area (x >= 260)
            expect(finalWhite.pos.x).toBeGreaterThan(260);
        });

        it('Velocidad 3 (60%): travels ~3 table lengths (rebounds 2 cushions and returns to opposite cushion)', () => {
            const v3 = calculateShotVelocity(60);
            const cue = createBall('white', startX, startY);
            cue.vel = vec2(-v3, 0);

            const result = simulateShot([cue], 2000, DEFAULT_TABLE);
            const finalWhite = result.finalBalls.find((b) => b.id === 'white')!;

            // Hits left, hits right, returns to opposite cushion area (x <= 25)
            expect(finalWhite.pos.x).toBeLessThan(25);
        });

        it('Velocidad 4 (80%): travels ~4 table lengths (rebounds 3 cushions and returns to starting cushion)', () => {
            const v4 = calculateShotVelocity(80);
            const cue = createBall('white', startX, startY);
            cue.vel = vec2(-v4, 0);

            const result = simulateShot([cue], 2500, DEFAULT_TABLE);
            const finalWhite = result.finalBalls.find((b) => b.id === 'white')!;

            // Returns to right side of the table near start cushion (x >= 260)
            expect(finalWhite.pos.x).toBeGreaterThan(260);
        });

        it('Velocidad 5 (100%): travels ~5 table lengths (rebounds 4 cushions and finishes across table)', () => {
            const v5 = calculateShotVelocity(100);
            const cue = createBall('white', startX, startY);
            cue.vel = vec2(-v5, 0);

            const result = simulateShot([cue], 3000, DEFAULT_TABLE);
            const finalWhite = result.finalBalls.find((b) => b.id === 'white')!;

            // Finishes near opposite cushion (x <= 30)
            expect(finalWhite.pos.x).toBeLessThan(30);
        });
    });
});
