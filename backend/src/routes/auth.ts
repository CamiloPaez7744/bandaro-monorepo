import { Router, Request, Response } from 'express';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, accounts, sessions } from '../db/schema.js';

export const authRouter: Router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'bandaro-super-secret-jwt-key-2026';
const ACCESS_TOKEN_TTL_SEC = 3600; // 1 hour
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Helpers: Password & JWT Token Management (Pure node:crypto RFC 7519)
// ---------------------------------------------------------------------------
function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const hash = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function createAccessToken(payload: { userId: string; email: string; alias: string }): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = {
        ...payload,
        iat: now,
        exp: now + ACCESS_TOKEN_TTL_SEC,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedBody = Buffer.from(JSON.stringify(body)).toString('base64url');
    const signature = createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedBody}`)
        .digest('base64url');

    return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyAccessToken(token: string): { userId: string; email: string; alias: string } | null {
    try {
        const [encodedHeader, encodedBody, signature] = token.split('.');
        if (!encodedHeader || !encodedBody || !signature) return null;

        const expectedSignature = createHmac('sha256', JWT_SECRET)
            .update(`${encodedHeader}.${encodedBody}`)
            .digest('base64url');

        if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            return null;
        }

        const body = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
        if (body.exp && body.exp < Math.floor(Date.now() / 1000)) {
            return null; // Expired
        }

        return body;
    } catch {
        return null;
    }
}

function generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Checks and updates daily login streak
 */
async function updateDailyStreak(user: typeof users.$inferSelect): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    if (user.lastActivityDate === today) {
        return user.currentStreak;
    }

    let newStreak = 1;
    if (user.lastActivityDate) {
        const lastDate = new Date(user.lastActivityDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (user.lastActivityDate === yesterdayStr) {
            newStreak = user.currentStreak + 1;
        }
    }

    const newMax = Math.max(user.maxStreak, newStreak);
    await db
        .update(users)
        .set({
            currentStreak: newStreak,
            maxStreak: newMax,
            lastActivityDate: today,
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

    return newStreak;
}

// ---------------------------------------------------------------------------
// 1. POST /auth/register — Email & Password
// ---------------------------------------------------------------------------
authRouter.post('/register', async (req: Request, res: Response) => {
    try {
        const {
            name,
            alias,
            email,
            password,
            nationality = 'Colombia',
            countryCode = 'CO',
            avatarUrl = 'avatar-01',
        } = req.body;

        if (!email || !password || !name) {
            res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
            return;
        }

        // Check existing user
        const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
        if (existing.length > 0) {
            res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
            return;
        }

        const passwordHash = hashPassword(password);
        const today = new Date().toISOString().split('T')[0];

        const [newUser] = await db
            .insert(users)
            .values({
                name,
                alias: alias || name.split(' ')[0],
                email: email.toLowerCase().trim(),
                passwordHash,
                avatarUrl,
                nationality,
                countryCode,
                emailVerified: false,
                currentStreak: 1,
                maxStreak: 1,
                lastActivityDate: today,
                totalXp: 100, // Welcome bonus XP
            })
            .returning();

        // Create initial session
        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

        await db.insert(sessions).values({
            userId: newUser.id,
            refreshToken,
            userAgent: req.headers['user-agent'] || 'Bandaro Client',
            ipAddress: req.ip || '',
            expiresAt,
        });

        const accessToken = createAccessToken({
            userId: newUser.id,
            email: newUser.email,
            alias: newUser.alias,
        });

        res.status(201).json({
            success: true,
            user: {
                id: newUser.id,
                name: newUser.name,
                alias: newUser.alias,
                email: newUser.email,
                avatarUrl: newUser.avatarUrl,
                nationality: newUser.nationality,
                countryCode: newUser.countryCode,
                currentStreak: newUser.currentStreak,
                totalXp: newUser.totalXp,
                accuracyAvg: newUser.accuracyAvg,
            },
            accessToken,
            refreshToken,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('[auth] Register error:', error);
        res.status(500).json({ error: 'Error al registrar el usuario en el servidor.' });
    }
});

// ---------------------------------------------------------------------------
// 2. POST /auth/login — Email & Password
// ---------------------------------------------------------------------------
authRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email y contraseña requeridos.' });
            return;
        }

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase().trim()))
            .limit(1);

        if (!user || !user.passwordHash) {
            res.status(401).json({ error: 'Credenciales inválidas.' });
            return;
        }

        const isValid = verifyPassword(password, user.passwordHash);
        if (!isValid) {
            res.status(401).json({ error: 'Credenciales inválidas.' });
            return;
        }

        const currentStreak = await updateDailyStreak(user);

        // Create new session
        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

        await db.insert(sessions).values({
            userId: user.id,
            refreshToken,
            userAgent: req.headers['user-agent'] || 'Bandaro Client',
            ipAddress: req.ip || '',
            expiresAt,
        });

        const accessToken = createAccessToken({
            userId: user.id,
            email: user.email,
            alias: user.alias,
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                alias: user.alias,
                email: user.email,
                avatarUrl: user.avatarUrl,
                nationality: user.nationality,
                countryCode: user.countryCode,
                currentStreak,
                totalXp: user.totalXp,
                accuracyAvg: user.accuracyAvg,
            },
            accessToken,
            refreshToken,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('[auth] Login error:', error);
        res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
});

// ---------------------------------------------------------------------------
// 3. POST /auth/google — Google OAuth & Dev Demo
// ---------------------------------------------------------------------------
authRouter.post('/google', async (req: Request, res: Response) => {
    try {
        const {
            email = 'google_user@bandaro.app',
            name = 'Usuario Google',
            avatarUrl = 'avatar-02',
            googleId = `google-${Date.now()}`,
            isDevDemo = false,
        } = req.body;

        let [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase().trim()))
            .limit(1);

        if (!user) {
            const [created] = await db
                .insert(users)
                .values({
                    name,
                    alias: name.split(' ')[0],
                    email: email.toLowerCase().trim(),
                    avatarUrl,
                    nationality: 'Colombia',
                    countryCode: 'CO',
                    emailVerified: true,
                    currentStreak: 1,
                    maxStreak: 1,
                    totalXp: 150,
                })
                .returning();
            user = created;
        }

        // Link Google account in accounts table
        await db
            .insert(accounts)
            .values({
                userId: user.id,
                provider: 'google',
                providerUserId: googleId,
            })
            .onConflictDoNothing();

        const currentStreak = await updateDailyStreak(user);

        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

        await db.insert(sessions).values({
            userId: user.id,
            refreshToken,
            userAgent: req.headers['user-agent'] || 'Bandaro Google OAuth',
            ipAddress: req.ip || '',
            expiresAt,
        });

        const accessToken = createAccessToken({
            userId: user.id,
            email: user.email,
            alias: user.alias,
        });

        res.json({
            success: true,
            provider: 'google',
            user: {
                id: user.id,
                name: user.name,
                alias: user.alias,
                email: user.email,
                avatarUrl: user.avatarUrl,
                nationality: user.nationality,
                countryCode: user.countryCode,
                currentStreak,
                totalXp: user.totalXp,
                accuracyAvg: user.accuracyAvg,
            },
            accessToken,
            refreshToken,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('[auth] Google login error:', error);
        res.status(500).json({ error: 'Error al autenticar con Google.' });
    }
});

// ---------------------------------------------------------------------------
// 4. POST /auth/microsoft — Microsoft Identity & Dev Demo
// ---------------------------------------------------------------------------
authRouter.post('/microsoft', async (req: Request, res: Response) => {
    try {
        const {
            email = 'ms_user@bandaro.app',
            name = 'Usuario Microsoft',
            avatarUrl = 'avatar-03',
            microsoftId = `ms-${Date.now()}`,
            isDevDemo = false,
        } = req.body;

        let [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase().trim()))
            .limit(1);

        if (!user) {
            const [created] = await db
                .insert(users)
                .values({
                    name,
                    alias: name.split(' ')[0],
                    email: email.toLowerCase().trim(),
                    avatarUrl,
                    nationality: 'Colombia',
                    countryCode: 'CO',
                    emailVerified: true,
                    currentStreak: 1,
                    maxStreak: 1,
                    totalXp: 150,
                })
                .returning();
            user = created;
        }

        // Link Microsoft account
        await db
            .insert(accounts)
            .values({
                userId: user.id,
                provider: 'microsoft',
                providerUserId: microsoftId,
            })
            .onConflictDoNothing();

        const currentStreak = await updateDailyStreak(user);

        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

        await db.insert(sessions).values({
            userId: user.id,
            refreshToken,
            userAgent: req.headers['user-agent'] || 'Bandaro Microsoft OAuth',
            ipAddress: req.ip || '',
            expiresAt,
        });

        const accessToken = createAccessToken({
            userId: user.id,
            email: user.email,
            alias: user.alias,
        });

        res.json({
            success: true,
            provider: 'microsoft',
            user: {
                id: user.id,
                name: user.name,
                alias: user.alias,
                email: user.email,
                avatarUrl: user.avatarUrl,
                nationality: user.nationality,
                countryCode: user.countryCode,
                currentStreak,
                totalXp: user.totalXp,
                accuracyAvg: user.accuracyAvg,
            },
            accessToken,
            refreshToken,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('[auth] Microsoft login error:', error);
        res.status(500).json({ error: 'Error al autenticar con Microsoft.' });
    }
});

// ---------------------------------------------------------------------------
// 5. POST /auth/refresh — Refresh Access Token
// ---------------------------------------------------------------------------
authRouter.post('/refresh', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: 'Refresh token requerido.' });
            return;
        }

        const [session] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.refreshToken, refreshToken))
            .limit(1);

        if (!session || new Date() > session.expiresAt) {
            res.status(401).json({ error: 'Sesión expirada o token inválido.' });
            return;
        }

        const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
        if (!user) {
            res.status(401).json({ error: 'Usuario no encontrado.' });
            return;
        }

        // Rotate refresh token
        const newRefreshToken = generateRefreshToken();
        const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

        await db
            .update(sessions)
            .set({
                refreshToken: newRefreshToken,
                expiresAt: newExpiresAt,
            })
            .where(eq(sessions.id, session.id));

        const accessToken = createAccessToken({
            userId: user.id,
            email: user.email,
            alias: user.alias,
        });

        res.json({
            success: true,
            accessToken,
            refreshToken: newRefreshToken,
            expiresAt: newExpiresAt.toISOString(),
        });
    } catch (error) {
        console.error('[auth] Refresh error:', error);
        res.status(500).json({ error: 'Error al refrescar la sesión.' });
    }
});

// ---------------------------------------------------------------------------
// 6. POST /auth/logout — Revoke Session
// ---------------------------------------------------------------------------
authRouter.post('/logout', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
        }
        res.json({ success: true, message: 'Sesión cerrada correctamente.' });
    } catch (error) {
        console.error('[auth] Logout error:', error);
        res.status(500).json({ error: 'Error al cerrar sesión.' });
    }
});

// ---------------------------------------------------------------------------
// 7. GET /auth/me — Current User Profile & Streak
// ---------------------------------------------------------------------------
authRouter.get('/me', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Token de autorización requerido.' });
            return;
        }

        const token = authHeader.substring(7);
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            res.status(401).json({ error: 'Token inválido o expirado.' });
            return;
        }

        const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado.' });
            return;
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                alias: user.alias,
                email: user.email,
                avatarUrl: user.avatarUrl,
                nationality: user.nationality,
                countryCode: user.countryCode,
                currentStreak: user.currentStreak,
                maxStreak: user.maxStreak,
                totalXp: user.totalXp,
                accuracyAvg: user.accuracyAvg,
            },
        });
    } catch (error) {
        console.error('[auth] Me error:', error);
        res.status(500).json({ error: 'Error al consultar el perfil de usuario.' });
    }
});
