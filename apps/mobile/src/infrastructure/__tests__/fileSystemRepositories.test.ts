import { describe, expect, it, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileSystemMatchRepository } from '../repositories/FileSystemMatchRepository';
import { FileSystemAuthRepository } from '../repositories/FileSystemAuthRepository';
import type { Match } from '@/src/domain/entities/Match';

describe('Infrastructure: FileSystem Repositories (AsyncStorage)', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
    });

    describe('FileSystemMatchRepository', () => {
        const sampleMatch: Match = {
            id: 'm-1',
            fechaInicio: new Date().toISOString(),
            modalidad: '3_BANDAS',
            ganadorSalida: 'A',
            bolaPlayerA: 'BLANCA',
            bolaPlayerB: 'AMARILLA',
            distanciaObjetivoA: 20,
            distanciaObjetivoB: 20,
            estado: 'EN_VIVO',
            turnoActual: 'A',
            jugadorA: { nombre: 'Player A' },
            jugadorB: { nombre: 'Player B' },
            marcadorA: 0,
            marcadorB: 0,
            entradas: [],
        };

        it('returns empty array when no matches are saved', async () => {
            const repo = new FileSystemMatchRepository();
            const history = await repo.obtenerHistory();
            expect(history).toEqual([]);
        });

        it('creates a match and persists it into storage', async () => {
            const repo = new FileSystemMatchRepository();
            await repo.crear(sampleMatch);

            const fetched = await repo.obtenerPorId('m-1');
            expect(fetched).toBeDefined();
            expect(fetched?.id).toBe('m-1');
            expect(fetched?.jugadorA.nombre).toBe('Player A');
        });

        it('updates an existing match or appends if index not found', async () => {
            const repo = new FileSystemMatchRepository();
            await repo.crear(sampleMatch);

            const updatedMatch: Match = {
                ...sampleMatch,
                marcadorA: 12,
                turnoActual: 'B',
            };

            await repo.actualizar(updatedMatch);
            const fetched = await repo.obtenerPorId('m-1');
            expect(fetched?.marcadorA).toBe(12);
            expect(fetched?.turnoActual).toBe('B');

            // Appends when not found
            const match2: Match = { ...sampleMatch, id: 'm-2' };
            await repo.actualizar(match2);
            const history = await repo.obtenerHistory();
            expect(history).toHaveLength(2);
        });

        it('returns null when match by id does not exist', async () => {
            const repo = new FileSystemMatchRepository();
            expect(await repo.obtenerPorId('non-existent')).toBeNull();
        });
    });

    describe('FileSystemAuthRepository', () => {
        it('registers a user, prevents duplicate email, and hashes password', async () => {
            const repo = new FileSystemAuthRepository();
            const user = await repo.registrar({
                nombre: 'Andres Cepeda',
                alias: 'AndresC',
                email: 'andres@bandaro.app',
                avatar: 'av-andres',
                nacionalidad: 'Colombia',
                countryCode: 'co',
                password: 'myPassword123',
            });

            expect(user.id).toBeDefined();
            expect(user.email).toBe('andres@bandaro.app');
            expect(user.countryCode).toBe('co');

            // Duplicate registration throws
            await expect(
                repo.registrar({
                    nombre: 'Andres Fake',
                    alias: 'AndresFake',
                    email: ' ANDRES@bandaro.app ',
                    avatar: 'av-2',
                    nacionalidad: 'Colombia',
                    password: 'password',
                })
            ).rejects.toThrow('Ya existe un usuario con este correo.');
        });

        it('authenticates user with valid credentials and creates session', async () => {
            const repo = new FileSystemAuthRepository();
            await repo.registrar({
                nombre: 'Carlos',
                alias: 'Charlie',
                email: 'carlos@bandaro.app',
                avatar: 'av-3',
                nacionalidad: 'Colombia',
                password: 'correct-password',
            });

            const session = await repo.login('carlos@bandaro.app', 'correct-password');
            expect(session.userId).toBeDefined();
            expect(session.accessToken).toBeDefined();
            expect(session.refreshToken).toBeDefined();

            // Wrong password throws
            await expect(
                repo.login('carlos@bandaro.app', 'wrong-password')
            ).rejects.toThrow('Credenciales invalidas.');

            // Wrong email throws
            await expect(
                repo.login('nobody@bandaro.app', 'pass')
            ).rejects.toThrow('Credenciales invalidas.');
        });

        it('manages current session lifecycle: get, logout, and refresh', async () => {
            const repo = new FileSystemAuthRepository();
            expect(await repo.obtenerSessionActual()).toBeNull();

            const user = await repo.registrar({
                nombre: 'Session Test',
                alias: 'SessUser',
                email: 'session@bandaro.app',
                avatar: 'av-1',
                nacionalidad: 'Colombia',
                password: 'pass',
            });

            const session = await repo.login('session@bandaro.app', 'pass');
            expect(await repo.obtenerSessionActual()).toEqual(session);

            // Refreshes session
            const newSession = await repo.refrescarSession(session.refreshToken);
            expect(newSession.userId).toBe(user.id);
            expect(newSession.accessToken).toBeDefined();

            // Refresh with invalid token throws
            await expect(repo.refrescarSession('invalid-refresh-token')).rejects.toThrow(
                'Refresh token invalido.'
            );

            // Logout clears session
            await repo.logout();
            expect(await repo.obtenerSessionActual()).toBeNull();

            // Refresh when no active session throws
            await expect(repo.refrescarSession('token')).rejects.toThrow('No hay sesion activa.');
        });

        it('fetches and updates user profile', async () => {
            const repo = new FileSystemAuthRepository();
            const user = await repo.registrar({
                nombre: 'Initial Name',
                alias: 'InitialAlias',
                email: 'update@bandaro.app',
                avatar: 'av-init',
                nacionalidad: 'Colombia',
                password: 'pass',
            });

            const fetched = await repo.obtenerUserPorId(user.id);
            expect(fetched?.alias).toBe('InitialAlias');
            expect(await repo.obtenerUserPorId('missing-id')).toBeNull();

            const updated = await repo.actualizarPerfil(user.id, {
                nombre: 'Updated Name',
                alias: 'NewAlias',
                nacionalidad: 'Mexico',
                countryCode: 'mx',
            });

            expect(updated.nombre).toBe('Updated Name');
            expect(updated.alias).toBe('NewAlias');
            expect(updated.countryCode).toBe('mx');

            // Updating non-existent user throws
            await expect(
                repo.actualizarPerfil('missing-id', { nombre: 'Nobody' })
            ).rejects.toThrow('User no encontrado.');
        });
    });
});
