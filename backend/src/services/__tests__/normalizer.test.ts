import { describe, expect, it } from 'vitest';

import {
    normalizeBalls,
    validateBallCount,
    enforceBilliardPhysicsNormalized,
} from '../normalizer.js';

describe('normalizeBalls', () => {
    it('clamps values to 0-1 range', () => {
        const balls = [
            { label: 'white', x: -0.5, y: 1.5 },
            { label: 'red', x: 2, y: -1 },
        ];
        const result = normalizeBalls(balls);
        expect(result[0].x).toBe(0);
        expect(result[0].y).toBe(1);
        expect(result[1].x).toBe(1);
        expect(result[1].y).toBe(0);
    });

    it('preserves valid coordinates', () => {
        const balls = [
            { label: 'white', x: 0.3, y: 0.6 },
            { label: 'yellow', x: 0.7, y: 0.2 },
            { label: 'red', x: 0.5, y: 0.8 },
        ];
        const result = normalizeBalls(balls);
        expect(result).toEqual(balls);
    });

    it('returns empty array for empty input', () => {
        expect(normalizeBalls([])).toEqual([]);
    });

    it('reassigns duplicate ball labels when duplicates exist and length >= 3', () => {
        const balls = [
            { label: 'white', x: 0.1, y: 0.1 },
            { label: 'white', x: 0.5, y: 0.5 },
            { label: 'red', x: 0.8, y: 0.8 },
        ];
        const res = normalizeBalls(balls);
        const labels = res.map((b) => b.label);
        expect(new Set(labels).size).toBe(3);
        expect(labels).toContain('white');
        expect(labels).toContain('yellow');
        expect(labels).toContain('red');
    });

    it('handles extra duplicate balls when standard colors run out', () => {
        const balls = [
            { label: 'white', x: 0.1, y: 0.1 },
            { label: 'white', x: 0.2, y: 0.2 },
            { label: 'yellow', x: 0.3, y: 0.3 },
            { label: 'red', x: 0.4, y: 0.4 },
        ];
        const res = normalizeBalls(balls);
        expect(res).toHaveLength(4);
    });
});

describe('validateBallCount', () => {
    it('returns valid for all 3 expected balls', () => {
        const balls = [
            { label: 'white', x: 0.3, y: 0.5 },
            { label: 'yellow', x: 0.6, y: 0.3 },
            { label: 'red', x: 0.5, y: 0.7 },
        ];
        const result = validateBallCount(balls);
        expect(result.valid).toBe(true);
        expect(result.warning).toBeUndefined();
    });

    it('returns warning when balls are missing', () => {
        const balls = [{ label: 'white', x: 0.3, y: 0.5 }];
        const result = validateBallCount(balls);
        expect(result.valid).toBe(true);
        expect(result.warning).toContain('Missing');
    });

    it('returns invalid when no balls detected', () => {
        const result = validateBallCount([]);
        expect(result.valid).toBe(false);
    });

    it('returns warning for extra detections', () => {
        const balls = [
            { label: 'white', x: 0.3, y: 0.5 },
            { label: 'yellow', x: 0.6, y: 0.3 },
            { label: 'red', x: 0.5, y: 0.7 },
            { label: 'extra', x: 0.1, y: 0.1 },
        ];
        const result = validateBallCount(balls);
        expect(result.valid).toBe(true);
        expect(result.warning).toContain('Extra');
    });
});

describe('enforceBilliardPhysicsNormalized', () => {
    it('clamps balls away from cushion borders', () => {
        const balls = [
            { label: 'white', x: 0.0, y: 0.0 },
            { label: 'yellow', x: 1.0, y: 1.0 },
            { label: 'red', x: 0.5, y: 0.5 },
        ];
        const res = enforceBilliardPhysicsNormalized(balls);
        const minX = 3.1 / 284;
        const maxX = (284 - 3.1) / 284;
        const minY = 3.1 / 142;
        const maxY = (142 - 3.1) / 142;

        for (const b of res) {
            expect(b.x).toBeGreaterThanOrEqual(minX - 0.001);
            expect(b.x).toBeLessThanOrEqual(maxX + 0.001);
            expect(b.y).toBeGreaterThanOrEqual(minY - 0.001);
            expect(b.y).toBeLessThanOrEqual(maxY + 0.001);
        }
    });

    it('separates overlapping balls so they do not share coordinates', () => {
        const balls = [
            { label: 'white', x: 0.5, y: 0.5 },
            { label: 'yellow', x: 0.5, y: 0.5 },
            { label: 'red', x: 0.5, y: 0.5 },
        ];
        const res = enforceBilliardPhysicsNormalized(balls);
        expect(res).toHaveLength(3);

        for (let i = 0; i < 3; i++) {
            for (let j = i + 1; j < 3; j++) {
                const dxCm = (res[i].x - res[j].x) * 284;
                const dyCm = (res[i].y - res[j].y) * 142;
                const distCm = Math.hypot(dxCm, dyCm);
                expect(distCm).toBeGreaterThanOrEqual(6.2);
            }
        }
    });
});
