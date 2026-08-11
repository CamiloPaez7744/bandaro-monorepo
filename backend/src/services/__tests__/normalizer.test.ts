import { describe, expect, it } from 'vitest';

import { normalizeBalls, validateBallCount } from '../normalizer.js';

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
