import { describe, expect, it } from 'vitest';
import { MatchMapper } from '../mappers/MatchMapper';
import { createJwt, readJwtExpiration } from '../auth/jwt';
import type { Match } from '@/src/domain/entities/Match';

describe('Infrastructure: Mappers & JWT Helpers', () => {
    describe('MatchMapper', () => {
        it('serializes Match to primitives and deserializes back faithfully', () => {
            const match: Match = {
                id: 'match-123',
                fechaInicio: '2026-10-22T19:00:00.000Z',
                modalidad: '3_BANDAS',
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                distanciaObjetivoA: 30,
                distanciaObjetivoB: 25,
                estado: 'EN_VIVO',
                turnoActual: 'A',
                jugadorA: { nombre: 'Player A' },
                jugadorB: { nombre: 'Player B' },
                marcadorA: 10,
                marcadorB: 8,
                entradas: [
                    {
                        numero: 1,
                        jugador: 'A',
                        carambolas: 4,
                        timestamp: '2026-10-22T19:05:00.000Z',
                    },
                ],
            };

            const serialized = MatchMapper.toPrimitives(match);
            expect(typeof serialized).toBe('string');

            const deserialized = MatchMapper.fromPrimitives(serialized);
            expect(deserialized).toEqual(match);
            expect(deserialized.id).toBe('match-123');
            expect(deserialized.entradas).toHaveLength(1);
        });
    });

    describe('JWT Helpers', () => {
        it('creates a signed local JWT token with future expiry', () => {
            const { token, exp } = createJwt({ sub: 'user-77', role: 'player' }, 3600);
            expect(token).toBeDefined();
            expect(token.split('.')).toHaveLength(3);
            expect(exp).toBeGreaterThan(Date.now());
        });

        it('reads and converts JWT expiration timestamp accurately', () => {
            const { token, exp } = createJwt({ sub: 'user-88' }, 7200);
            const extractedExp = readJwtExpiration(token);
            expect(Math.abs(extractedExp - exp)).toBeLessThan(1000);
        });

        it('throws error when token does not have 3 parts', () => {
            expect(() => readJwtExpiration('single-part-token')).toThrow('JWT invalido');
            expect(() => readJwtExpiration('part1.part2')).toThrow('JWT invalido');
        });

        it('throws error when token payload has no expiration field', () => {
            const header = encodeURIComponent(JSON.stringify({ alg: 'HS256' })).replaceAll('%', '_');
            const payloadNoExp = encodeURIComponent(JSON.stringify({ sub: 'no-exp' })).replaceAll('%', '_');
            const sig = 'sig';
            const badToken = `${header}.${payloadNoExp}.${sig}`;

            expect(() => readJwtExpiration(badToken)).toThrow('JWT sin expiracion');
        });
    });
});
