import { describe, expect, it } from 'vitest';

import { snapshotToBalls, type SnapshotBall } from '../snapshotAdapter';
import { DEFAULT_TABLE } from '../types';

describe('snapshotToBalls', () => {
    it('converts normalized coordinates to table coordinates', () => {
        const input: SnapshotBall[] = [
            { label: 'white', x: 0.5, y: 0.5 },
        ];
        const result = snapshotToBalls(input);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('white');
        expect(result[0].pos.x).toBe(DEFAULT_TABLE.width * 0.5);
        expect(result[0].pos.y).toBe(DEFAULT_TABLE.height * 0.5);
    });

    it('creates all 3 ball types', () => {
        const input: SnapshotBall[] = [
            { label: 'white', x: 0.2, y: 0.3 },
            { label: 'yellow', x: 0.7, y: 0.4 },
            { label: 'red', x: 0.5, y: 0.8 },
        ];
        const result = snapshotToBalls(input);

        expect(result).toHaveLength(3);
        expect(result.map((b) => b.id).sort()).toEqual(['red', 'white', 'yellow']);
    });

    it('filters out unknown ball labels', () => {
        const input = [
            { label: 'white', x: 0.2, y: 0.3 },
            { label: 'purple', x: 0.5, y: 0.5 },
            { label: 'red', x: 0.7, y: 0.8 },
        ] as SnapshotBall[];
        const result = snapshotToBalls(input);

        expect(result).toHaveLength(2);
        expect(result.every((b) => b.vel.x === 0)).toBe(true);
    });

    it('returns empty array for empty input', () => {
        expect(snapshotToBalls([])).toEqual([]);
    });

    it('maps corner positions correctly', () => {
        const input: SnapshotBall[] = [
            { label: 'white', x: 0, y: 0 },
            { label: 'yellow', x: 1, y: 1 },
        ];
        const result = snapshotToBalls(input);

        expect(result[0].pos.x).toBe(0);
        expect(result[0].pos.y).toBe(0);
        expect(result[1].pos.x).toBe(DEFAULT_TABLE.width);
        expect(result[1].pos.y).toBe(DEFAULT_TABLE.height);
    });

    it('creates balls at rest (zero velocity and spin)', () => {
        const input: SnapshotBall[] = [
            { label: 'white', x: 0.5, y: 0.5 },
        ];
        const result = snapshotToBalls(input);

        expect(result[0].vel).toEqual({ x: 0, y: 0 });
        expect(result[0].spin).toEqual({ x: 0, y: 0 });
    });
});
