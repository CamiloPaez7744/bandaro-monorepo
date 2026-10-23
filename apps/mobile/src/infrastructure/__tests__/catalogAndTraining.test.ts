import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    fetchCatalog,
    fetchShotDetail,
    fetchCategories,
    toggleFavoriteShot,
    fetchFavoriteShotIds,
} from '../catalog/catalogApi';
import {
    adaptCatalogShot,
    adaptCatalogShotList,
    getLocalizedCategoryName,
    getLocalizedShot,
    getShotAimVector,
    thicknessToEffect,
    railSpeedToVelocity,
} from '../catalog/shotAdapter';
import {
    getOrCreateGuestDeviceId,
    saveTrainingSessionToBackend,
    fetchSmartReviewPositions,
    claimGuestTrainingData,
    fetchTrainingSessions,
} from '../training/trainingApi';

describe('Infrastructure: Catalog & Training APIs & Adapters', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        await AsyncStorage.clear();
    });

    describe('Catalog API', () => {
        it('fetches catalog with query parameters and auth headers', async () => {
            const fakeData = {
                shots: [{ id: 1, external_id: 1, category: 'draw' }],
                total: 1,
                limit: 10,
                offset: 0,
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => fakeData,
            });
            globalThis.fetch = mockFetch as any;

            const res = await fetchCatalog({
                category: 'draw',
                player: 'Jaspers',
                search: 'carom',
                onlyFavorites: true,
                userId: 'u1',
                limit: 10,
                offset: 0,
                accessToken: 'my-token',
            });

            expect(res.shots).toHaveLength(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('category=draw&player=Jaspers&search=carom&onlyFavorites=true'),
                expect.objectContaining({
                    headers: { Authorization: 'Bearer my-token' },
                })
            );
        });

        it('throws on non-ok HTTP response in fetchCatalog', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            }) as any;

            await expect(fetchCatalog()).rejects.toThrow('HTTP 500');
        });

        it('fetches shot detail and categories', async () => {
            globalThis.fetch = vi
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 5, external_id: 5, category: 'draw' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [{ category: 'draw', count: '10' }],
                });

            const shot = await fetchShotDetail(5, 'u-player');
            expect(shot.external_id).toBe(5);

            const categories = await fetchCategories();
            expect(categories).toHaveLength(1);
        });

        it('toggles and fetches favorite shots', async () => {
            globalThis.fetch = vi
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, isFavorite: true, shotId: 9 }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ favoriteShotIds: [9, 14] }),
                });

            const toggle = await toggleFavoriteShot(9, 'u-fav');
            expect(toggle.isFavorite).toBe(true);

            const favIds = await fetchFavoriteShotIds('u-fav');
            expect(favIds).toEqual([9, 14]);
        });
    });

    describe('Shot Adapter', () => {
        it('adapts raw catalog shot coordinates, trajectories, and spin calibration', () => {
            const rawShot = {
                id: 1,
                external_id: 101,
                category: 'draw',
                name_es: 'Cajón clásico',
                name_ko: '뒤돌리기',
                description: 'Tiro de retroceso',
                tips: 'Toma 1/2 bola',
                player_first_name: 'Dick',
                player_last_name: 'Jaspers',
                player_nationality: 'NL',
                club_name: 'Royal Club',
                cue_ball_x: '250',
                cue_ball_y: '125',
                object_ball_1_x: '300',
                object_ball_1_y: '100',
                object_ball_2_x: '400',
                object_ball_2_y: '150',
                ball_thickness: '0.5',
                rail_speed: 3,
                power_level: 4,
                effect_x: '-1.5',
                effect_y: '-0.5',
                cue_ball_trajectory: '0|142|71|1|170|50|2|220|100',
                object_ball_1_trajectory: '',
                object_ball_2_trajectory: '',
                is_difficult: true,
                is_position: true,
                is_defense: false,
                is_avoid_kiss: false,
                is_premium: true,
                is_locked: false,
                youtube_url: 'https://youtube.com/watch?v=123',
                is_favorite: true,
            };

            const adapted = adaptCatalogShot(rawShot);
            expect(adapted.id).toBe(101);
            expect(adapted.categoryName).toBe('Cajones (Retros)');
            expect(adapted.white).toBeDefined();
            expect(adapted.yellow).toBeDefined();
            expect(adapted.red).toBeDefined();
            expect(adapted.cueBallTrajectory).toHaveLength(3);
            expect(adapted.isDifficult).toBe(true);
            expect(adapted.isPosition).toBe(true);
            expect(adapted.isPremium).toBe(true);
            expect(adapted.isFavorite).toBe(true);
        });

        it('generates synthetic trajectory when raw trajectory is empty or too short', () => {
            const rawWithoutTrajectory = {
                id: 2,
                external_id: 202,
                category: 'cross_table',
                name_es: 'Pase corto',
                cue_ball_x: '100',
                cue_ball_y: '100',
                object_ball_1_x: '200',
                object_ball_1_y: '100',
                object_ball_2_x: '300',
                object_ball_2_y: '200',
                ball_thickness: '0.5',
                rail_speed: 2,
                effect_x: '0',
                effect_y: '0',
                cue_ball_trajectory: '',
            };

            const adapted = adaptCatalogShot(rawWithoutTrajectory);
            expect(adapted.cueBallTrajectory.length).toBeGreaterThanOrEqual(2);
        });

        it('converts thickness to effect and railSpeed to velocity correctly', () => {
            const effect = thicknessToEffect(6);
            expect(effect.x).toBe(-0.5);
            expect(effect.y).toBe(0);
            expect(effect.magnitude).toBe(0.5);

            expect(railSpeedToVelocity(0)).toBe(1.2);
            expect(railSpeedToVelocity(3)).toBe(5.2);
            expect(railSpeedToVelocity(5)).toBe(7.5);
            expect(railSpeedToVelocity(99 as any)).toBe(3.5);
        });

        it('localizes categories and shots for ES, EN, and KO languages', () => {
            expect(getLocalizedCategoryName('draw', 'es')).toBe('Cajones (Retros)');
            expect(getLocalizedCategoryName('draw', 'en')).toBe('Draw Shot');
            expect(getLocalizedCategoryName('draw', 'ko')).toBe('뒤돌리기');
            expect(getLocalizedCategoryName('unknown_category' as any, 'en')).toBe('unknown_category');

            const fakeShot: any = {
                category: 'draw',
                categoryName: 'Cajones (Retros)',
                nameEs: 'Tiro Retro',
                nameEn: 'Draw Shot Name',
                nameKo: '뒤돌리기 이름',
                description: 'Desc default',
                descriptionEs: 'Desc ES',
                descriptionEn: 'Desc EN',
                descriptionKo: 'Desc KO',
                tips: 'Tips default',
                tipsEs: 'Tips ES',
                tipsEn: 'Tips EN',
                tipsKo: 'Tips KO',
            };

            const esShot = getLocalizedShot(fakeShot, 'es');
            expect(esShot.description).toBe('Desc ES');
            expect(esShot.tips).toBe('Tips ES');

            const enShot = getLocalizedShot(fakeShot, 'en');
            expect(enShot.description).toBe('Desc EN');
            expect(enShot.tips).toBe('Tips EN');

            const koShot = getLocalizedShot(fakeShot, 'ko');
            expect(koShot.description).toBe('Desc KO');
            expect(koShot.tips).toBe('Tips KO');
        });

        it('computes shot aim vectors from cue stick, cue trajectory, or ball centers', () => {
            // From cue stick trajectory
            const aimFromStick = getShotAimVector({
                white: { x: 50, y: 50 },
                yellow: { x: 100, y: 100 },
                cueStickTrajectory: [
                    { x: 30, y: 30 },
                    { x: 45, y: 45 },
                ],
            });
            expect(aimFromStick.x).toBeCloseTo(Math.SQRT1_2, 2);
            expect(aimFromStick.y).toBeCloseTo(Math.SQRT1_2, 2);

            // From cue ball trajectory
            const aimFromCueBall = getShotAimVector({
                white: { x: 50, y: 50 },
                yellow: { x: 100, y: 100 },
                cueBallTrajectory: [
                    { x: 50, y: 50 },
                    { x: 50, y: 60 },
                ],
            });
            expect(aimFromCueBall.x).toBeCloseTo(0, 2);
            expect(aimFromCueBall.y).toBeCloseTo(1, 2);

            // Default from white to yellow
            const aimDefault = getShotAimVector({
                white: { x: 10, y: 20 },
                yellow: { x: 40, y: 20 },
            });
            expect(aimDefault.x).toBeCloseTo(1, 2);
            expect(aimDefault.y).toBeCloseTo(0, 2);

            // White and yellow coincident fallback
            const aimFallback = getShotAimVector({
                white: { x: 10, y: 20 },
                yellow: { x: 10, y: 20 },
            });
            expect(aimFallback.x).toBe(1);
            expect(aimFallback.y).toBe(0);
        });

        it('adapts list of catalog shots via adaptCatalogShotList', () => {
            const list = adaptCatalogShotList([
                {
                    id: 1,
                    external_id: 1,
                    category: 'draw',
                    cue_ball_x: 10,
                    cue_ball_y: 10,
                    object_ball_1_x: 20,
                    object_ball_1_y: 20,
                    object_ball_2_x: 30,
                    object_ball_2_y: 30,
                },
            ]);
            expect(list).toHaveLength(1);
            expect(list[0].id).toBe(1);
        });
    });

    describe('Training API', () => {
        it('generates, persists and retrieves guest device ID', async () => {
            const id1 = await getOrCreateGuestDeviceId();
            expect(id1).toContain('guest_');

            // Second call retrieves cached id
            const id2 = await getOrCreateGuestDeviceId();
            expect(id2).toBe(id1);
        });

        it('saves training session payload to backend and returns response', async () => {
            const mockResponse = {
                success: true,
                sessionId: 'session-train-1',
                xpEarned: 150,
                overallAccuracy: '80.00',
            };

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            }) as any;

            const res = await saveTrainingSessionToBackend(
                {
                    totalTarget: 10,
                    totalHits: 8,
                    accuracy: 80,
                    positionsCount: 1,
                    positions: [],
                },
                'auth-token-123'
            );

            expect(res.success).toBe(true);
            expect(res.sessionId).toBe('session-train-1');
        });

        it('handles non-ok and network errors in saveTrainingSessionToBackend', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                text: async () => 'Invalid payload',
            }) as any;

            const resFail = await saveTrainingSessionToBackend({
                totalTarget: 0,
                totalHits: 0,
                accuracy: 0,
                positionsCount: 0,
                positions: [],
            });

            expect(resFail.success).toBe(false);
            expect(resFail.error).toContain('HTTP 400');

            // Network failure
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection failed')) as any;
            const resNetwork = await saveTrainingSessionToBackend({
                totalTarget: 0,
                totalHits: 0,
                accuracy: 0,
                positionsCount: 0,
                positions: [],
            });

            expect(resNetwork.success).toBe(false);
            expect(resNetwork.error).toContain('Connection failed');
        });

        it('fetches smart review positions and handles errors gracefully', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    positions: [{ id: 'pos-1', name: 'Review 1' }],
                    count: 1,
                }),
            }) as any;

            const res = await fetchSmartReviewPositions('tok', 'dev-1');
            expect(res.count).toBe(1);

            // Error case returns safe fallback
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Fetch failed')) as any;
            const resErr = await fetchSmartReviewPositions();
            expect(resErr.success).toBe(false);
            expect(resErr.positions).toEqual([]);
        });

        it('claims guest training data into user account', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, message: 'Migrated' }),
            }) as any;

            const res = await claimGuestTrainingData('dev-123', 'tok-123');
            expect(res.success).toBe(true);

            // Error case
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Claim error')) as any;
            const resErr = await claimGuestTrainingData('dev-123', 'tok-123');
            expect(resErr.success).toBe(false);
        });

        it('fetches past training sessions', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ sessions: [{ id: 's-1' }, { id: 's-2' }] }),
            }) as any;

            const sessions = await fetchTrainingSessions('tok', 'u-1');
            expect(sessions).toHaveLength(2);

            // Network error returns empty array
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;
            const empty = await fetchTrainingSessions();
            expect(empty).toEqual([]);
        });
    });
});
