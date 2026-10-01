import { describe, it, expect } from 'vitest';
import {
    clockToSpin,
    spinToClock,
    translateSourceSpin,
    PLAY_SPIN_OVERRIDES,
} from '../spinMapping';
import {
    calibrateSourceSpeed,
    powerToVelocity,
    percentageToSpeed,
} from '../powerCalibration';
import {
    validateTrajectoryPlay,
    validateCatalogPlays,
    CatalogPlayData,
} from '../trajectoryValidation';
import { vec2 } from '../physics';

describe('Spin/English Mapping Layer & Calibration', () => {
    describe('Clock Face to Cartesian Conversion', () => {
        it('maps 12 o\'clock to straight top / follow (+Y)', () => {
            const spin = clockToSpin(12, 3.0);
            expect(spin.x).toBeCloseTo(0, 2);
            expect(spin.y).toBeCloseTo(1, 2);
            expect(spin.magnitude).toBeCloseTo(1, 2);
        });

        it('maps 6 o\'clock to straight bottom / draw (-Y)', () => {
            const spin = clockToSpin(6, 3.0);
            expect(spin.x).toBeCloseTo(0, 2);
            expect(spin.y).toBeCloseTo(-1, 2);
            expect(spin.magnitude).toBeCloseTo(1, 2);
        });

        it('maps 3 o\'clock to full right spin (+X)', () => {
            const spin = clockToSpin(3, 3.0);
            expect(spin.x).toBeCloseTo(1, 2);
            expect(spin.y).toBeCloseTo(0, 2);
            expect(spin.magnitude).toBeCloseTo(1, 2);
        });

        it('maps 9 o\'clock to full left spin (-X)', () => {
            const spin = clockToSpin(9, 3.0);
            expect(spin.x).toBeCloseTo(-1, 2);
            expect(spin.y).toBeCloseTo(0, 2);
            expect(spin.magnitude).toBeCloseTo(1, 2);
        });

        it('maps 7 o\'clock to bottom-left (negative X, negative Y)', () => {
            const spin = clockToSpin(7, 3.0);
            // 7 o'clock = 210 degrees: sin(210) = -0.5, cos(210) = -0.866
            expect(spin.x).toBeCloseTo(-0.5, 2);
            expect(spin.y).toBeCloseTo(-0.866, 2);
            expect(spin.x).toBeLessThan(0);
            expect(spin.y).toBeLessThan(0);
        });

        it('supports bidirectional conversion with spinToClock', () => {
            const original = clockToSpin(7, 2.5);
            const clock = spinToClock(original);
            expect(clock.hour).toBeCloseTo(7.0, 1);
            expect(clock.tips).toBeCloseTo(2.5, 1);
        });
    });

    describe('Requirement 1: Play #27 Mapping & Override', () => {
        it('strictly maps Play #27 to bottom-left (7 o\'clock)', () => {
            // Even if the source raw data says "top spin"
            const spin = translateSourceSpin('top spin', 27);
            const clock = spinToClock(spin);
            expect(clock.hour).toBeCloseTo(7.0, 1);
            expect(spin.x).toBeLessThan(0);
            expect(spin.y).toBeLessThan(0);
            expect(PLAY_SPIN_OVERRIDES[27].hour).toBe(7.0);
        });

        it('translates text labels from the dictionary correctly', () => {
            const top = translateSourceSpin('top spin');
            expect(top.y).toBeGreaterThan(0.7);

            const draw = translateSourceSpin('bottom');
            expect(draw.y).toBeLessThan(-0.7);

            const botLeft = translateSourceSpin('bottom-left');
            expect(botLeft.x).toBeLessThan(0);
            expect(botLeft.y).toBeLessThan(0);

            const center = translateSourceSpin('dead ball');
            expect(center.magnitude).toBe(0);
        });
    });

    describe('Requirement 2: Power & Speed Calibration (1:1 Mapping)', () => {
        it('maps source speed metric 1:1 to simulator power', () => {
            const res35 = calibrateSourceSpeed(3.5);
            expect(res35.speed).toBe(3.5);
            expect(res35.power).toBe(3.5);
            expect(res35.powerPercentage).toBe(70); // 3.5 / 5.0 * 100 = 70%
            expect(res35.velocity).toBeGreaterThan(12);

            const res20 = calibrateSourceSpeed(2.0);
            expect(res20.speed).toBe(2.0);
            expect(res20.power).toBe(2.0);
            expect(res20.powerPercentage).toBe(40);
        });

        it('converts power to velocity and back seamlessly', () => {
            const vSpeed = powerToVelocity(3.5);
            const vPct = powerToVelocity(70);
            expect(vSpeed).toBeCloseTo(vPct, 2);

            const speed = percentageToSpeed(70);
            expect(speed).toBe(3.5);
        });
    });

    describe('Requirement 3: Trajectory Validation Routine', () => {
        it('mathematically validates simulated displacement against reference trajectory', () => {
            const samplePlay: CatalogPlayData = {
                id: 101,
                white: vec2(71, 106.5),
                yellow: vec2(71, 35.5),
                red: vec2(213, 71),
                aimDirection: vec2(0, -1),
                speed: 3.5,
                spin: 'top spin',
                expectedCushions: 3,
                referenceTrajectory: [
                    vec2(71, 106.5),
                    vec2(71, 40.0),
                    vec2(90, 10.0),
                    vec2(160, 135.0),
                    vec2(213, 71),
                ],
            };

            const result = validateTrajectoryPlay(samplePlay, 25.0);
            expect(result.playId).toBe(101);
            expect(result.averageErrorCm).toBeGreaterThan(0);
            expect(result.fitScore).toBeGreaterThan(0);
            expect(result.simulatedPointsCount).toBeGreaterThan(5);
        });

        it('summarizes batch catalog validation accurately', () => {
            const plays: CatalogPlayData[] = [
                {
                    id: 1,
                    white: vec2(71, 106.5),
                    yellow: vec2(71, 35.5),
                    red: vec2(213, 71),
                    speed: 3.5,
                    spin: '12 o\'clock',
                    referenceTrajectory: [vec2(71, 106.5), vec2(71, 35.5)],
                },
                {
                    id: 27, // Play #27 with override
                    white: vec2(50, 50),
                    yellow: vec2(100, 50),
                    red: vec2(200, 100),
                    speed: 3.5,
                    spin: 'top spin', // Overridden to bottom-left 7 o'clock
                    referenceTrajectory: [vec2(50, 50), vec2(100, 50)],
                },
            ];

            const batch = validateCatalogPlays(plays);
            expect(batch.totalPlays).toBe(2);
            expect(batch.results.length).toBe(2);
            expect(batch.averageFitScore).toBeGreaterThan(0);
        });
    });
});
