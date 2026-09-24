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
            expect(calculateShotVelocity(100)).toBeCloseTo(12.5, 1);
        });

        it('low power shot (20%) produces gentle travel with 1-2 cushion rebounds', () => {
            const vLow = calculateShotVelocity(20);
            const cue = createBall('white', 100, 71);
            cue.vel = vec2(vLow, 0);

            const result = simulateShot([cue], 1000, DEFAULT_TABLE);
            const cushionHits = result.events.filter((e) => e.type === 'cushion').length;
            // A gentle 20% power shot should not bounce more than 2 cushions
            expect(cushionHits).toBeLessThanOrEqual(2);
        });

        it('high power shot (80%) decays realistically without 15+ accordion bounces', () => {
            const vHigh = calculateShotVelocity(80);
            const dir = vec2Normalize(vec2(2, 1.2));
            const cue = createBall('white', 40, 40);
            cue.vel = vec2(dir.x * vHigh, dir.y * vHigh);

            const result = simulateShot([cue], 2000, DEFAULT_TABLE);
            const cushionHits = result.events.filter((e) => e.type === 'cushion').length;
            // Realistic 3-cushion billiards: should achieve 3-5 cushions without 15+ accordion bounces
            expect(cushionHits).toBeGreaterThanOrEqual(3);
            expect(cushionHits).toBeLessThanOrEqual(6);
        });
    });
});
