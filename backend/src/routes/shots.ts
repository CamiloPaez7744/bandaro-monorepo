import { Router, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

import { db } from '../db/index.js';

export const shotsRouter: Router = Router();

shotsRouter.get('/catalog', async (req: Request, res: Response) => {
    try {
        const { category, player, search, limit = '50', offset = '0' } = req.query;

        let query = sql`SELECT * FROM shot_catalog WHERE 1=1`;
        const conditions: any[] = [];

        if (category) {
            conditions.push(sql`category = ${category as string}`);
        }

        if (player) {
            conditions.push(sql`(player_first_name ILIKE ${'%' + player + '%'} OR player_last_name ILIKE ${'%' + player + '%'})`);
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

        const orderClause = sql`ORDER BY (CASE WHEN has_analysis = true THEN 0 ELSE 1 END) ASC, external_id ASC`;

        if (conditions.length > 0) {
            const whereClause = conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`);
            query = sql`SELECT * FROM shot_catalog WHERE ${whereClause} ${orderClause} LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}`;
        } else {
            query = sql`SELECT * FROM shot_catalog ${orderClause} LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}`;
        }

        const result = await db.execute(query);

        const countQuery = conditions.length > 0
            ? sql`SELECT COUNT(*) FROM shot_catalog WHERE ${conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)}`
            : sql`SELECT COUNT(*) FROM shot_catalog`;
        const countResult = await db.execute(countQuery);

        res.json({
            shots: result.rows,
            total: parseInt(countResult.rows[0].count as string),
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
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

shotsRouter.get('/catalog/:id', async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const result = await db.execute(
            sql`SELECT * FROM shot_catalog WHERE external_id = ${parseInt(id, 10)}`
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
