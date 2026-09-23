import { Router, Request, Response } from 'express';
import { sql, eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
    trainingLevels,
    trainingNodes,
    trainingNodePositions,
    userNodeProgress,
    billiardSystems,
    users,
} from '../db/schema.js';
import { verifyAccessToken } from './auth.js';

export const trainingRouter: Router = Router();

// ---------------------------------------------------------------------------
// 1. GET /training/route — Fetch entire learning route with user's live progress
// ---------------------------------------------------------------------------
trainingRouter.get('/route', async (req: Request, res: Response) => {
    try {
        let userId: string | null = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyAccessToken(token);
            if (decoded) {
                userId = decoded.userId;
            }
        }

        // If no user token, fallback to demo user ID for rich initial preview
        const activeUserId = userId || '00000000-0000-0000-0000-000000000001';

        // 1. Fetch user stats (streak, xp, accuracy)
        const [userRow] = await db
            .select()
            .from(users)
            .where(eq(users.id, activeUserId))
            .limit(1);

        const currentStreak = userRow ? userRow.currentStreak : 14;
        const totalXp = userRow ? userRow.totalXp : 1450;
        const accuracyAvg = userRow ? Number(userRow.accuracyAvg) : 68.5;

        // 2. Fetch all levels
        const levels = await db
            .select()
            .from(trainingLevels)
            .orderBy(asc(trainingLevels.orderIndex));

        // 3. Fetch all nodes
        const nodes = await db
            .select()
            .from(trainingNodes)
            .orderBy(asc(trainingNodes.orderIndex));

        // 4. Fetch all node positions
        const positions = await db
            .select()
            .from(trainingNodePositions)
            .orderBy(asc(trainingNodePositions.orderIndex));

        // 5. Fetch user progress for all nodes
        const progressList = await db
            .select()
            .from(userNodeProgress)
            .where(eq(userNodeProgress.userId, activeUserId));

        const progressMap = new Map<string, typeof userNodeProgress.$inferSelect>();
        for (const p of progressList) {
            progressMap.set(p.nodeId, p);
        }

        // Group positions by nodeId
        const positionsByNode = new Map<string, any[]>();
        for (const pos of positions) {
            const list = positionsByNode.get(pos.nodeId) || [];
            list.push({
                id: pos.id,
                name: pos.name,
                category: pos.category,
                hint: pos.hint,
                difficulty: pos.difficulty,
                white: pos.whitePos,
                yellow: pos.yellowPos,
                red: pos.redPos,
                trajectory: pos.trajectory,
            });
            positionsByNode.set(pos.nodeId, list);
        }

        // Assemble levels with nested nodes and positions
        const resultLevels = levels.map((lvl) => {
            const levelNodes = nodes
                .filter((n) => n.levelId === lvl.id)
                .map((n) => {
                    const userProgress = progressMap.get(n.id);
                    const status = userProgress ? userProgress.status : n.defaultStatus;
                    const stars = userProgress ? userProgress.stars : 0;
                    const completedCount = userProgress ? userProgress.completedCount : 0;
                    const nodePositions = positionsByNode.get(n.id) || [];

                    return {
                        id: n.id,
                        dayNumber: n.dayNumber,
                        levelId: n.levelId,
                        title: n.title,
                        subtitle: n.subtitle,
                        status,
                        stars,
                        isBoss: n.isBoss,
                        xp: n.xp,
                        positionsCount: Math.max(nodePositions.length, 10),
                        completedCount,
                        positions: nodePositions,
                    };
                });

            return {
                id: lvl.id,
                name: lvl.name,
                tag: lvl.tag,
                subtitle: lvl.subtitle,
                description: lvl.description,
                color: lvl.color,
                nodes: levelNodes,
            };
        });

        res.json({
            success: true,
            userStats: {
                currentStreak,
                totalXp,
                accuracyAvg,
            },
            levels: resultLevels,
        });
    } catch (error) {
        console.error('[training] Error fetching route:', error);
        res.status(500).json({ error: 'Error al obtener la ruta de aprendizaje.' });
    }
});

// ---------------------------------------------------------------------------
// 2. POST /training/node-progress — Record completion of a daily station
// ---------------------------------------------------------------------------
trainingRouter.post('/node-progress', async (req: Request, res: Response) => {
    try {
        let userId: string | null = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyAccessToken(token);
            if (decoded) {
                userId = decoded.userId;
            }
        }

        const activeUserId = userId || '00000000-0000-0000-0000-000000000001';
        const { nodeId, stars = 3, completedCount = 10, accuracy = 80, xpGained = 150 } = req.body;

        if (!nodeId) {
            res.status(400).json({ error: 'nodeId es requerido' });
            return;
        }

        // Upsert progress for current node
        await db
            .insert(userNodeProgress)
            .values({
                userId: activeUserId,
                nodeId,
                status: 'completed',
                stars: Math.min(Math.max(stars, 1), 3),
                completedCount,
                bestAccuracy: String(accuracy),
                lastAttemptAt: new Date(),
            })
            .onConflictDoUpdate({
                target: [userNodeProgress.userId, userNodeProgress.nodeId],
                set: {
                    status: 'completed',
                    stars: Math.min(Math.max(stars, 1), 3),
                    completedCount,
                    bestAccuracy: String(accuracy),
                    lastAttemptAt: new Date(),
                },
            });

        // Add XP to user
        await db
            .update(users)
            .set({
                totalXp: sql`${users.totalXp} + ${xpGained}`,
                updatedAt: new Date(),
            })
            .where(eq(users.id, activeUserId));

        // Unlock next node in sequence if exists
        const allNodes = await db
            .select()
            .from(trainingNodes)
            .orderBy(asc(trainingNodes.orderIndex));

        const currentIndex = allNodes.findIndex((n) => n.id === nodeId);
        if (currentIndex !== -1 && currentIndex + 1 < allNodes.length) {
            const nextNode = allNodes[currentIndex + 1];
            await db
                .insert(userNodeProgress)
                .values({
                    userId: activeUserId,
                    nodeId: nextNode.id,
                    status: 'active',
                    stars: 0,
                    completedCount: 0,
                    bestAccuracy: '0.00',
                })
                .onConflictDoNothing();
        }

        res.json({
            success: true,
            message: 'Progreso de estación registrado con éxito.',
        });
    } catch (error) {
        console.error('[training] Error saving node progress:', error);
        res.status(500).json({ error: 'Error al actualizar el progreso del nodo.' });
    }
});

// ---------------------------------------------------------------------------
// 3. GET /training/systems — Classical Billiard Systems from DB
// ---------------------------------------------------------------------------
trainingRouter.get('/systems', async (_req: Request, res: Response) => {
    try {
        const systems = await db.select().from(billiardSystems);
        res.json({
            success: true,
            systems,
        });
    } catch (error) {
        console.error('[training] Error fetching systems:', error);
        res.status(500).json({ error: 'Error al consultar sistemas.' });
    }
});

// ---------------------------------------------------------------------------
// 4. POST /training/session — Save a completed training session (Legacy)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 5. GET /training/sessions — Retrieve past training sessions
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 6. GET /training/stats — Aggregated training metrics
// ---------------------------------------------------------------------------
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
