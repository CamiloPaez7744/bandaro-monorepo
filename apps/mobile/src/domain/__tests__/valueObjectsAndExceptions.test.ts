import { describe, expect, it } from 'vitest';
import { Average } from '../value-objects/Average';
import { Distance } from '../value-objects/Distance';
import { HighestRun } from '../value-objects/HighestRun';
import { InvalidEntry } from '../exceptions/InvalidEntry';
import { MatchNotFound } from '../exceptions/MatchNotFound';

describe('Domain: Value Objects & Exceptions', () => {
    describe('Average', () => {
        it('calculates average rounded to 3 decimals', () => {
            expect(Average.calcular(10, 3)).toBe(3.333);
            expect(Average.calcular(25, 20)).toBe(1.25);
            expect(Average.calcular(40, 25)).toBe(1.6);
        });

        it('returns 0 when total entries is 0 or negative', () => {
            expect(Average.calcular(10, 0)).toBe(0);
            expect(Average.calcular(5, -1)).toBe(0);
        });
    });

    describe('Distance', () => {
        it('validates integer distance within [5, 60]', () => {
            expect(Distance.validar(5)).toBe(5);
            expect(Distance.validar(30)).toBe(30);
            expect(Distance.validar(60)).toBe(60);
        });

        it('throws error when distance is less than 5', () => {
            expect(() => Distance.validar(4)).toThrow('La distancia debe ser un entero entre 5 y 60 carambolas.');
        });

        it('throws error when distance is greater than 60', () => {
            expect(() => Distance.validar(61)).toThrow('La distancia debe ser un entero entre 5 y 60 carambolas.');
        });

        it('throws error when distance is not an integer', () => {
            expect(() => Distance.validar(25.5)).toThrow('La distancia debe ser un entero entre 5 y 60 carambolas.');
        });
    });

    describe('HighestRun', () => {
        it('calculates highest run from series of points', () => {
            expect(HighestRun.calcular([2, 5, 8, 3, 1])).toBe(8);
            expect(HighestRun.calcular([0, 0, 1])).toBe(1);
        });

        it('returns 0 when series is empty', () => {
            expect(HighestRun.calcular([])).toBe(0);
        });
    });

    describe('Exceptions', () => {
        it('instantiates InvalidEntry with standard message and name', () => {
            const err = new InvalidEntry();
            expect(err.message).toBe('La entrada no es valida para la partida actual.');
            expect(err.name).toBe('InvalidEntry');
            expect(err instanceof Error).toBe(true);
        });

        it('instantiates MatchNotFound with matchId in message', () => {
            const err = new MatchNotFound('match-999');
            expect(err.message).toBe('No se encontro la partida con id match-999');
            expect(err.name).toBe('MatchNotFound');
            expect(err instanceof Error).toBe(true);
        });
    });
});
