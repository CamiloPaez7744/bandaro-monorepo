import { describe, expect, it } from 'vitest';
import { validateThreeCushionShot, checkThreeCushionRule } from '../threeCushion';
import { ShotEvent } from '../../physics/types';
import { vec2 } from '../../physics/physics';

describe('validateThreeCushionShot', () => {
    it('validates classic carom: ball 1 -> 3 cushions -> ball 2', () => {
        const events: ShotEvent[] = [
            {
                type: 'ball_collision',
                timestamp: 10,
                data: { ball1: 'white', ball2: 'yellow', position: vec2(100, 50), timestamp: 10 },
            },
            {
                type: 'cushion',
                timestamp: 20,
                data: { ballId: 'white', side: 'top', normal: vec2(0, 1), position: vec2(150, 0), timestamp: 20 },
            },
            {
                type: 'cushion',
                timestamp: 30,
                data: { ballId: 'white', side: 'right', normal: vec2(-1, 0), position: vec2(284, 50), timestamp: 30 },
            },
            {
                type: 'cushion',
                timestamp: 40,
                data: { ballId: 'white', side: 'bottom', normal: vec2(0, -1), position: vec2(200, 142), timestamp: 40 },
            },
            {
                type: 'ball_collision',
                timestamp: 50,
                data: { ball1: 'white', ball2: 'red', position: vec2(180, 100), timestamp: 50 },
            },
        ];

        const result = validateThreeCushionShot(events, 'white');
        expect(result.isValid).toBe(true);
        expect(result.scoringDetails.cushionsBeforeSecondHit).toBe(3);
        expect(result.scoringDetails.firstBallHit).toBe('yellow');
        expect(result.scoringDetails.secondBallHit).toBe('red');
    });

    it('validates bricole (banda previa): 3 cushions -> ball 1 -> ball 2', () => {
        const events: ShotEvent[] = [
            {
                type: 'cushion',
                timestamp: 10,
                data: { ballId: 'white', side: 'top', normal: vec2(0, 1), position: vec2(50, 0), timestamp: 10 },
            },
            {
                type: 'cushion',
                timestamp: 20,
                data: { ballId: 'white', side: 'right', normal: vec2(-1, 0), position: vec2(284, 70), timestamp: 20 },
            },
            {
                type: 'cushion',
                timestamp: 30,
                data: { ballId: 'white', side: 'bottom', normal: vec2(0, -1), position: vec2(200, 142), timestamp: 30 },
            },
            {
                type: 'ball_collision',
                timestamp: 40,
                data: { ball1: 'white', ball2: 'yellow', position: vec2(150, 80), timestamp: 40 },
            },
            {
                type: 'ball_collision',
                timestamp: 50,
                data: { ball1: 'white', ball2: 'red', position: vec2(120, 60), timestamp: 50 },
            },
        ];

        const result = validateThreeCushionShot(events, 'white');
        expect(result.isValid).toBe(true);
        expect(result.classification).toBe('bricole');
        expect(result.scoringDetails.cushionsBeforeFirstHit).toBe(3);
    });

    it('rejects direct carom even if cushions are hit afterwards', () => {
        // Direct hit on yellow and red, then 3 cushions after
        const events: ShotEvent[] = [
            {
                type: 'ball_collision',
                timestamp: 10,
                data: { ball1: 'white', ball2: 'yellow', position: vec2(60, 70), timestamp: 10 },
            },
            {
                type: 'ball_collision',
                timestamp: 15,
                data: { ball1: 'white', ball2: 'red', position: vec2(70, 75), timestamp: 15 },
            },
            {
                type: 'cushion',
                timestamp: 25,
                data: { ballId: 'white', side: 'top', normal: vec2(0, 1), position: vec2(100, 0), timestamp: 25 },
            },
            {
                type: 'cushion',
                timestamp: 35,
                data: { ballId: 'white', side: 'right', normal: vec2(-1, 0), position: vec2(284, 50), timestamp: 35 },
            },
            {
                type: 'cushion',
                timestamp: 45,
                data: { ballId: 'white', side: 'bottom', normal: vec2(0, -1), position: vec2(200, 142), timestamp: 45 },
            },
        ];

        const result = validateThreeCushionShot(events, 'white');
        expect(result.isValid).toBe(false);
        expect(result.classification).toBe('carambola_directa');
        expect(result.scoringDetails.cushionsBeforeSecondHit).toBe(0);
    });

    it('rejects 2-cushion foul', () => {
        const events: ShotEvent[] = [
            {
                type: 'ball_collision',
                timestamp: 10,
                data: { ball1: 'white', ball2: 'yellow', position: vec2(100, 50), timestamp: 10 },
            },
            {
                type: 'cushion',
                timestamp: 20,
                data: { ballId: 'white', side: 'top', normal: vec2(0, 1), position: vec2(150, 0), timestamp: 20 },
            },
            {
                type: 'cushion',
                timestamp: 30,
                data: { ballId: 'white', side: 'right', normal: vec2(-1, 0), position: vec2(284, 50), timestamp: 30 },
            },
            {
                type: 'ball_collision',
                timestamp: 40,
                data: { ball1: 'white', ball2: 'red', position: vec2(220, 80), timestamp: 40 },
            },
        ];

        const result = validateThreeCushionShot(events, 'white');
        expect(result.isValid).toBe(false);
        expect(result.classification).toBe('falta_bandas');
        expect(result.scoringDetails.cushionsBeforeSecondHit).toBe(2);
    });

    it('rejects retruque on same ball that travels 3 cushions and hits same ball again without touching second ball', () => {
        // Cue ball (white) hits yellow, then 3 cushions, then hits yellow again
        const events: ShotEvent[] = [
            {
                type: 'ball_collision',
                timestamp: 10,
                data: { ball1: 'white', ball2: 'yellow', position: vec2(100, 50), timestamp: 10 },
            },
            {
                type: 'cushion',
                timestamp: 20,
                data: { ballId: 'white', side: 'top', normal: vec2(0, 1), position: vec2(150, 0), timestamp: 20 },
            },
            {
                type: 'cushion',
                timestamp: 30,
                data: { ballId: 'white', side: 'right', normal: vec2(-1, 0), position: vec2(284, 50), timestamp: 30 },
            },
            {
                type: 'cushion',
                timestamp: 40,
                data: { ballId: 'white', side: 'bottom', normal: vec2(0, -1), position: vec2(200, 142), timestamp: 40 },
            },
            {
                type: 'ball_collision',
                timestamp: 50,
                data: { ball1: 'white', ball2: 'yellow', position: vec2(180, 100), timestamp: 50 },
            },
        ];

        const result = validateThreeCushionShot(events, 'white');
        // Must be INVALID because red was NEVER contacted!
        expect(result.isValid).toBe(false);
        expect(result.classification).toBe('incompleto');
        expect(result.scoringDetails.firstBallHit).toBe('yellow');
        expect(result.scoringDetails.secondBallHit).toBeNull();
        expect(result.scoringDetails.hasRetruque).toBe(true);
        expect(result.reason).toContain('Se golpeó la misma bola (yellow) dos veces');
    });

    it('validates shot with early retruque on yellow, then 3 cushions, then hits red', () => {
        // Cue ball (white) hits yellow, retruques on yellow, then 3 cushions, then hits red
        const events: ShotEvent[] = [
            {
                type: 'ball_collision',
                timestamp: 10,
                data: { ball1: 'white', ball2: 'yellow', position: vec2(100, 50), timestamp: 10 },
            },
            {
                type: 'ball_collision',
                timestamp: 12,
                data: { ball1: 'white', ball2: 'yellow', position: vec2(102, 51), timestamp: 12 }, // Retruque
            },
            {
                type: 'cushion',
                timestamp: 20,
                data: { ballId: 'white', side: 'top', normal: vec2(0, 1), position: vec2(150, 0), timestamp: 20 },
            },
            {
                type: 'cushion',
                timestamp: 30,
                data: { ballId: 'white', side: 'right', normal: vec2(-1, 0), position: vec2(284, 50), timestamp: 30 },
            },
            {
                type: 'cushion',
                timestamp: 40,
                data: { ballId: 'white', side: 'bottom', normal: vec2(0, -1), position: vec2(200, 142), timestamp: 40 },
            },
            {
                type: 'ball_collision',
                timestamp: 50,
                data: { ball1: 'white', ball2: 'red', position: vec2(180, 100), timestamp: 50 },
            },
        ];

        const result = validateThreeCushionShot(events, 'white');
        // Valid carom because 3 cushions were completed and red was contacted!
        expect(result.isValid).toBe(true);
        expect(result.scoringDetails.firstBallHit).toBe('yellow');
        expect(result.scoringDetails.secondBallHit).toBe('red');
        expect(result.scoringDetails.hasRetruque).toBe(true);
        expect(result.scoringDetails.cushionsBeforeSecondHit).toBe(3);
    });
});
