import { describe, it, expect } from 'vitest';
import {
    STRICT_BALL_GUIDE_COLORS,
    getGuideStrokeDashArray,
    filterAimTrajectory,
    DEFAULT_GUIDE_CONFIG,
    TrajectoryGuideConfig,
} from '../trajectoryGuide';
import { predictTrajectory } from '../trajectory';
import { createBall, vec2 } from '../physics';

describe('Trajectory Guide System & Visual Customization', () => {
    it('enforces strict ball colors (White, Yellow, Red)', () => {
        expect(STRICT_BALL_GUIDE_COLORS.white.stroke).toBe('#ffffff');
        expect(STRICT_BALL_GUIDE_COLORS.yellow.stroke).toBe('#facc15');
        expect(STRICT_BALL_GUIDE_COLORS.red.stroke).toBe('#ef4444');
    });

    it('maps stroke styles to SVG dash arrays', () => {
        expect(getGuideStrokeDashArray('solid')).toBeUndefined();
        expect(getGuideStrokeDashArray('dashed')).toBe('5 3');
        expect(getGuideStrokeDashArray('dotted')).toBe('1.5 2.5');
    });

    it('filters trajectory in full mode', () => {
        const balls = [
            createBall('white', 71, 71),
            createBall('yellow', 100, 71),
            createBall('red', 180, 71),
        ];

        const prediction = predictTrajectory(
            balls,
            'white',
            vec2(1, 0),
            6.0,
            { x: 0, y: 0, magnitude: 0 },
            500
        );

        const filtered = filterAimTrajectory(prediction, 'white', 'full');
        expect(filtered.paths.length).toBeGreaterThan(0);
        // Full mode includes all predicted paths
        expect(filtered.paths.length).toBe(prediction.paths.length);
        expect(filtered.firstImpactType).toBe('ball_collision');
        expect(filtered.ghostBallPos).toBeDefined();
    });

    it('filters trajectory in exit_only mode (truncating cue ball path after first impact)', () => {
        const balls = [
            createBall('white', 71, 71),
            createBall('yellow', 100, 71),
            createBall('red', 180, 71),
        ];

        const prediction = predictTrajectory(
            balls,
            'white',
            vec2(1, 0),
            6.0,
            { x: 0, y: 0, magnitude: 0 },
            500
        );

        const fullFiltered = filterAimTrajectory(prediction, 'white', 'full');
        const exitFiltered = filterAimTrajectory(prediction, 'white', 'exit_only');

        const fullCuePoints = fullFiltered.paths.find((p) => p.ballId === 'white')!.points;
        const exitCuePoints = exitFiltered.paths.find((p) => p.ballId === 'white')!.points;

        // Exit-only points must be a subset of full cue points
        expect(exitCuePoints.length).toBeLessThan(fullCuePoints.length);
        expect(exitCuePoints.length).toBeGreaterThan(1);
        expect(exitFiltered.ghostBallPos).toEqual(fullFiltered.ghostBallPos);
    });

    it('filters trajectory in straight short aim mode with ghost ball and short exit stubs (Rule 8)', () => {
        const balls = [
            createBall('white', 71, 71),
            createBall('yellow', 100, 71),
            createBall('red', 180, 71),
        ];

        const prediction = predictTrajectory(
            balls,
            'white',
            vec2(1, 0),
            6.0,
            { x: 0, y: 0, magnitude: 0 },
            500
        );

        const straightFiltered = filterAimTrajectory(prediction, 'white', 'straight');
        expect(straightFiltered.firstImpactType).toBe('ball_collision');
        expect(straightFiltered.ghostBallPos).toBeDefined();
        // Straight short mode returns cue ball path and target ball exit path
        expect(straightFiltered.paths.length).toBe(2);
        const cuePath = straightFiltered.paths.find((p) => p.ballId === 'white');
        const targetPath = straightFiltered.paths.find((p) => p.ballId === 'yellow');
        expect(cuePath).toBeDefined();
        expect(targetPath).toBeDefined();
        expect(cuePath!.points.length).toBeGreaterThanOrEqual(2);
        expect(targetPath!.points.length).toBeGreaterThanOrEqual(2);
    });

    it('handles empty trajectory safely', () => {
        const filtered = filterAimTrajectory({ paths: [], cushionContacts: 0, ballCollisions: [], isValid: false }, 'white', 'full');
        expect(filtered.paths).toEqual([]);
        expect(filtered.ghostBallPos).toBeNull();
    });
});
