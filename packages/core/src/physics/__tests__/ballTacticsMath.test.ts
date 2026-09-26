import { describe, it, expect } from 'vitest';

describe('Billiard Bible Ball Thickness & English Coordinate System', () => {
    const diameter = 80;
    const radius = diameter / 2;
    const stepPerEighth = diameter / 8; // 10px

    describe('Ball Thickness 1/8 System', () => {
        it('calculates 8/8 full frontal collision offset', () => {
            const thickness = 0;
            const objOffset = -thickness * stepPerEighth;
            expect(objOffset).toBeCloseTo(0);
        });

        it('calculates 1/2 ball cut (4/8) to the left', () => {
            const thickness = 4.0;
            const objOffset = -thickness * stepPerEighth;
            // Center of object ball shifts to the left by exactly 1 radius (half ball)
            expect(objOffset).toBe(-radius);
            expect(Math.abs(objOffset)).toBe(40);
        });

        it('calculates 1/2 ball cut (4/8) to the right', () => {
            const thickness = -4.0;
            const objOffset = -thickness * stepPerEighth;
            // Center of object ball shifts to the right by exactly 1 radius
            expect(objOffset).toBe(radius);
            expect(objOffset).toBe(40);
        });

        it('calculates 3/4 ball cut (6/8)', () => {
            const thickness = 6.0;
            const objOffset = -thickness * stepPerEighth;
            expect(objOffset).toBe(-60);
        });

        it('calculates 1/8 fine cut (1/8)', () => {
            const thickness = 1.0;
            const objOffset = -thickness * stepPerEighth;
            expect(objOffset).toBe(-10);
        });

        it('calculates tangential grazing hit (8/8 cut limit)', () => {
            const thickness = 8.0;
            const objOffset = -thickness * stepPerEighth;
            expect(objOffset).toBe(-diameter); // Exactly 1 diameter offset
        });
    });

    describe('Cue Ball English & Clock Strike Points', () => {
        const maxStrikeRadius = radius * 0.6; // 24px (miscue safety threshold)

        it('calculates 12 o\'clock (straight top / follow)', () => {
            const hour = 12;
            const tips = 3.0;
            const theta = (hour / 12) * 2 * Math.PI - Math.PI / 2;
            const dist = (tips / 3.0) * maxStrikeRadius;
            const x = Math.cos(theta) * dist;
            const y = Math.sin(theta) * dist;

            expect(Math.abs(x)).toBeLessThan(1e-10);
            expect(y).toBeCloseTo(-maxStrikeRadius, 5); // Negative Y is UP in SVG
        });

        it('calculates 6 o\'clock (straight bottom / draw)', () => {
            const hour = 6;
            const tips = 3.0;
            const theta = (hour / 12) * 2 * Math.PI - Math.PI / 2;
            const dist = (tips / 3.0) * maxStrikeRadius;
            const x = Math.cos(theta) * dist;
            const y = Math.sin(theta) * dist;

            expect(Math.abs(x)).toBeLessThan(1e-10);
            expect(y).toBeCloseTo(maxStrikeRadius, 5); // Positive Y is DOWN in SVG
        });

        it('calculates 3 o\'clock (full right spin)', () => {
            const hour = 3;
            const tips = 3.0;
            const theta = (hour / 12) * 2 * Math.PI - Math.PI / 2;
            const dist = (tips / 3.0) * maxStrikeRadius;
            const x = Math.cos(theta) * dist;
            const y = Math.sin(theta) * dist;

            expect(x).toBeCloseTo(maxStrikeRadius, 5); // Positive X is RIGHT
            expect(Math.abs(y)).toBeLessThan(1e-10);
        });

        it('calculates 9 o\'clock (full left spin)', () => {
            const hour = 9;
            const tips = 3.0;
            const theta = (hour / 12) * 2 * Math.PI - Math.PI / 2;
            const dist = (tips / 3.0) * maxStrikeRadius;
            const x = Math.cos(theta) * dist;
            const y = Math.sin(theta) * dist;

            expect(x).toBeCloseTo(-maxStrikeRadius, 5); // Negative X is LEFT
            expect(Math.abs(y)).toBeLessThan(1e-10);
        });

        it('calculates 2 tips spin at 1.5 tips scaling', () => {
            const tips = 1.5;
            const dist = (tips / 3.0) * maxStrikeRadius;
            expect(dist).toBe(maxStrikeRadius / 2);
        });
    });
});
