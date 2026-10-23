import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the db module
vi.mock('../../db/index.js', () => {
    return {
        db: {
            execute: vi.fn(),
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    };
});

import { createHmac } from 'node:crypto';
import { db } from '../../db/index.js';
import { shotsRouter } from '../shots.js';
import { authRouter } from '../auth.js';

function createValidToken(userId: string = 'user-123') {
    const secret = 'bandaro-super-secret-jwt-key-2026';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ userId, email: 'u@test.com', alias: 'TestUser', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

describe('Shots Router', () => {
    const app = express();
    app.use(express.json());
    app.use('/shots', shotsRouter);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /shots/catalog', () => {
        it('returns guest catalog limited to GUEST_SAMPLE_LIMIT without auth', async () => {
            const mockRows = Array.from({ length: 15 }, (_, i) => ({
                id: i + 1,
                external_id: i + 1,
                category: '3_bandas',
                is_premium: i >= 5,
                has_analysis: true,
            }));

            (db.execute as any)
                .mockResolvedValueOnce({ rows: mockRows.slice(0, 12) })
                .mockResolvedValueOnce({ rows: [{ count: '15' }] })
                .mockResolvedValueOnce({ rows: [{ count: '50' }] });

            const res = await request(app).get('/shots/catalog');

            expect(res.status).toBe(200);
            expect(res.body.isGuestPreview).toBe(true);
            expect(res.body.previewLimit).toBe(12);
            expect(res.body.shots).toHaveLength(12);
            expect(res.body.shots[0].is_locked).toBe(false);
            expect(res.body.shots[5].is_locked).toBe(true);
            expect(res.body.shots[5].requires_premium).toBe(true);
        });

        it('filters catalog by category, player, search, onlyFavorites and handles premium user', async () => {
            const mockRows = [
                {
                    id: 1,
                    external_id: 1,
                    category: 'pase_bola',
                    player_first_name: 'Dick',
                    player_last_name: 'Jaspers',
                    is_premium: true,
                },
            ];

            // Mock user query for premium user
            (db.select as any).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{ tier: 'premium' }]),
                    }),
                }),
            });

            (db.execute as any)
                .mockResolvedValueOnce({ rows: mockRows })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '50' }] });

            const token = createValidToken('usr-prem');
            const res = await request(app)
                .get('/shots/catalog')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    category: 'pase_bola',
                    player: 'Jaspers',
                    search: 'cushion',
                    onlyFavorites: 'true',
                    limit: '20',
                    offset: '0',
                });

            expect(res.status).toBe(200);
            expect(res.body.shots).toHaveLength(1);
            expect(res.body.userTier).toBe('premium');
            expect(db.execute).toHaveBeenCalledTimes(3);
        });

        it('falls back to free tier when user db query throws error', async () => {
            const token = createValidToken('usr-err');
            (db.select as any).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockRejectedValue(new Error('User tier query fail')),
                    }),
                }),
            });

            (db.execute as any)
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '50' }] });

            const res = await request(app)
                .get('/shots/catalog')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.userTier).toBe('free');
        });

        it('handles database error in catalog endpoint', async () => {
            (db.execute as any).mockRejectedValueOnce(new Error('DB failure'));

            const res = await request(app).get('/shots/catalog');
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Internal server error');
        });
    });

    describe('GET /shots/catalog/categories', () => {
        it('returns categories with counts', async () => {
            (db.execute as any).mockResolvedValueOnce({
                rows: [
                    { category: '3_bandas', count: '25' },
                    { category: 'bricol', count: '15' },
                ],
            });

            const res = await request(app).get('/shots/catalog/categories');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([
                { category: '3_bandas', count: '25' },
                { category: 'bricol', count: '15' },
            ]);
        });

        it('handles error in categories endpoint', async () => {
            (db.execute as any).mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app).get('/shots/catalog/categories');
            expect(res.status).toBe(500);
        });
    });

    describe('GET /shots/favorites', () => {
        it('returns favorite shot IDs for given user', async () => {
            (db.execute as any).mockResolvedValueOnce({
                rows: [{ shot_id: '5' }, { shot_id: '12' }],
            });

            const res = await request(app).get('/shots/favorites').query({ userId: 'u1' });
            expect(res.status).toBe(200);
            expect(res.body.favoriteShotIds).toEqual([5, 12]);
        });

        it('handles error in favorites endpoint', async () => {
            (db.execute as any).mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app).get('/shots/favorites');
            expect(res.status).toBe(500);
        });
    });

    describe('POST /shots/favorites/toggle', () => {
        it('requires shotId', async () => {
            const res = await request(app).post('/shots/favorites/toggle').send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('shotId is required');
        });

        it('inserts favorite when not existing', async () => {
            (db.execute as any)
                .mockResolvedValueOnce({ rows: [] }) // not existing
                .mockResolvedValueOnce({ rows: [] }); // insert

            const res = await request(app)
                .post('/shots/favorites/toggle')
                .send({ shotId: 7, userId: 'u1' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, isFavorite: true, shotId: 7 });
        });

        it('deletes favorite when already existing', async () => {
            (db.execute as any)
                .mockResolvedValueOnce({ rows: [{ id: 'fav-1' }] }) // exists
                .mockResolvedValueOnce({ rows: [] }); // delete

            const res = await request(app)
                .post('/shots/favorites/toggle')
                .send({ shotId: 7, userId: 'u1' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, isFavorite: false, shotId: 7 });
        });

        it('handles error in toggle favorite endpoint', async () => {
            (db.execute as any).mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app)
                .post('/shots/favorites/toggle')
                .send({ shotId: 7 });
            expect(res.status).toBe(500);
        });
    });

    describe('GET /shots/catalog/:id', () => {
        it('returns shot by external id when found', async () => {
            (db.execute as any).mockResolvedValueOnce({
                rows: [{ id: 1, external_id: 1, name_es: 'Carambola clásica' }],
            });

            const res = await request(app).get('/shots/catalog/1');
            expect(res.status).toBe(200);
            expect(res.body.name_es).toBe('Carambola clásica');
        });

        it('returns 404 when shot is not found', async () => {
            (db.execute as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/shots/catalog/99999');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Shot not found');
        });

        it('handles error in catalog/:id endpoint', async () => {
            (db.execute as any).mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app).get('/shots/catalog/1');
            expect(res.status).toBe(500);
        });
    });
});
