import { describe, expect, it } from 'vitest';

import { validateCorners, type Point } from '../cornerValidator.js';

function makeSquare(): Point[] {
    return [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
    ];
}

describe('validateCorners', () => {
    it('accepts a valid square', () => {
        const result = validateCorners(makeSquare());
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('accepts a valid rectangle', () => {
        const corners: Point[] = [
            { x: 0.05, y: 0.2 },
            { x: 0.95, y: 0.2 },
            { x: 0.95, y: 0.8 },
            { x: 0.05, y: 0.8 },
        ];
        expect(validateCorners(corners).valid).toBe(true);
    });

    it('rejects less than 4 corners', () => {
        expect(validateCorners([{ x: 0, y: 0 }, { x: 1, y: 0 }]).valid).toBe(false);
    });

    it('rejects corners with non-numeric values', () => {
        const corners = [
            { x: NaN, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
        ] as unknown as Point[];
        expect(validateCorners(corners).valid).toBe(false);
    });

    it('rejects corners outside expanded canvas range', () => {
        const corners: Point[] = [
            { x: -1.2, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
        ];
        const result = validateCorners(corners);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('expanded canvas');
    });

    it('rejects concave quadrilateral', () => {
        const corners: Point[] = [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.5, y: 0.5 }, // concave point
            { x: 0.1, y: 0.9 },
        ];
        expect(validateCorners(corners).valid).toBe(false);
    });

    it('rejects too-small area', () => {
        const corners: Point[] = [
            { x: 0.49, y: 0.49 },
            { x: 0.51, y: 0.49 },
            { x: 0.51, y: 0.51 },
            { x: 0.49, y: 0.51 },
        ];
        const result = validateCorners(corners);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('area');
    });

    it('accepts rotated quadrilateral', () => {
        const corners: Point[] = [
            { x: 0.3, y: 0.1 },
            { x: 0.9, y: 0.2 },
            { x: 0.8, y: 0.85 },
            { x: 0.15, y: 0.75 },
        ];
        expect(validateCorners(corners).valid).toBe(true);
    });

    it('rejects degenerate (all points collinear)', () => {
        const corners: Point[] = [
            { x: 0.1, y: 0.5 },
            { x: 0.3, y: 0.5 },
            { x: 0.7, y: 0.5 },
            { x: 0.9, y: 0.5 },
        ];
        const result = validateCorners(corners);
        expect(result.valid).toBe(false);
    });
});
