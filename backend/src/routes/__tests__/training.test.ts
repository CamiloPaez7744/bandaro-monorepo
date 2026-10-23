import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHmac } from 'node:crypto';

vi.mock('../../db/index.js', () => {
    return {
        db: {
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            execute: vi.fn(),
        },
    };
});

import { db } from '../../db/index.js';
import { trainingRouter } from '../training.js';
import * as authModule from '../auth.js';

function createValidToken(userId: string = 'user-123') {
    const secret = 'bandaro-super-secret-jwt-key-2026';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ userId, email: 'u@test.com', alias: 'TestUser', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

describe('Training Router', () => {
    const app = express();
    app.use(express.json());
    app.use('/training', trainingRouter);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /training/route', () => {
        it('returns learning route with user live progress and nested levels', async () => {
            const token = createValidToken('u-456');

            // 1. user stats
            // 2. levels
            // 3. nodes
            // 4. positions
            // 5. progressList
            (db.select as any)
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([
                                { currentStreak: 7, totalXp: 850, accuracyAvg: '74.2' },
                            ]),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue([
                            { id: 'lvl-1', name: 'Nivel 1', tag: 'Básico', subtitle: 'Fundamentos', description: 'Intro', color: '#10b981' },
                        ]),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue([
                            { id: 'node-1', levelId: 'lvl-1', dayNumber: 1, title: 'Ataque Corto', defaultStatus: 'active', isBoss: false, xp: 100 },
                        ]),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue([
                            { id: 'pos-1', nodeId: 'node-1', name: 'Tiro 1', category: 'Cushion', whitePos: { x: 10, y: 20 }, yellowPos: { x: 30, y: 40 }, redPos: { x: 50, y: 60 } },
                        ]),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([
                            { nodeId: 'node-1', status: 'completed', stars: 3, completedCount: 1 },
                        ]),
                    }),
                });

            const res = await request(app).get('/training/route').set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.userStats.currentStreak).toBe(7);
            expect(res.body.levels).toHaveLength(1);
            expect(res.body.levels[0].nodes).toHaveLength(1);
            expect(res.body.levels[0].nodes[0].stars).toBe(3);
        });

        it('handles error in route endpoint with 500', async () => {
            (db.select as any).mockImplementation(() => {
                throw new Error('Database disconnected');
            });

            const res = await request(app).get('/training/route');
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Error al obtener la ruta');
        });
    });

    describe('POST /training/node-progress', () => {
        it('returns 400 when nodeId is missing', async () => {
            const res = await request(app).post('/training/node-progress').send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('nodeId es requerido');
        });

        it('saves node progress and unlocks next node', async () => {
            // upsert userNodeProgress
            (db.insert as any).mockReturnValueOnce({
                values: vi.fn().mockReturnValue({
                    onConflictDoUpdate: vi.fn().mockResolvedValue([]),
                }),
            });

            // update users xp
            (db.update as any).mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });

            // select all nodes to find next
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue([
                        { id: 'node-1', orderIndex: 1 },
                        { id: 'node-2', orderIndex: 2 },
                    ]),
                }),
            });

            // insert next node progress onConflictDoNothing
            (db.insert as any).mockReturnValueOnce({
                values: vi.fn().mockReturnValue({
                    onConflictDoNothing: vi.fn().mockResolvedValue([]),
                }),
            });

            const res = await request(app).post('/training/node-progress').send({
                nodeId: 'node-1',
                stars: 3,
                completedCount: 10,
                accuracy: 90,
                xpGained: 150,
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Progreso de estación registrado');
        });

        it('handles error in node-progress endpoint with 500', async () => {
            (db.insert as any).mockImplementation(() => {
                throw new Error('DB write failed');
            });

            const res = await request(app).post('/training/node-progress').send({ nodeId: 'node-1' });
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Error al actualizar el progreso del nodo');
        });
    });

    describe('GET /training/pedagogy', () => {
        it('returns pedagogy modules list', async () => {
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue([
                        { id: 'ped-1', title: 'Willie Hoppe Method', orderIndex: 1 },
                    ]),
                }),
            });

            const res = await request(app).get('/training/pedagogy');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.modules).toHaveLength(1);
        });

        it('handles error in pedagogy endpoint with 500', async () => {
            (db.select as any).mockImplementation(() => {
                throw new Error('DB error');
            });

            const res = await request(app).get('/training/pedagogy');
            expect(res.status).toBe(500);
        });
    });

    describe('POST /training/session', () => {
        it('records training session with drills, mastery, and legacy compatibility', async () => {
            const token = createValidToken('user-master');

            // 1. user tier query for getAuthContext
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{ tier: 'free' }]),
                    }),
                }),
            });

            // 2. insert training_sessions .returning()
            (db.insert as any).mockReturnValueOnce({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([{ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }]),
                }),
            });

            // 3. drill insert
            (db.insert as any).mockReturnValueOnce({
                values: vi.fn().mockResolvedValue([]),
            });

            // 4. check existing mastery (empty -> insert new)
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

            // 5. insert mastery
            (db.insert as any).mockReturnValueOnce({
                values: vi.fn().mockResolvedValue([]),
            });

            // 6. legacy execute
            (db.execute as any).mockResolvedValueOnce({ rows: [] });

            // 7. update user xp
            (db.update as any).mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });

            const res = await request(app)
                .post('/training/session')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    totalTarget: 10,
                    totalHits: 8,
                    durationSeconds: 120,
                    positions: [
                        {
                            id: 'pos-1',
                            target: 10,
                            hits: 8,
                            accuracy: '80.00',
                            perceivedDifficulty: 2,
                        },
                    ],
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.sessionId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
            expect(res.body.overallAccuracy).toBe('80.00');
        });

        it('handles error in training session recording with 500', async () => {
            const spy = vi.spyOn(authModule, 'verifyAccessToken').mockImplementationOnce(() => {
                throw new Error('JWT crash');
            });
            const res = await request(app)
                .post('/training/session')
                .set('Authorization', 'Bearer crash.token.test')
                .send({});
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Error al guardar la sesión');
            spy.mockRestore();
        });
    });

    describe('GET /training/smart-review', () => {
        it('returns message when no user or guest filter is provided', async () => {
            const res = await request(app).get('/training/smart-review');
            expect(res.status).toBe(200);
            expect(res.body.positions).toEqual([]);
            expect(res.body.count).toBe(0);
        });

        it('returns smart review positions for struggling drills', async () => {
            const token = createValidToken('user-review');

            // getAuthContext tier
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{ tier: 'free' }]),
                    }),
                }),
            });

            // mastery rows
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([
                                {
                                    positionId: 'pos-hard',
                                    lifetimeAccuracy: '40.00',
                                    totalAttempts: 10,
                                    totalHits: 4,
                                    masteryStatus: 'struggling',
                                    perceivedDifficultyAvg: '4.5',
                                    nextReviewDue: new Date(),
                                },
                            ]),
                        }),
                    }),
                }),
            });

            // position definitions
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockResolvedValue([
                    {
                        id: 'pos-hard',
                        name: 'Pase de bola contra efecto',
                        category: 'Banda antes',
                        difficulty: 4,
                    },
                ]),
            });

            const res = await request(app).get('/training/smart-review').set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.positions).toHaveLength(1);
            expect(res.body.positions[0].name).toBe('Pase de bola contra efecto');
        });
    });

    describe('POST /training/claim-guest-data', () => {
        it('returns 401 when user is not authenticated', async () => {
            const res = await request(app).post('/training/claim-guest-data').send({ guestDeviceId: 'dev-1' });
            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Debes iniciar sesión');
        });

        it('returns 400 when guestDeviceId is missing', async () => {
            const token = createValidToken('user-claim');

            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{ tier: 'free' }]),
                    }),
                }),
            });

            const res = await request(app).post('/training/claim-guest-data').set('Authorization', `Bearer ${token}`).send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('guestDeviceId es requerido');
        });

        it('migrates guest sessions and mastery successfully', async () => {
            const token = createValidToken('user-claim');

            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{ tier: 'free' }]),
                    }),
                }),
            });

            (db.update as any)
                .mockReturnValueOnce({
                    set: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([]),
                    }),
                })
                .mockReturnValueOnce({
                    set: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([]),
                    }),
                });

            const res = await request(app)
                .post('/training/claim-guest-data')
                .set('Authorization', `Bearer ${token}`)
                .send({ guestDeviceId: 'device-xyz' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('vinculado con éxito');
        });
    });

    describe('GET /training/sessions & /training/stats', () => {
        it('retrieves past training sessions with pagination', async () => {
            (db.execute as any)
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 'sess-1',
                            created_at: new Date(),
                            total_target: 20,
                            total_hits: 15,
                            accuracy: 75,
                            positions_count: 2,
                            details: [],
                        },
                    ],
                })
                .mockResolvedValueOnce({
                    rows: [{ count: '1' }],
                });

            const res = await request(app).get('/training/sessions').query({ limit: 10, offset: 0 });

            expect(res.status).toBe(200);
            expect(res.body.sessions).toHaveLength(1);
            expect(res.body.total).toBe(1);
        });

        it('returns aggregated training statistics', async () => {
            (db.execute as any).mockResolvedValueOnce({
                rows: [
                    {
                        total_sessions: '12',
                        total_hits: '180',
                        total_target: '240',
                        avg_accuracy: '75',
                    },
                ],
            });

            const res = await request(app).get('/training/stats');
            expect(res.status).toBe(200);
            expect(res.body.total_sessions).toBe('12');
            expect(res.body.avg_accuracy).toBe('75');
        });
    });

    describe('GET /training/systems & /training/systems/:id', () => {
        it('returns systems with preview and premium flags or 500 on error', async () => {
            // Found rows
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockResolvedValue([
                    { id: 'sys-1', name: 'Sistema Renversé', isPremium: false },
                    { id: 'sys-2', name: 'Base 50', isPremium: false },
                    { id: 'sys-3', name: 'Klussman', isPremium: true },
                ]),
            });

            const res1 = await request(app).get('/training/systems');
            expect(res1.status).toBe(200);
            expect(res1.body.success).toBe(true);
            expect(res1.body.isGuestPreview).toBe(true);
            expect(res1.body.systems[0].is_locked).toBe(false);
            expect(res1.body.systems[2].is_locked).toBe(true);

            // DB error
            (db.select as any).mockImplementationOnce(() => {
                throw new Error('DB error');
            });

            const res2 = await request(app).get('/training/systems');
            expect(res2.status).toBe(500);
            expect(res2.body.error).toContain('Error al consultar sistemas');
        });

        it('returns system by id when found, 404 when missing, or 500 on error', async () => {
            // Found
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{ id: 'sys-tuyau', name: 'El Tuyau' }]),
                    }),
                }),
            });

            const res1 = await request(app).get('/training/systems/sys-tuyau');
            expect(res1.status).toBe(200);
            expect(res1.body.success).toBe(true);
            expect(res1.body.system.name).toBe('El Tuyau');

            // Not found -> 404
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const res2 = await request(app).get('/training/systems/unknown-system');
            expect(res2.status).toBe(404);
            expect(res2.body.error).toContain('Sistema no encontrado');

            // DB error -> 500
            (db.select as any).mockImplementationOnce(() => {
                throw new Error('DB crash');
            });

            const res3 = await request(app).get('/training/systems/err-sys');
            expect(res3.status).toBe(500);
            expect(res3.body.error).toContain('Error al consultar el sistema');
        });
    });
});
