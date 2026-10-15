import { Router, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

import { db } from '../db/index.js';

import { verifyAccessToken } from './auth.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const shotsRouter: Router = Router();

const GUEST_SAMPLE_LIMIT = 12;

shotsRouter.get('/catalog', async (req: Request, res: Response) => {
    try {
        const { category, player, search, onlyFavorites, userId = 'guest', limit = '50', offset = '0' } = req.query;

        // 1. Resolve user identity and tier
        let authenticatedUser: { userId: string; email: string; alias: string } | null = null;
        let userTier = 'guest';

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyAccessToken(token);
            if (decoded) {
                authenticatedUser = decoded;
                try {
                    const [userRow] = await db
                        .select({ tier: users.tier })
                        .from(users)
                        .where(eq(users.id, decoded.userId))
                        .limit(1);
                    userTier = userRow?.tier || 'free';
                } catch {
                    userTier = 'free';
                }
            }
        }

        const isGuest = !authenticatedUser;
        const isPremium = userTier === 'premium' || userTier === 'admin';
        const activeUserId = authenticatedUser ? authenticatedUser.userId : String(userId || 'guest');

        const conditions: any[] = [];

        if (category) {
            conditions.push(sql`category = ${category as string}`);
        }

        if (player) {
            conditions.push(sql`(player_first_name ILIKE ${'%' + player + '%'} OR player_last_name ILIKE ${'%' + player + '%'})`);
        }

        if (onlyFavorites === 'true' || onlyFavorites === '1') {
            conditions.push(sql`EXISTS (SELECT 1 FROM user_favorite_shots ufs WHERE ufs.shot_id = shot_catalog.external_id AND ufs.user_id = ${activeUserId})`);
        }

        if (search) {
            conditions.push(sql`(
                description ILIKE ${'%' + search + '%'} OR
                description_es ILIKE ${'%' + search + '%'} OR
                description_en ILIKE ${'%' + search + '%'} OR
                description_ko ILIKE ${'%' + search + '%'} OR
                tips ILIKE ${'%' + search + '%'} OR
                tips_es ILIKE ${'%' + search + '%'} OR
                tips_en ILIKE ${'%' + search + '%'} OR
                tips_ko ILIKE ${'%' + search + '%'} OR
                name_es ILIKE ${'%' + search + '%'} OR
                name_en ILIKE ${'%' + search + '%'} OR
                name_ko ILIKE ${'%' + search + '%'} OR
                category ILIKE ${'%' + search + '%'}
            )`);
        }

        const selectFields = sql`shot_catalog.*, EXISTS (SELECT 1 FROM user_favorite_shots ufs WHERE ufs.shot_id = shot_catalog.external_id AND ufs.user_id = ${activeUserId}) AS is_favorite`;
        const orderClause = sql`ORDER BY (CASE WHEN has_analysis = true THEN 0 ELSE 1 END) ASC, external_id ASC`;

        // If guest, enforce reduced sample limit and lock pagination beyond sample
        const effectiveLimit = isGuest ? Math.min(parseInt(limit as string) || GUEST_SAMPLE_LIMIT, GUEST_SAMPLE_LIMIT) : parseInt(limit as string);
        const effectiveOffset = isGuest ? 0 : parseInt(offset as string);

        let query;
        if (conditions.length > 0) {
            const whereClause = conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`);
            query = sql`SELECT ${selectFields} FROM shot_catalog WHERE ${whereClause} ${orderClause} LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`;
        } else {
            query = sql`SELECT ${selectFields} FROM shot_catalog ${orderClause} LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`;
        }

        const result = await db.execute(query);

        const countQuery = conditions.length > 0
            ? sql`SELECT COUNT(*) FROM shot_catalog WHERE ${conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)}`
            : sql`SELECT COUNT(*) FROM shot_catalog`;
        const countResult = await db.execute(countQuery);
        const totalAvailable = parseInt(countResult.rows[0].count as string);

        const totalOverallResult = await db.execute(sql`SELECT COUNT(*) FROM shot_catalog`);
        const grandTotal = parseInt(totalOverallResult.rows[0].count as string);

        // Map shots with premium access flags
        const processedShots = result.rows.map((row: any) => {
            const shotIsPremium = Boolean(row.is_premium);
            const isLocked = shotIsPremium && !isPremium;
            return {
                ...row,
                is_premium: shotIsPremium,
                is_locked: isLocked,
                requires_premium: isLocked,
            };
        });

        res.json({
            shots: processedShots,
            total: isGuest ? Math.min(totalAvailable, GUEST_SAMPLE_LIMIT) : totalAvailable,
            totalAvailable,
            grandTotal,
            limit: effectiveLimit,
            offset: effectiveOffset,
            isGuestPreview: isGuest,
            previewLimit: isGuest ? GUEST_SAMPLE_LIMIT : null,
            userTier,
            requiresLoginForFullCatalog: isGuest,
            message: isGuest
                ? 'Muestra limitada de 12 carambolas. Inicia sesión gratis para acceder al catálogo completo de más de 180 jugadas.'
                : null,
        });
    } catch (error) {
        console.error('Error fetching shot catalog:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

shotsRouter.get('/catalog/categories', async (_req: Request, res: Response) => {
    try {
        const result = await db.execute(
            sql`SELECT category, COUNT(*) as count FROM shot_catalog GROUP BY category ORDER BY count DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

shotsRouter.get('/favorites', async (req: Request, res: Response) => {
    try {
        const { userId = 'guest' } = req.query;
        const activeUserId = String(userId || 'guest');
        const result = await db.execute(
            sql`SELECT shot_id FROM user_favorite_shots WHERE user_id = ${activeUserId} ORDER BY created_at DESC`
        );
        const favoriteShotIds = result.rows.map((r: any) => Number(r.shot_id));
        res.json({ favoriteShotIds });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

shotsRouter.post('/favorites/toggle', async (req: Request, res: Response) => {
    try {
        const { shotId, userId = 'guest' } = req.body;
        if (!shotId) {
            res.status(400).json({ error: 'shotId is required' });
            return;
        }
        const activeUserId = String(userId || 'guest');
        const idNum = parseInt(String(shotId), 10);

        const existing = await db.execute(
            sql`SELECT id FROM user_favorite_shots WHERE user_id = ${activeUserId} AND shot_id = ${idNum}`
        );

        if (existing.rows.length > 0) {
            await db.execute(
                sql`DELETE FROM user_favorite_shots WHERE user_id = ${activeUserId} AND shot_id = ${idNum}`
            );
            res.json({ success: true, isFavorite: false, shotId: idNum });
        } else {
            await db.execute(
                sql`INSERT INTO user_favorite_shots (user_id, shot_id) VALUES (${activeUserId}, ${idNum})`
            );
            res.json({ success: true, isFavorite: true, shotId: idNum });
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

shotsRouter.get('/catalog/:id', async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { userId = 'guest' } = req.query;
        const activeUserId = String(userId || 'guest');
        const result = await db.execute(
            sql`SELECT shot_catalog.*, EXISTS (SELECT 1 FROM user_favorite_shots ufs WHERE ufs.shot_id = shot_catalog.external_id AND ufs.user_id = ${activeUserId}) AS is_favorite FROM shot_catalog WHERE external_id = ${parseInt(id, 10)}`
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Shot not found' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching shot:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

