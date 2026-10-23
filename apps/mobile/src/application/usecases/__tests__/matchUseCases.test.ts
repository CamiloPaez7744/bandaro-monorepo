import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CreateMatch } from '../CreateMatch';
import { FinishMatch } from '../FinishMatch';
import { RegisterEntry } from '../RegisterEntry';
import { UndoLastEntry } from '../UndoLastEntry';
import { GetMatch } from '../GetMatch';
import { GetHistory } from '../GetHistory';
import { GetStatistics } from '../GetStatistics';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';
import type { Match } from '@/src/domain/entities/Match';
import { InvalidEntry } from '@/src/domain/exceptions/InvalidEntry';
import { MatchNotFound } from '@/src/domain/exceptions/MatchNotFound';

describe('Application Layer: Match Use Cases', () => {
    let mockRepository: IMatchRepository;
    let inMemoryMatches: Match[];

    beforeEach(() => {
        inMemoryMatches = [];
        mockRepository = {
            crear: vi.fn(async (m: Match) => {
                inMemoryMatches.push(m);
            }),
            actualizar: vi.fn(async (m: Match) => {
                const idx = inMemoryMatches.findIndex((item) => item.id === m.id);
                if (idx !== -1) inMemoryMatches[idx] = m;
                else inMemoryMatches.push(m);
            }),
            obtenerPorId: vi.fn(async (id: string) => {
                return inMemoryMatches.find((m) => m.id === id) ?? null;
            }),
            obtenerHistory: vi.fn(async () => {
                return [...inMemoryMatches];
            }),
        };
    });

    describe('CreateMatch', () => {
        it('creates a new match in EN_VIVO state with validated distances', async () => {
            const useCase = new CreateMatch(mockRepository);
            const match = await useCase.execute({
                distanciaObjetivoA: 30,
                distanciaObjetivoB: 25,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'Camilo',
                jugadorB: 'Andres',
            });

            expect(match).toBeDefined();
            expect(match.id).toBeDefined();
            expect(match.estado).toBe('EN_VIVO');
            expect(match.turnoActual).toBe('A');
            expect(match.marcadorA).toBe(0);
            expect(match.marcadorB).toBe(0);
            expect(match.distanciaObjetivoA).toBe(30);
            expect(match.distanciaObjetivoB).toBe(25);
            expect(match.jugadorA.nombre).toBe('Camilo');
            expect(match.jugadorB.nombre).toBe('Andres');
            expect(mockRepository.crear).toHaveBeenCalledTimes(1);
        });

        it('throws validation error when distance is out of bounds', async () => {
            const useCase = new CreateMatch(mockRepository);
            await expect(
                useCase.execute({
                    distanciaObjetivoA: 3, // < 5
                    distanciaObjetivoB: 25,
                    ganadorSalida: 'A',
                    bolaPlayerA: 'BLANCA',
                    bolaPlayerB: 'AMARILLA',
                    jugadorA: 'A',
                    jugadorB: 'B',
                })
            ).rejects.toThrow('La distancia debe ser un entero entre 5 y 60 carambolas.');
        });
    });

    describe('RegisterEntry', () => {
        it('registers valid entry for Player A and switches turn to Player B', async () => {
            const createUseCase = new CreateMatch(mockRepository);
            const match = await createUseCase.execute({
                distanciaObjetivoA: 20,
                distanciaObjetivoB: 20,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            const registerUseCase = new RegisterEntry(mockRepository);
            const updated = await registerUseCase.execute({
                partidaId: match.id,
                jugador: 'A',
                carambolas: 4,
            });

            expect(updated.marcadorA).toBe(4);
            expect(updated.marcadorB).toBe(0);
            expect(updated.turnoActual).toBe('B');
            expect(updated.entradas).toHaveLength(1);
            expect(updated.entradas[0].numero).toBe(1);
            expect(updated.entradas[0].carambolas).toBe(4);
        });

        it('registers foul entry with 0 carambolas and advances turn', async () => {
            const createUseCase = new CreateMatch(mockRepository);
            const match = await createUseCase.execute({
                distanciaObjetivoA: 20,
                distanciaObjetivoB: 20,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            const registerUseCase = new RegisterEntry(mockRepository);
            const updated = await registerUseCase.execute({
                partidaId: match.id,
                jugador: 'B',
                carambolas: 3,
                falta: true,
            });

            expect(updated.marcadorB).toBe(0);
            expect(updated.turnoActual).toBe('A');
            expect(updated.entradas[0].falta).toBe(true);
            expect(updated.entradas[0].carambolas).toBe(0);
        });

        it('throws InvalidEntry when carambolas is negative or exceeds 15', async () => {
            const registerUseCase = new RegisterEntry(mockRepository);
            await expect(
                registerUseCase.execute({ partidaId: '1', jugador: 'A', carambolas: -1 })
            ).rejects.toBeInstanceOf(InvalidEntry);

            await expect(
                registerUseCase.execute({ partidaId: '1', jugador: 'A', carambolas: 16 })
            ).rejects.toBeInstanceOf(InvalidEntry);
        });

        it('throws MatchNotFound when match id is not found', async () => {
            const registerUseCase = new RegisterEntry(mockRepository);
            await expect(
                registerUseCase.execute({ partidaId: 'non-existent', jugador: 'A', carambolas: 2 })
            ).rejects.toBeInstanceOf(MatchNotFound);
        });

        it('throws InvalidEntry when match is already FINALIZADA', async () => {
            const createUseCase = new CreateMatch(mockRepository);
            const match = await createUseCase.execute({
                distanciaObjetivoA: 20,
                distanciaObjetivoB: 20,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            match.estado = 'FINALIZADA';

            const registerUseCase = new RegisterEntry(mockRepository);
            await expect(
                registerUseCase.execute({ partidaId: match.id, jugador: 'A', carambolas: 2 })
            ).rejects.toBeInstanceOf(InvalidEntry);
        });
    });

    describe('UndoLastEntry', () => {
        it('removes the last entry, subtracts points, and reverts turn', async () => {
            const createUseCase = new CreateMatch(mockRepository);
            const match = await createUseCase.execute({
                distanciaObjetivoA: 20,
                distanciaObjetivoB: 20,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            const registerUseCase = new RegisterEntry(mockRepository);
            await registerUseCase.execute({ partidaId: match.id, jugador: 'A', carambolas: 5 });
            await registerUseCase.execute({ partidaId: match.id, jugador: 'B', carambolas: 3 });

            const undoUseCase = new UndoLastEntry(mockRepository);
            const afterUndoB = await undoUseCase.execute(match.id);

            expect(afterUndoB.marcadorB).toBe(0);
            expect(afterUndoB.turnoActual).toBe('B');
            expect(afterUndoB.entradas).toHaveLength(1);

            const afterUndoA = await undoUseCase.execute(match.id);
            expect(afterUndoA.marcadorA).toBe(0);
            expect(afterUndoA.turnoActual).toBe('A');
            expect(afterUndoA.entradas).toHaveLength(0);

            // Undo on empty entradas returns unchanged match
            const emptyUndo = await undoUseCase.execute(match.id);
            expect(emptyUndo.entradas).toHaveLength(0);
        });

        it('throws MatchNotFound when undoing non-existent match', async () => {
            const undoUseCase = new UndoLastEntry(mockRepository);
            await expect(undoUseCase.execute('missing-id')).rejects.toBeInstanceOf(MatchNotFound);
        });
    });

    describe('FinishMatch', () => {
        it('finishes match and calculates summary statistics with winner', async () => {
            const createUseCase = new CreateMatch(mockRepository);
            const match = await createUseCase.execute({
                distanciaObjetivoA: 15,
                distanciaObjetivoB: 15,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            const registerUseCase = new RegisterEntry(mockRepository);
            await registerUseCase.execute({ partidaId: match.id, jugador: 'A', carambolas: 5 });
            await registerUseCase.execute({ partidaId: match.id, jugador: 'B', carambolas: 2 });
            await registerUseCase.execute({ partidaId: match.id, jugador: 'A', carambolas: 10 });
            await registerUseCase.execute({ partidaId: match.id, jugador: 'B', carambolas: 1 });

            const finishUseCase = new FinishMatch(mockRepository);
            const { partida, resumen } = await finishUseCase.execute(match.id);

            expect(partida.estado).toBe('FINALIZADA');
            expect(partida.fechaFin).toBeDefined();
            expect(resumen.ganador).toBe('A');
            expect(resumen.serieMayorA).toBe(10);
            expect(resumen.serieMayorB).toBe(2);
            expect(resumen.promedioGeneral).toBe(4.5); // (15 + 3) / 4 entries
        });

        it('determines EMPATE when scores are tied upon finish', async () => {
            const createUseCase = new CreateMatch(mockRepository);
            const match = await createUseCase.execute({
                distanciaObjetivoA: 10,
                distanciaObjetivoB: 10,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            const registerUseCase = new RegisterEntry(mockRepository);
            await registerUseCase.execute({ partidaId: match.id, jugador: 'A', carambolas: 5 });
            await registerUseCase.execute({ partidaId: match.id, jugador: 'B', carambolas: 5 });

            const finishUseCase = new FinishMatch(mockRepository);
            const { resumen } = await finishUseCase.execute(match.id);

            expect(resumen.ganador).toBe('EMPATE');
        });

        it('throws MatchNotFound when finishing non-existent match', async () => {
            const finishUseCase = new FinishMatch(mockRepository);
            await expect(finishUseCase.execute('not-found')).rejects.toBeInstanceOf(MatchNotFound);
        });
    });

    describe('GetMatch & GetHistory', () => {
        it('retrieves match by id or returns null when missing', async () => {
            const getMatchUseCase = new GetMatch(mockRepository);
            expect(await getMatchUseCase.execute('absent')).toBeNull();

            const createUseCase = new CreateMatch(mockRepository);
            const match = await createUseCase.execute({
                distanciaObjetivoA: 15,
                distanciaObjetivoB: 15,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            expect(await getMatchUseCase.execute(match.id)).toEqual(match);
        });

        it('retrieves full history of matches', async () => {
            const getHistoryUseCase = new GetHistory(mockRepository);
            expect(await getHistoryUseCase.execute()).toHaveLength(0);

            const createUseCase = new CreateMatch(mockRepository);
            await createUseCase.execute({
                distanciaObjetivoA: 15,
                distanciaObjetivoB: 15,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            expect(await getHistoryUseCase.execute()).toHaveLength(1);
        });
    });

    describe('GetStatistics', () => {
        it('computes aggregated statistics from all finished matches', async () => {
            const createUseCase = new CreateMatch(mockRepository);
            const match = await createUseCase.execute({
                distanciaObjetivoA: 10,
                distanciaObjetivoB: 10,
                ganadorSalida: 'A',
                bolaPlayerA: 'BLANCA',
                bolaPlayerB: 'AMARILLA',
                jugadorA: 'A',
                jugadorB: 'B',
            });

            const registerUseCase = new RegisterEntry(mockRepository);
            await registerUseCase.execute({ partidaId: match.id, jugador: 'A', carambolas: 4 });
            await registerUseCase.execute({ partidaId: match.id, jugador: 'B', carambolas: 2 });

            const finishUseCase = new FinishMatch(mockRepository);
            await finishUseCase.execute(match.id);

            const statsUseCase = new GetStatistics(mockRepository);
            const stats = await statsUseCase.execute();

            expect(stats.totalMatchs).toBe(1);
            expect(stats.totalEntrys).toBe(2);
            expect(stats.promedioGeneral).toBe(3); // 6 carambolas / 2 entries
            expect(stats.serieMayor).toBe(4);
        });
    });
});
