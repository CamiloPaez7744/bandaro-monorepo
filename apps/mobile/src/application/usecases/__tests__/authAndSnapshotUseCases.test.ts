import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RegisterUser } from '../RegisterUser';
import { LoginUser } from '../LoginUser';
import { LogoutUser } from '../LogoutUser';
import { GetCurrentSession } from '../GetCurrentSession';
import { RefreshSession } from '../RefreshSession';
import { GetUserById } from '../GetUserById';
import { UpdateUserProfile } from '../UpdateUserProfile';
import { SubmitTableSnapshot } from '../SubmitTableSnapshot';
import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';
import type { ISnapshotRepository } from '@/src/domain/repositories/ISnapshotRepository';
import type { User } from '@/src/domain/entities/User';
import type { Session } from '@/src/domain/entities/Session';

describe('Application Layer: Auth & Snapshot Use Cases', () => {
    let mockAuthRepo: IAuthRepository;
    let mockSnapshotRepo: ISnapshotRepository;
    let mockUser: User;
    let mockSession: Session;

    beforeEach(() => {
        mockUser = {
            id: 'u-100',
            nombre: 'Daniel Morales',
            alias: 'Dani',
            email: 'daniel@bandaro.app',
            avatar: 'av-1',
            nacionalidad: 'Colombia',
            countryCode: 'co',
            passwordHash: 'hash-xyz',
            createdAt: new Date().toISOString(),
        };

        mockSession = {
            userId: 'u-100',
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            accessExpiresAt: Date.now() + 3600000,
            refreshExpiresAt: Date.now() + 86400000,
        };

        mockAuthRepo = {
            registrar: vi.fn(async () => mockUser),
            login: vi.fn(async () => mockSession),
            logout: vi.fn(async () => {}),
            obtenerSessionActual: vi.fn(async () => mockSession),
            refrescarSession: vi.fn(async () => ({ ...mockSession, accessToken: 'new-access' })),
            obtenerUserPorId: vi.fn(async (id: string) => (id === 'u-100' ? mockUser : null)),
            actualizarPerfil: vi.fn(async (_id: string, input: any) => ({ ...mockUser, ...input })),
        };

        mockSnapshotRepo = {
            submit: vi.fn(async (_uri: string, _corners?: any) => ({
                id: 'snap-99',
                capturedAt: new Date().toISOString(),
                balls: [
                    { label: 'white', x: 0.2, y: 0.3 },
                    { label: 'yellow', x: 0.5, y: 0.5 },
                    { label: 'red', x: 0.8, y: 0.7 },
                ],
            })),
        };
    });

    describe('RegisterUser', () => {
        it('registers user through repository', async () => {
            const useCase = new RegisterUser(mockAuthRepo);
            const user = await useCase.execute({
                nombre: 'Daniel Morales',
                alias: 'Dani',
                email: 'daniel@bandaro.app',
                avatar: 'av-1',
                nacionalidad: 'Colombia',
                countryCode: 'co',
                password: 'password123',
            });

            expect(user).toEqual(mockUser);
            expect(mockAuthRepo.registrar).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'daniel@bandaro.app' })
            );
        });
        it('validates required fields, countryCode, email format and password length', async () => {
            const useCase = new RegisterUser(mockAuthRepo);
            const baseDto = {
                nombre: 'Daniel',
                alias: 'Dani',
                nacionalidad: 'Colombia',
                countryCode: 'co',
                email: 'daniel@bandaro.app',
                avatar: 'av-1',
                password: 'password123',
            };

            await expect(useCase.execute({ ...baseDto, nombre: '' })).rejects.toThrow('Completa nombre, alias y nacionalidad.');
            await expect(useCase.execute({ ...baseDto, countryCode: '' })).rejects.toThrow('Selecciona una bandera de nacionalidad.');
            await expect(useCase.execute({ ...baseDto, email: 'bad-email' })).rejects.toThrow('Correo invalido.');
            await expect(useCase.execute({ ...baseDto, password: '123' })).rejects.toThrow('La clave debe tener al menos 6 caracteres.');
        });
    });

    describe('LoginUser & LogoutUser', () => {
        it('logs in user through repository and returns session', async () => {
            const loginUseCase = new LoginUser(mockAuthRepo);
            const session = await loginUseCase.execute({
                email: 'daniel@bandaro.app',
                password: 'password123',
            });

            expect(session).toEqual(mockSession);
            expect(mockAuthRepo.login).toHaveBeenCalledWith('daniel@bandaro.app', 'password123');
        });

        it('throws error when email or password is blank', async () => {
            const loginUseCase = new LoginUser(mockAuthRepo);
            await expect(loginUseCase.execute({ email: '', password: '123' })).rejects.toThrow('Ingresa correo y clave.');
            await expect(loginUseCase.execute({ email: 'a@b.com', password: '' })).rejects.toThrow('Ingresa correo y clave.');
        });

        it('logs out user through repository', async () => {
            const logoutUseCase = new LogoutUser(mockAuthRepo);
            await logoutUseCase.execute();
            expect(mockAuthRepo.logout).toHaveBeenCalledTimes(1);
        });
    });

    describe('GetCurrentSession & RefreshSession', () => {
        it('retrieves active session', async () => {
            const useCase = new GetCurrentSession(mockAuthRepo);
            const session = await useCase.execute();
            expect(session).toEqual(mockSession);
            expect(mockAuthRepo.obtenerSessionActual).toHaveBeenCalledTimes(1);
        });

        it('refreshes session with provided refresh token', async () => {
            const useCase = new RefreshSession(mockAuthRepo);
            const refreshed = await useCase.execute('mock-refresh-token');
            expect(refreshed.accessToken).toBe('new-access');
            expect(mockAuthRepo.refrescarSession).toHaveBeenCalledWith('mock-refresh-token');
        });

        it('throws error when refresh token is empty', async () => {
            const useCase = new RefreshSession(mockAuthRepo);
            await expect(useCase.execute('')).rejects.toThrow('Refresh token requerido.');
        });
    });

    describe('GetUserById & UpdateUserProfile', () => {
        it('fetches user profile by id', async () => {
            const useCase = new GetUserById(mockAuthRepo);
            const user = await useCase.execute('u-100');
            expect(user).toEqual(mockUser);

            const missing = await useCase.execute('u-absent');
            expect(missing).toBeNull();
        });

        it('updates user profile through repository', async () => {
            const useCase = new UpdateUserProfile(mockAuthRepo);
            const updated = await useCase.execute('u-100', {
                alias: 'ElTigre',
                nacionalidad: 'Colombia',
            });

            expect(updated.alias).toBe('ElTigre');
            expect(mockAuthRepo.actualizarPerfil).toHaveBeenCalledWith('u-100', {
                alias: 'ElTigre',
                nacionalidad: 'Colombia',
            });
        });

        it('throws error when userId is missing', async () => {
            const useCase = new UpdateUserProfile(mockAuthRepo);
            await expect(useCase.execute('', { alias: 'Test' })).rejects.toThrow('User invalido.');
        });
    });

    describe('SubmitTableSnapshot', () => {
        it('submits snapshot image and returns detected balls', async () => {
            const useCase = new SubmitTableSnapshot(mockSnapshotRepo);
            const snapshot = await useCase.execute({ imageUri: 'file:///data/table.jpg' });
            expect(snapshot.id).toBe('snap-99');
            expect(snapshot.balls).toHaveLength(3);
            expect(mockSnapshotRepo.submit).toHaveBeenCalledWith('file:///data/table.jpg');
        });

        it('throws error when imageUri is missing', async () => {
            const useCase = new SubmitTableSnapshot(mockSnapshotRepo);
            await expect(useCase.execute({ imageUri: '' })).rejects.toThrow('Se requiere una imagen de la mesa.');
        });
    });
});
