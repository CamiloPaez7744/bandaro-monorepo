import { describe, expect, it } from 'vitest';
import {
    UMB_BREAK_POSITION,
    UMB_BREAK_LEFT_POSITION,
    PBA_SPOTS,
    PBA_BREAK_FORMATIONS,
    getBreakPosition,
    getDefaultBreakAim,
    getRandomPbaBreak,
} from '../breakPositions';

describe('Break Positions (UMB & PBA)', () => {
    describe('UMB Break Positions', () => {
        it('has correct official UMB right-side break coordinates', () => {
            const pos = getBreakPosition('umb', { umbSide: 'right' });
            // Red on foot spot (3/4 length, center width)
            expect(pos.red.x).toBe(213);
            expect(pos.red.y).toBe(71);

            // Yellow on head spot (1/4 length, center width)
            expect(pos.yellow.x).toBe(71);
            expect(pos.yellow.y).toBe(71);

            // White on head string, 18.25 cm to the right
            expect(pos.white.x).toBe(71);
            expect(pos.white.y).toBe(52.75);
            expect(71 - pos.white.y).toBe(18.25);
        });

        it('has correct official UMB left-side break coordinates', () => {
            const pos = getBreakPosition('umb', { umbSide: 'left' });
            expect(pos.white.x).toBe(71);
            expect(pos.white.y).toBe(89.25);
            expect(pos.white.y - 71).toBe(18.25);
        });

        it('calculates correct default aim pointing directly towards red ball', () => {
            const pos = getBreakPosition('umb');
            const aim = getDefaultBreakAim(pos);
            expect(aim.x).toBeGreaterThan(0); // Aiming forwards towards foot cushion
            expect(aim.y).toBeGreaterThan(0); // Aiming slightly down/right towards center Y = 71
            const len = Math.hypot(aim.x, aim.y);
            expect(len).toBeCloseTo(1, 4);
        });
    });

    describe('PBA Break Positions', () => {
        it('has valid 9 spots on 3x3 grid matching diamonds', () => {
            expect(PBA_SPOTS[1]).toEqual({ x: 71, y: 35.5 });
            expect(PBA_SPOTS[5]).toEqual({ x: 142, y: 71.0 });
            expect(PBA_SPOTS[9]).toEqual({ x: 213, y: 106.5 });
        });

        it('supports canonical 1-5-9 formation', () => {
            const pos = getBreakPosition('pba', { pbaFormation: '159' });
            expect(pos.white).toEqual(PBA_SPOTS[1]);
            expect(pos.yellow).toEqual(PBA_SPOTS[5]);
            expect(pos.red).toEqual(PBA_SPOTS[9]);
        });

        it('supports symmetric 3-5-7 formation', () => {
            const pos = getBreakPosition('pba', { pbaFormation: '357' });
            expect(pos.white).toEqual(PBA_SPOTS[3]);
            expect(pos.yellow).toEqual(PBA_SPOTS[5]);
            expect(pos.red).toEqual(PBA_SPOTS[7]);
        });

        it('generates valid random PBA break respecting 1-3, 4-6, 7-9 spot drawing rules', () => {
            const randomBreak = getRandomPbaBreak();
            const [wSpot, ySpot, rSpot] = randomBreak.spotNumbers;
            expect([1, 2, 3]).toContain(wSpot);
            expect([4, 5, 6]).toContain(ySpot);
            expect([7, 8, 9]).toContain(rSpot);
            expect(randomBreak.balls.white).toEqual(PBA_SPOTS[wSpot]);
            expect(randomBreak.balls.yellow).toEqual(PBA_SPOTS[ySpot]);
            expect(randomBreak.balls.red).toEqual(PBA_SPOTS[rSpot]);
        });
    });
});
