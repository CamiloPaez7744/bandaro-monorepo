import { describe, expect, it, vi } from 'vitest';
import { container } from '../container';
import { AVATAR_OPTIONS, getAvatarOption, getAvatarSource } from '@/src/constants/avatars';
import { FLAG_OPTIONS, getFlagByCode } from '@/src/constants/flags';
import { MESSAGES, detectSystemLanguage, interpolate } from '@/src/i18n/messages';

describe('Presentation Container, Constants & i18n', () => {
    describe('Dependency Injection Container', () => {
        it('initializes all application use cases and repositories', () => {
            expect(container.crearMatch).toBeDefined();
            expect(container.registrarEntry).toBeDefined();
            expect(container.deshacerUltimaEntry).toBeDefined();
            expect(container.finalizarMatch).toBeDefined();
            expect(container.obtenerHistory).toBeDefined();
            expect(container.obtenerMatch).toBeDefined();
            expect(container.obtenerStatistics).toBeDefined();
            expect(container.submitTableSnapshot).toBeDefined();
            expect(container.registerUser).toBeDefined();
            expect(container.loginUser).toBeDefined();
            expect(container.refreshSession).toBeDefined();
            expect(container.getCurrentSession).toBeDefined();
            expect(container.logoutUser).toBeDefined();
            expect(container.getUserById).toBeDefined();
            expect(container.updateUserProfile).toBeDefined();
            expect(container.authRepository).toBeDefined();
        });

        it('delegates loginWithGoogle and loginWithMicrosoft to authRepository', async () => {
            const spyGoogle = vi
                .spyOn(container.authRepository, 'loginWithGoogle')
                .mockResolvedValueOnce({
                    userId: 'u-g',
                    accessToken: 'tok-g',
                    refreshToken: 'ref-g',
                    accessExpiresAt: 1,
                    refreshExpiresAt: 2,
                });

            const spyMicrosoft = vi
                .spyOn(container.authRepository, 'loginWithMicrosoft')
                .mockResolvedValueOnce({
                    userId: 'u-ms',
                    accessToken: 'tok-ms',
                    refreshToken: 'ref-ms',
                    accessExpiresAt: 1,
                    refreshExpiresAt: 2,
                });

            const resG = await container.loginWithGoogle({ token: '123' });
            expect(resG.accessToken).toBe('tok-g');
            expect(spyGoogle).toHaveBeenCalledWith({ token: '123' });

            const resMS = await container.loginWithMicrosoft({ token: '456' });
            expect(resMS.accessToken).toBe('tok-ms');
            expect(spyMicrosoft).toHaveBeenCalledWith({ token: '456' });
        });
    });

    describe('Avatar Constants & Helpers', () => {
        it('provides avatar options list and lookup helper', () => {
            expect(AVATAR_OPTIONS.length).toBeGreaterThanOrEqual(10);
            expect(getAvatarOption('avatar-01')?.label).toBe('Avatar 1');
            expect(getAvatarOption('non-existent')).toBeUndefined();
            expect(getAvatarOption(undefined)).toBeUndefined();
        });

        it('returns correct avatar source for local keys, urls, and defaults', () => {
            // Default when key is undefined
            const defaultSource = getAvatarSource();
            expect(defaultSource).toBeDefined();

            // Remote URL
            const urlSource = getAvatarSource('https://example.com/photo.jpg');
            expect(urlSource).toEqual({ uri: 'https://example.com/photo.jpg' });

            // Http URL
            const httpSource = getAvatarSource('http://example.com/photo.png');
            expect(httpSource).toEqual({ uri: 'http://example.com/photo.png' });

            // Known avatar key
            const knownSource = getAvatarSource('avatar-02');
            expect(knownSource).toBeDefined();

            // Unknown local key fallback
            const fallbackSource = getAvatarSource('avatar-999');
            expect(fallbackSource).toBeDefined();
        });
    });

    describe('Flag Options', () => {
        it('provides nationality flag options', () => {
            expect(FLAG_OPTIONS.length).toBeGreaterThan(50);
            const colombia = FLAG_OPTIONS.find((f) => f.code === 'co');
            expect(colombia).toBeDefined();
            expect(colombia?.name).toBe('Colombia');
        });

        it('looks up flag by country code with case insensitivity and handles missing codes', () => {
            expect(getFlagByCode('co')?.name).toBe('Colombia');
            expect(getFlagByCode('CO')?.name).toBe('Colombia');
            expect(getFlagByCode(undefined)).toBeUndefined();
            expect(getFlagByCode('xx')).toBeUndefined();
        });
    });

    describe('i18n Messages', () => {
        it('contains translated messages dictionary with required sections', () => {
            expect(MESSAGES).toBeDefined();
            expect(MESSAGES.es).toBeDefined();
            expect(MESSAGES.en).toBeDefined();
            expect(MESSAGES.es['tabs.home']).toBe('Inicio');
            expect(MESSAGES.en['tabs.home']).toBe('Home');
        });

        it('detects system language and interpolates template strings', () => {
            const lang = detectSystemLanguage();
            expect(['es', 'en']).toContain(lang);

            const interpolated = interpolate('Hola {name}, tienes {points} carambolas', {
                name: 'Daniel',
                points: 30,
            });
            expect(interpolated).toBe('Hola Daniel, tienes 30 carambolas');

            expect(interpolate('Plain string')).toBe('Plain string');
            expect(interpolate('Missing {foo}', {})).toBe('Missing {foo}');
        });
    });
});
