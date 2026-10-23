import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHmac, scryptSync, randomBytes } from 'node:crypto';

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
import { authRouter, verifyAccessToken } from '../auth.js';

describe('Auth Router', () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('JWT verifyAccessToken Helper', () => {
        it('returns null for empty, invalid, or malformed token format', () => {
            expect(verifyAccessToken('')).toBeNull();
            expect(verifyAccessToken('invalid.token')).toBeNull();
            expect(verifyAccessToken('part1.part2.part3.part4')).toBeNull();
        });

        it('returns null when signature is mismatched', () => {
            const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
            const body = Buffer.from(JSON.stringify({ userId: 'u1', email: 'test@b.com', alias: 't', exp: Math.floor(Date.now() / 1000) + 100 })).toString('base64url');
            const badSig = 'invalid-signature';
            expect(verifyAccessToken(`${header}.${body}.${badSig}`)).toBeNull();
        });

        it('returns null when token is expired', () => {
            const secret = 'bandaro-super-secret-jwt-key-2026';
            const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
            const body = Buffer.from(JSON.stringify({ userId: 'u1', email: 'test@b.com', alias: 't', exp: Math.floor(Date.now() / 1000) - 100 })).toString('base64url');
            const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
            expect(verifyAccessToken(`${header}.${body}.${sig}`)).toBeNull();
        });

        it('returns payload when token is valid and active', () => {
            const secret = 'bandaro-super-secret-jwt-key-2026';
            const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
            const bodyData = { userId: 'u123', email: 'valid@bandaro.com', alias: 'Torpedo', exp: Math.floor(Date.now() / 1000) + 3600 };
            const body = Buffer.from(JSON.stringify(bodyData)).toString('base64url');
            const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

            const result = verifyAccessToken(`${header}.${body}.${sig}`);
            expect(result).toBeDefined();
            expect(result?.userId).toBe('u123');
            expect(result?.alias).toBe('Torpedo');
        });
    });

    describe('POST /auth/register', () => {
        it('returns 400 when required fields are missing', async () => {
            const res = await request(app).post('/auth/register').send({ email: 'test@test.com' });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Nombre, email y contraseña son obligatorios');
        });

        it('returns 409 when email already exists', async () => {
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{ id: 'existing-id' }]),
                    }),
                }),
            });

            const res = await request(app).post('/auth/register').send({
                name: 'Camilo',
                email: 'camilo@test.com',
                password: 'password123',
            });

            expect(res.status).toBe(409);
            expect(res.body.error).toContain('Ya existe una cuenta');
        });

        it('returns 409 when alias already exists', async () => {
            (db.select as any)
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([]), // email not taken
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([{ id: 'other-user' }]), // alias taken
                        }),
                    }),
                });

            const res = await request(app).post('/auth/register').send({
                name: 'Camilo',
                alias: 'ElMaestro',
                email: 'camilo@test.com',
                password: 'password123',
            });

            expect(res.status).toBe(409);
            expect(res.body.error).toContain('El alias ya está en uso');
        });

        it('registers user successfully and returns tokens', async () => {
            const createdUser = {
                id: 'u-created',
                name: 'Camilo Torres',
                alias: 'ElMaestro',
                email: 'camilo@test.com',
                avatarUrl: 'avatar-01',
                nationality: 'Colombia',
                countryCode: 'CO',
                currentStreak: 1,
                maxStreak: 1,
                totalXp: 100,
                accuracyAvg: '0',
                tier: 'free',
                lastActivityDate: '2026-10-22',
            };

            // 1. check email (empty)
            // 2. check alias (empty)
            (db.select as any)
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([]),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([]),
                        }),
                    }),
                });

            // 3. insert user .returning()
            // 4. insert session
            (db.insert as any)
                .mockReturnValueOnce({
                    values: vi.fn().mockReturnValue({
                        returning: vi.fn().mockResolvedValue([createdUser]),
                    }),
                })
                .mockReturnValueOnce({
                    values: vi.fn().mockResolvedValue([]),
                });

            const res = await request(app).post('/auth/register').send({
                name: 'Camilo Torres',
                alias: 'ElMaestro',
                email: 'camilo@test.com',
                password: 'password123',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user.id).toBe('u-created');
            expect(res.body.accessToken).toBeDefined();
            expect(res.body.refreshToken).toBeDefined();
        });

        it('handles register database error with 500', async () => {
            (db.select as any).mockImplementation(() => {
                throw new Error('Database down');
            });

            const res = await request(app).post('/auth/register').send({
                name: 'Camilo',
                email: 'test@b.com',
                password: 'pass',
            });

            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Error al registrar el usuario');
        });
    });

    describe('POST /auth/login', () => {
        it('returns 400 when email or password is missing', async () => {
            const res = await request(app).post('/auth/login').send({ email: 't@t.com' });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Email y contraseña requeridos');
        });

        it('returns 401 when user is not found or has no passwordHash', async () => {
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const res = await request(app).post('/auth/login').send({
                email: 'unknown@test.com',
                password: 'pass',
            });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Credenciales inválidas.');
        });

        it('returns 401 when password does not match hash', async () => {
            const salt = randomBytes(16).toString('hex');
            const validHash = scryptSync('correctPassword', salt, 64).toString('hex');

            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                id: 'u1',
                                email: 'player@test.com',
                                passwordHash: `${salt}:${validHash}`,
                            },
                        ]),
                    }),
                }),
            });

            const res = await request(app).post('/auth/login').send({
                email: 'player@test.com',
                password: 'wrongPassword',
            });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Credenciales inválidas.');
        });

        it('logs in successfully, updates streak and returns session tokens', async () => {
            const salt = randomBytes(16).toString('hex');
            const validHash = scryptSync('secret123', salt, 64).toString('hex');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const userRow = {
                id: 'u-1',
                name: 'Champion',
                alias: 'ElCampeon',
                email: 'champ@test.com',
                avatarUrl: 'av-1',
                nationality: 'Colombia',
                passwordHash: `${salt}:${validHash}`,
                currentStreak: 3,
                maxStreak: 5,
                lastActivityDate: yesterday.toISOString().split('T')[0],
                totalXp: 500,
                accuracyAvg: '72.5',
                tier: 'free',
            };

            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([userRow]),
                    }),
                }),
            });

            (db.update as any).mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });

            (db.insert as any).mockReturnValueOnce({
                values: vi.fn().mockResolvedValue([]),
            });

            const res = await request(app).post('/auth/login').send({
                email: 'champ@test.com',
                password: 'secret123',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.alias).toBe('ElCampeon');
            expect(res.body.user.currentStreak).toBe(4);
            expect(res.body.accessToken).toBeDefined();
            expect(res.body.refreshToken).toBeDefined();
        });

        it('handles login database error with 500', async () => {
            (db.select as any).mockImplementation(() => {
                throw new Error('DB Crash');
            });

            const res = await request(app).post('/auth/login').send({
                email: 'a@b.com',
                password: 'pass',
            });

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Error al iniciar sesión.');
        });
    });

    describe('POST /auth/refresh', () => {
        it('returns 400 when refreshToken is missing', async () => {
            const res = await request(app).post('/auth/refresh').send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Refresh token requerido.');
        });

        it('returns 401 when session is not found or expired', async () => {
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const res = await request(app).post('/auth/refresh').send({ refreshToken: 'tok-123' });
            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Sesión expirada o token inválido');
        });

        it('rotates refresh token and returns new session tokens', async () => {
            const future = new Date(Date.now() + 100000);
            (db.select as any)
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([
                                { id: 'sess-1', userId: 'u-1', expiresAt: future },
                            ]),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([
                                { id: 'u-1', email: 'u@test.com', alias: 'User1' },
                            ]),
                        }),
                    }),
                });

            (db.update as any).mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });

            const res = await request(app).post('/auth/refresh').send({ refreshToken: 'valid-refresh' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.accessToken).toBeDefined();
            expect(res.body.refreshToken).toBeDefined();
        });

        it('handles refresh server error with 500', async () => {
            (db.select as any).mockImplementation(() => {
                throw new Error('DB Crash');
            });

            const res = await request(app).post('/auth/refresh').send({ refreshToken: 'tok' });
            expect(res.status).toBe(500);
        });
    });

    describe('POST /auth/logout', () => {
        it('deletes session when refreshToken is provided', async () => {
            (db.delete as any).mockReturnValueOnce({
                where: vi.fn().mockResolvedValue([]),
            });

            const res = await request(app).post('/auth/logout').send({ refreshToken: 'tok-bye' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Sesión cerrada');
        });

        it('handles logout error with 500', async () => {
            (db.delete as any).mockImplementation(() => {
                throw new Error('DB Error');
            });

            const res = await request(app).post('/auth/logout').send({ refreshToken: 'tok' });
            expect(res.status).toBe(500);
        });
    });

    describe('GET /auth/me', () => {
        it('returns 401 when authorization header is missing', async () => {
            const res = await request(app).get('/auth/me');
            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Token de autorización requerido');
        });

        it('returns 401 when token is invalid or expired', async () => {
            const res = await request(app).get('/auth/me').set('Authorization', 'Bearer invalid.token.123');
            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Token inválido');
        });

        it('returns user profile when token is valid', async () => {
            const secret = 'bandaro-super-secret-jwt-key-2026';
            const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
            const body = Buffer.from(JSON.stringify({ userId: 'u-42', email: 'me@bandaro.com', alias: 'Me', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
            const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
            const validToken = `${header}.${body}.${sig}`;

            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                id: 'u-42',
                                name: 'Myself',
                                alias: 'Me',
                                email: 'me@bandaro.com',
                                avatarUrl: 'av-01',
                                nationality: 'Colombia',
                                countryCode: 'CO',
                                currentStreak: 5,
                                maxStreak: 10,
                                totalXp: 1200,
                                accuracyAvg: '65.0',
                                tier: 'pro',
                                lastActivityDate: '2026-10-22',
                            },
                        ]),
                    }),
                }),
            });

            const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${validToken}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.id).toBe('u-42');
            expect(res.body.user.alias).toBe('Me');
        });

        it('returns 404 when user from token is not found in database', async () => {
            const secret = 'bandaro-super-secret-jwt-key-2026';
            const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
            const body = Buffer.from(JSON.stringify({ userId: 'u-ghost', email: 'ghost@bandaro.com', alias: 'Ghost', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
            const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
            const token = `${header}.${body}.${sig}`;

            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
            expect(res.body.error).toContain('Usuario no encontrado');
        });

        it('returns 500 when me query fails with error', async () => {
            const secret = 'bandaro-super-secret-jwt-key-2026';
            const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
            const body = Buffer.from(JSON.stringify({ userId: 'u-err', email: 'err@bandaro.com', alias: 'Err', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
            const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
            const token = `${header}.${body}.${sig}`;

            (db.select as any).mockImplementationOnce(() => {
                throw new Error('Database crash');
            });

            const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Error al consultar el perfil');
        });
    });

    describe('OAuth endpoints POST /auth/google & /auth/microsoft', () => {
        it('authenticates with Google successfully', async () => {
            const googleUser = {
                id: 'u-goog',
                name: 'Google Player',
                alias: 'Googler',
                email: 'goog@bandaro.app',
                avatarUrl: 'av-goog',
                nationality: 'Colombia',
                countryCode: 'CO',
                currentStreak: 1,
                maxStreak: 1,
                totalXp: 150,
                lastActivityDate: '2026-10-22',
            };

            // Existing user
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([googleUser]),
                    }),
                }),
            });

            // insert account
            (db.insert as any)
                .mockReturnValueOnce({
                    values: vi.fn().mockReturnValue({
                        onConflictDoNothing: vi.fn().mockResolvedValue([]),
                    }),
                })
                .mockReturnValueOnce({
                    values: vi.fn().mockResolvedValue([]), // insert session
                });

            // update streak
            (db.update as any).mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });

            const res = await request(app).post('/auth/google').send({
                email: 'goog@bandaro.app',
                name: 'Google Player',
            });

            expect(res.status).toBe(200);
            expect(res.body.provider).toBe('google');
            expect(res.body.accessToken).toBeDefined();
        });

        it('authenticates with Microsoft successfully', async () => {
            const msUser = {
                id: 'u-ms',
                name: 'MS Player',
                alias: 'MSPro',
                email: 'ms@bandaro.app',
                avatarUrl: 'av-ms',
                nationality: 'Colombia',
                countryCode: 'CO',
                currentStreak: 1,
                maxStreak: 1,
                totalXp: 150,
                lastActivityDate: '2026-10-22',
            };

            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([msUser]),
                    }),
                }),
            });

            (db.insert as any)
                .mockReturnValueOnce({
                    values: vi.fn().mockReturnValue({
                        onConflictDoNothing: vi.fn().mockResolvedValue([]),
                    }),
                })
                .mockReturnValueOnce({
                    values: vi.fn().mockResolvedValue([]),
                });

            (db.update as any).mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });

            const res = await request(app).post('/auth/microsoft').send({
                email: 'ms@bandaro.app',
                name: 'MS Player',
            });

            expect(res.status).toBe(200);
            expect(res.body.provider).toBe('microsoft');
            expect(res.body.accessToken).toBeDefined();
        });

        it('handles Microsoft authentication error with 500', async () => {
            (db.select as any).mockImplementationOnce(() => {
                throw new Error('MS OAuth failure');
            });

            const res = await request(app).post('/auth/microsoft').send({ email: 'err@ms.com' });
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Error al autenticar con Microsoft');
        });

        it('returns 401 on refresh when user row is not found in database', async () => {
            const future = new Date(Date.now() + 100000);
            (db.select as any)
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([
                                { id: 'sess-orphan', userId: 'u-deleted', expiresAt: future },
                            ]),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([]),
                        }),
                    }),
                });

            const res = await request(app).post('/auth/refresh').send({ refreshToken: 'tok-orphan' });
            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Usuario no encontrado');
        });
    });
});
