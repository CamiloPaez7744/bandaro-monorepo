import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { mockApiFetch } = vi.hoisted(() => {
    return { mockApiFetch: vi.fn() };
});

vi.mock('../security/cryptoClient', () => ({
    apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

import { ApiAuthRepository } from '../repositories/ApiAuthRepository';
import { ApiSnapshotRepository } from '../repositories/ApiSnapshotRepository';

describe('Infrastructure: API Repositories', () => {
    beforeEach(async () => {
        mockApiFetch.mockReset();
        vi.clearAllMocks();
        await AsyncStorage.clear();
    });

    describe('ApiAuthRepository', () => {
        it('registers a user via backend API and caches session', async () => {
            const backendUser = {
                id: 'u-123',
                name: 'Mario',
                alias: 'SuperMario',
                email: 'mario@test.com',
                avatarUrl: 'av-mario',
                nationality: 'Colombia',
                countryCode: 'CO',
            };

            mockApiFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    user: backendUser,
                    accessToken: 'jwt-access-123',
                    refreshToken: 'jwt-refresh-123',
                }),
            });

            const repo = new ApiAuthRepository();
            const user = await repo.registrar({
                nombre: 'Mario',
                alias: 'SuperMario',
                email: 'mario@test.com',
                avatar: 'av-mario',
                nacionalidad: 'Colombia',
                countryCode: 'CO',
                password: 'password123',
            });

            expect(user.id).toBe('u-123');
            expect(user.nombre).toBe('Mario');

            const session = await repo.obtenerSessionActual();
            expect(session?.accessToken).toBe('jwt-access-123');
        });

        it('throws error when registration fails with error payload', async () => {
            mockApiFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'El email ya está registrado' }),
            });

            const repo = new ApiAuthRepository();
            await expect(
                repo.registrar({
                    nombre: 'Test',
                    alias: 'T',
                    email: 'dup@test.com',
                    avatar: 'av',
                    nacionalidad: 'CO',
                    password: 'pass',
                })
            ).rejects.toThrow('El email ya está registrado');
        });

        it('logs in user via backend API, stores tokens and user cache', async () => {
            const backendUser = {
                id: 'u-login',
                name: 'Login User',
                alias: 'Loggy',
                email: 'login@test.com',
                avatarUrl: 'av-log',
                nationality: 'Colombia',
                countryCode: 'CO',
            };

            mockApiFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    user: backendUser,
                    accessToken: 'access-tok',
                    refreshToken: 'refresh-tok',
                }),
            });

            const repo = new ApiAuthRepository();
            const session = await repo.login('login@test.com', 'secret');

            expect(session.accessToken).toBe('access-tok');
            expect(session.userId).toBe('u-login');

            const cachedUser = await repo.obtenerUserPorId('u-login');
            expect(cachedUser?.alias).toBe('Loggy');
        });

        it('throws error when login fails with invalid credentials', async () => {
            mockApiFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Credenciales inválidas' }),
            });

            const repo = new ApiAuthRepository();
            await expect(repo.login('a@b.com', 'badpass')).rejects.toThrow('Credenciales inválidas');
        });

        it('refreshes session via /auth/refresh and updates storage', async () => {
            mockApiFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    accessToken: 'new-access-token',
                    refreshToken: 'new-refresh-token',
                }),
            });

            // Set initial session
            await AsyncStorage.setItem(
                '@billar/auth/session',
                JSON.stringify({
                    userId: 'u-ref',
                    accessToken: 'old-access',
                    refreshToken: 'old-refresh',
                    accessExpiresAt: Date.now() + 1000,
                    refreshExpiresAt: Date.now() + 100000,
                })
            );

            const repo = new ApiAuthRepository();
            const refreshed = await repo.refrescarSession('old-refresh');

            expect(refreshed.accessToken).toBe('new-access-token');
            expect(refreshed.refreshToken).toBe('new-refresh-token');
        });

        it('clears storage on logout', async () => {
            await AsyncStorage.setItem(
                '@billar/auth/session',
                JSON.stringify({ refreshToken: 'ref-logout-token' })
            );
            mockApiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

            const repo = new ApiAuthRepository();
            await repo.logout();

            expect(mockApiFetch).toHaveBeenCalledWith(
                '/auth/logout',
                expect.objectContaining({ method: 'POST' })
            );
            expect(await repo.obtenerSessionActual()).toBeNull();
        });

        it('handles OAuth login for Google and Microsoft', async () => {
            const oauthUser = {
                id: 'u-oauth',
                name: 'OAuth User',
                alias: 'OAuthUser',
                email: 'oauth@test.com',
                avatarUrl: 'av-oauth',
                nationality: 'Colombia',
                countryCode: 'CO',
            };

            mockApiFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    user: oauthUser,
                    accessToken: 'oauth-access',
                    refreshToken: 'oauth-refresh',
                }),
            });

            const repo = new ApiAuthRepository();
            const googleSession = await repo.loginWithGoogle({ token: 'goog-token' });
            expect(googleSession.accessToken).toBe('oauth-access');

            const msSession = await repo.loginWithMicrosoft({ token: 'ms-token' });
            expect(msSession.accessToken).toBe('oauth-access');
        });

        it('fetches profile from backend or falls back to cache, and updates profile', async () => {
            const repo = new ApiAuthRepository();

            // When /auth/me returns 200
            mockApiFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    user: {
                        id: 'u-live',
                        name: 'Live User',
                        alias: 'Liver',
                        nationality: 'Colombia',
                        countryCode: 'co',
                        avatarUrl: 'av-live',
                        email: 'live@test.com',
                        currentStreak: 5,
                        maxStreak: 12,
                        totalXp: 400,
                        accuracyAvg: 75,
                        tier: 'pro',
                    },
                }),
            });

            const liveUser = await repo.obtenerUserPorId('u-live');
            expect(liveUser?.id).toBe('u-live');
            expect(liveUser?.totalXp).toBe(400);

            // Update profile
            const updated = await repo.actualizarPerfil('u-live', {
                nombre: 'Live User Edited',
                alias: 'LiverKing',
                avatar: 'av-updated',
            });
            expect(updated.nombre).toBe('Live User Edited');
            expect(updated.alias).toBe('LiverKing');
            expect(updated.avatar).toBe('av-updated');

            // Fallback when /auth/me throws network error
            mockApiFetch.mockRejectedValueOnce(new Error('Network down'));
            const cachedUser = await repo.obtenerUserPorId('u-live');
            expect(cachedUser?.nombre).toBe('Live User Edited');
        });
    });

    describe('ApiSnapshotRepository', () => {
        it('submits snapshot image and corners to vision backend endpoint', async () => {
            const fakeResponse = {
                snapshotId: 'snap-vis-1',
                balls: [
                    { label: 'white', x: 0.1, y: 0.2 },
                    { label: 'yellow', x: 0.3, y: 0.4 },
                    { label: 'red', x: 0.5, y: 0.6 },
                ],
                topDownImage: 'data:image/jpeg;base64,...',
                detectionMethod: 'cv_contour',
                detectedCorners: [{ x: 0, y: 0 }],
            };

            const mockFetch = vi.fn().mockImplementation((url: string) => {
                if (url.includes('blob.jpg')) {
                    return Promise.resolve({
                        blob: async () => new Blob(['fake-image-bytes']),
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => fakeResponse,
                });
            });
            globalThis.fetch = mockFetch as any;

            const repo = new ApiSnapshotRepository();
            const snapshot = await repo.submit('file:///img.jpg', [{ x: 0, y: 0 }]);

            expect(snapshot.id).toBe('snap-vis-1');
            expect(snapshot.balls).toHaveLength(3);
            expect(snapshot.balls[0].label).toBe('white');

            const details = await repo.submitWithDetails('https://storage.billar/blob.jpg', [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 0, y: 1 },
            ]);
            expect(details.detectionMethod).toBe('cv_contour');
            expect(details.snapshotId).toBe('snap-vis-1');
        });

        it('throws error when snapshot upload returns error response', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 422,
                json: async () => ({ error: 'No se detectaron 3 bolas' }),
            });
            globalThis.fetch = mockFetch as any;

            const repo = new ApiSnapshotRepository();
            await expect(repo.submit('file:///bad.jpg')).rejects.toThrow('No se detectaron 3 bolas');
        });

        it('fetches snapshot by id and handles 404', async () => {
            const mockFetch = vi.fn().mockImplementation((url: string) => {
                if (url.includes('not-found')) {
                    return Promise.resolve({ ok: false, status: 404 });
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        snapshotId: 'snap-found',
                        balls: [{ label: 'white', x: 0.2, y: 0.4 }],
                        createdAt: '2026-10-22T00:00:00Z',
                    }),
                });
            });
            globalThis.fetch = mockFetch as any;

            const repo = new ApiSnapshotRepository();
            const found = await repo.getById('snap-found');
            expect(found?.id).toBe('snap-found');
            expect(found?.balls).toHaveLength(1);

            const notFound = await repo.getById('not-found');
            expect(notFound).toBeNull();
        });
    });
});
