import { Router, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export const trainingRouter: Router = Router();

// POST /training/session — Save a completed training session
trainingRouter.post('/session', async (req: Request, res: Response) => {
    try {
        const {
            id = `session-${Date.now()}`,
            userId = 'guest',
            totalTarget = 0,
            totalHits = 0,
            accuracy = 0,
            positionsCount = 0,
            positions = [],
        } = req.body;

        const positionsJson = JSON.stringify(positions);

        const insertQuery = sql`
            INSERT INTO training_session_history (
                id, user_id, total_target, total_hits, accuracy, positions_count, details, created_at
            ) VALUES (
                ${id}, ${userId}, ${totalTarget}, ${totalHits}, ${accuracy}, ${positionsCount}, ${positionsJson}::jsonb, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                total_target = EXCLUDED.total_target,
                total_hits = EXCLUDED.total_hits,
                accuracy = EXCLUDED.accuracy,
                positions_count = EXCLUDED.positions_count,
                details = EXCLUDED.details
            RETURNING *
        `;

        const result = await db.execute(insertQuery);

        res.status(201).json({
            success: true,
            session: result.rows[0],
            message: 'Sesión de entrenamiento registrada con éxito en el servidor',
        });
    } catch (error) {
        console.error('Error saving training session:', error);
        res.status(500).json({ error: 'Error al guardar la sesión de entrenamiento' });
    }
});

// GET /training/sessions — Retrieve past training sessions
trainingRouter.get('/sessions', async (req: Request, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) || '20', 10);
        const offset = parseInt((req.query.offset as string) || '0', 10);

        const listQuery = sql`
            SELECT * FROM training_session_history
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const countQuery = sql`SELECT COUNT(*) as count FROM training_session_history`;

        const [listResult, countResult] = await Promise.all([
            db.execute(listQuery),
            db.execute(countQuery),
        ]);

        res.json({
            sessions: listResult.rows,
            total: parseInt(countResult.rows[0].count as string, 10),
            limit,
            offset,
        });
    } catch (error) {
        console.error('Error fetching training sessions:', error);
        res.status(500).json({ error: 'Error al obtener las sesiones de entrenamiento' });
    }
});

// GET /training/stats — Aggregated training metrics
trainingRouter.get('/stats', async (_req: Request, res: Response) => {
    try {
        const statsQuery = sql`
            SELECT
                COUNT(*) as total_sessions,
                COALESCE(SUM(total_hits), 0) as total_hits,
                COALESCE(SUM(total_target), 0) as total_target,
                COALESCE(ROUND(AVG(accuracy)), 0) as avg_accuracy
            FROM training_session_history
        `;

        const result = await db.execute(statsQuery);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching training stats:', error);
        res.status(500).json({ error: 'Error al calcular estadísticas' });
    }
});
