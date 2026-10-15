import { Router, Request, Response } from 'express';
import { sql, eq, and, asc, desc, or, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
    trainingLevels,
    trainingNodes,
    trainingNodePositions,
    userNodeProgress,
    billiardSystems,
    pedagogyModules,
    users,
    trainingSessions,
    trainingSessionDrills,
    userPositionMastery,
    trainingSessionHistory,
} from '../db/schema.js';
import { BASE_50_SYSTEM_RECORD } from '../db/base50Data.js';
import { verifyAccessToken } from './auth.js';

export const trainingRouter: Router = Router();

async function getAuthContext(req: Request): Promise<{ userId: string | null; tier: string }> {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyAccessToken(token);
        if (decoded?.userId) {
            try {
                const [userRow] = await db
                    .select({ tier: users.tier })
                    .from(users)
                    .where(eq(users.id, decoded.userId))
                    .limit(1);
                return { userId: decoded.userId, tier: userRow?.tier || 'free' };
            } catch {
                return { userId: decoded.userId, tier: 'free' };
            }
        }
    }
    return { userId: null, tier: 'guest' };
}

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
// 3. GET /training/systems — Classical Billiard Systems (with guest & premium gating)
// ---------------------------------------------------------------------------
trainingRouter.get('/systems', async (req: Request, res: Response) => {
    try {
        const { userId, tier } = await getAuthContext(req);
        const isGuest = !userId;
        const isPremium = tier === 'premium' || tier === 'admin';

        const allSystems = await db.select().from(billiardSystems);

        // Map systems with guest preview & premium access flags
        const processed = allSystems.map((sys, idx) => {
            const isSystemPremium = Boolean(sys.isPremium);
            // Guests receive preview of first 2 foundational systems
            const guestLocked = isGuest && idx >= 2;
            const premiumLocked = isSystemPremium && !isPremium;
            const isLocked = guestLocked || premiumLocked;

            return {
                ...sys,
                is_locked: isLocked,
                requires_login: guestLocked,
                requires_premium: premiumLocked,
            };
        });

        res.json({
            success: true,
            systems: processed,
            isGuestPreview: isGuest,
            userTier: tier,
            message: isGuest
                ? 'Estás viendo una muestra de sistemas clásicos. Inicia sesión gratis para desbloquear la enciclopedia completa.'
                : null,
        });
    } catch (error) {
        console.error('[training] Error fetching systems:', error);
        res.status(500).json({ error: 'Error al consultar sistemas.' });
    }
});

// ---------------------------------------------------------------------------
// 3b. GET /training/systems/:id — Get specific system with complete cheat sheet & diamonds
// ---------------------------------------------------------------------------
trainingRouter.get('/systems/:id', async (req: Request, res: Response) => {
    try {
        const systemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const [system] = await db
            .select()
            .from(billiardSystems)
            .where(eq(billiardSystems.id, systemId))
            .limit(1);

        if (!system) {
            return res.status(404).json({ error: 'Sistema no encontrado.' });
        }

        res.json({
            success: true,
            system,
        });
    } catch (error) {
        console.error('[training] Error fetching system by id:', error);
        res.status(500).json({ error: 'Error al consultar el sistema.' });
    }
});

// ---------------------------------------------------------------------------
// 3c. GET /training/pedagogy — Master Billiard Pedagogy Modules
// ---------------------------------------------------------------------------
trainingRouter.get('/pedagogy', async (_req: Request, res: Response) => {
    try {
        const modules = await db
            .select()
            .from(pedagogyModules)
            .orderBy(asc(pedagogyModules.orderIndex));

        res.json({
            success: true,
            modules,
        });
    } catch (error) {
        console.error('[training] Error fetching pedagogy modules:', error);
        res.status(500).json({ error: 'Error al consultar módulos pedagógicos.' });
    }
});


// ---------------------------------------------------------------------------
// 4. POST /training/session — Propuesta 1: Normalized Training Session & Spaced Repetition
// ---------------------------------------------------------------------------
trainingRouter.post('/session', async (req: Request, res: Response) => {
    try {
        const { userId: authUserId, tier } = await getAuthContext(req);

        const {
            id = undefined,
            guestDeviceId = null,
            sessionType = 'guided_route',
            nodeId = null,
            durationSeconds = 0,
            totalTarget = 0,
            totalHits = 0,
            accuracy = 0,
            positionsCount = 0,
            positions = [],
        } = req.body;

        const effectiveUserId = authUserId || null;
        const finalAccuracy = totalTarget > 0 ? ((totalHits / totalTarget) * 100).toFixed(2) : '0.00';
        const xpEarned = Math.round(totalHits * 15) + (Number(finalAccuracy) >= 80 ? 50 : 0);

        // 1. Insert into normalized training_sessions table
        let sessionId: string = '';
        try {
            const [newSession] = await db
                .insert(trainingSessions)
                .values({
                    userId: effectiveUserId,
                    guestDeviceId: guestDeviceId || null,
                    sessionType,
                    nodeId: nodeId || null,
                    totalDrills: positions.length || positionsCount,
                    totalShotsAttempted: totalTarget,
                    totalShotsMade: totalHits,
                    overallAccuracy: finalAccuracy,
                    durationSeconds: durationSeconds || 0,
                    xpEarned,
                    completedAt: new Date(),
                })
                .returning({ id: trainingSessions.id });
            sessionId = newSession?.id || `session-${Date.now()}`;
        } catch (dbErr) {
            console.warn('[training] Note: inserting into training_sessions skipped, fallback to legacy:', dbErr);
            sessionId = `session-${Date.now()}`;
        }

        // 2. Insert individual drills and update Spaced Repetition (USER_POSITION_MASTERY)
        let strugglingCount = 0;
        if (positions && Array.isArray(positions) && positions.length > 0) {
            for (let idx = 0; idx < positions.length; idx++) {
                const drill = positions[idx];
                const drillTarget = drill.target || 10;
                const drillHits = drill.hits || 0;
                const drillAccuracy = drill.accuracy !== undefined
                    ? Number(drill.accuracy).toFixed(2)
                    : drillTarget > 0
                    ? ((drillHits / drillTarget) * 100).toFixed(2)
                    : '0.00';

                const perceivedDiff = drill.perceivedDifficulty ? parseInt(drill.perceivedDifficulty, 10) : null;
                const failureReason = drill.failureReason || null;
                const userNotes = drill.userNotes || null;

                // Insert into training_session_drills
                try {
                    if (sessionId && sessionId.length === 36) { // Valid UUID
                        await db.insert(trainingSessionDrills).values({
                            sessionId,
                            positionId: drill.id,
                            orderIndex: idx,
                            targetReps: drillTarget,
                            madeReps: drillHits,
                            accuracy: drillAccuracy,
                            perceivedDifficulty: perceivedDiff,
                            failureReason,
                            userNotes,
                            completedAt: new Date(),
                        });
                    }
                } catch (drillErr) {
                    console.warn('[training] drill insert error:', drillErr);
                }

                // Calculate Mastery & Spaced Repetition schedule
                const drillPct = Number(drillAccuracy);
                const isStruggling = drillPct < 60 || (perceivedDiff !== null && perceivedDiff >= 4);
                if (isStruggling) strugglingCount++;

                // Schedule next review based on Leitner SRS intervals:
                // - Struggling (<60% or high difficulty): 24 hours
                // - Practicing (60-84%): 3 days
                // - Mastered (>=85% and low difficulty): 14 days
                const now = Date.now();
                let nextReviewDue: Date;
                let masteryStatus: 'struggling' | 'practicing' | 'mastered';

                if (isStruggling) {
                    masteryStatus = 'struggling';
                    nextReviewDue = new Date(now + 24 * 3600 * 1000); // +24 hours
                } else if (drillPct >= 85 && (!perceivedDiff || perceivedDiff <= 2)) {
                    masteryStatus = 'mastered';
                    nextReviewDue = new Date(now + 14 * 24 * 3600 * 1000); // +14 days
                } else {
                    masteryStatus = 'practicing';
                    nextReviewDue = new Date(now + 3 * 24 * 3600 * 1000); // +3 days
                }

                try {
                    // Check if existing mastery row exists for this user or guest device
                    const masteryFilter = effectiveUserId
                        ? eq(userPositionMastery.userId, effectiveUserId)
                        : guestDeviceId
                        ? eq(userPositionMastery.guestDeviceId, guestDeviceId)
                        : null;

                    if (masteryFilter) {
                        const [existingMastery] = await db
                            .select()
                            .from(userPositionMastery)
                            .where(and(masteryFilter, eq(userPositionMastery.positionId, drill.id)))
                            .limit(1);

                        if (existingMastery) {
                            const newTotalAttempts = existingMastery.totalAttempts + drillTarget;
                            const newTotalHits = existingMastery.totalHits + drillHits;
                            const newLifetimeAccuracy = newTotalAttempts > 0
                                ? ((newTotalHits / newTotalAttempts) * 100).toFixed(2)
                                : '0.00';
                            const newConsecutiveFailures = drillPct < 50 ? existingMastery.consecutiveFailures + 1 : 0;

                            await db
                                .update(userPositionMastery)
                                .set({
                                    totalAttempts: newTotalAttempts,
                                    totalHits: newTotalHits,
                                    lifetimeAccuracy: newLifetimeAccuracy,
                                    consecutiveFailures: newConsecutiveFailures,
                                    perceivedDifficultyAvg: perceivedDiff !== null ? String(perceivedDiff) : existingMastery.perceivedDifficultyAvg,
                                    masteryStatus,
                                    nextReviewDue,
                                    lastTrainedAt: new Date(),
                                })
                                .where(eq(userPositionMastery.id, existingMastery.id));
                        } else {
                            await db.insert(userPositionMastery).values({
                                userId: effectiveUserId,
                                guestDeviceId: guestDeviceId || null,
                                positionId: drill.id,
                                totalAttempts: drillTarget,
                                totalHits: drillHits,
                                lifetimeAccuracy: drillAccuracy,
                                consecutiveFailures: drillPct < 50 ? 1 : 0,
                                perceivedDifficultyAvg: perceivedDiff !== null ? String(perceivedDiff) : null,
                                masteryStatus,
                                nextReviewDue,
                                lastTrainedAt: new Date(),
                            });
                        }
                    }
                } catch (masteryErr) {
                    console.warn('[training] mastery update skipped:', masteryErr);
                }
            }
        }

        // 3. Update legacy table for backwards compatibility
        const legacyId = id || sessionId;
        const positionsJson = JSON.stringify(positions);
        try {
            await db.execute(sql`
                INSERT INTO training_session_history (
                    id, user_id, total_target, total_hits, accuracy, positions_count, details, created_at
                ) VALUES (
                    ${legacyId}, ${effectiveUserId || 'guest'}, ${totalTarget}, ${totalHits}, ${Math.round(Number(finalAccuracy))}, ${positions.length || positionsCount}, ${positionsJson}::jsonb, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    total_target = EXCLUDED.total_target,
                    total_hits = EXCLUDED.total_hits,
                    accuracy = EXCLUDED.accuracy,
                    positions_count = EXCLUDED.positions_count,
                    details = EXCLUDED.details
            `);
        } catch (legacyErr) {
            console.warn('[training] legacy session history warning:', legacyErr);
        }

        // 4. Update user streak & XP if authenticated
        if (effectiveUserId) {
            try {
                await db
                    .update(users)
                    .set({
                        totalXp: sql`${users.totalXp} + ${xpEarned}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, effectiveUserId));
            } catch (userErr) {
                console.warn('[training] user XP update warning:', userErr);
            }
        }

        res.status(201).json({
            success: true,
            sessionId,
            xpEarned,
            overallAccuracy: finalAccuracy,
            strugglingPositionsCount: strugglingCount,
            isGuest: !effectiveUserId,
            suggestLogin: !effectiveUserId,
            message: !effectiveUserId
                ? '¡Sesión guardada! Inicia sesión gratis para proteger tu racha de hoy y activar el repaso inteligente de posiciones difíciles.'
                : '¡Excelente entrenamiento! Métricas de efectividad y maestría actualizadas.',
        });
    } catch (error) {
        console.error('Error saving training session:', error);
        res.status(500).json({ error: 'Error al guardar la sesión de entrenamiento' });
    }
});

// ---------------------------------------------------------------------------
// 4b. GET /training/smart-review — Retrieve positions that need review (<60% accuracy or due)
// ---------------------------------------------------------------------------
trainingRouter.get('/smart-review', async (req: Request, res: Response) => {
    try {
        const { userId } = await getAuthContext(req);
        const guestDeviceId = (req.query.guestDeviceId as string) || null;

        const userFilter = userId
            ? eq(userPositionMastery.userId, userId)
            : guestDeviceId
            ? eq(userPositionMastery.guestDeviceId, guestDeviceId)
            : null;

        if (!userFilter) {
            return res.json({
                success: true,
                positions: [],
                count: 0,
                message: 'No hay datos de maestría registrados aún.',
            });
        }

        // Query positions where masteryStatus is struggling, accuracy < 60%, or review is due
        const now = new Date();
        const masteryRows = await db
            .select()
            .from(userPositionMastery)
            .where(
                and(
                    userFilter,
                    or(
                        eq(userPositionMastery.masteryStatus, 'struggling'),
                        sql`CAST(${userPositionMastery.lifetimeAccuracy} AS numeric) < 60.00`,
                        lte(userPositionMastery.nextReviewDue, now)
                    )
                )
            )
            .orderBy(asc(userPositionMastery.nextReviewDue), asc(userPositionMastery.lifetimeAccuracy))
            .limit(10);

        if (masteryRows.length === 0) {
            return res.json({
                success: true,
                positions: [],
                count: 0,
                message: '¡Excelente! No tienes posiciones pendientes de repaso en este momento.',
            });
        }

        // Lookup position definitions from trainingNodePositions
        const positionIds = masteryRows.map((m) => m.positionId);
        const positionDefs = await db
            .select()
            .from(trainingNodePositions);

        const positionMap = new Map<string, typeof trainingNodePositions.$inferSelect>();
        for (const p of positionDefs) {
            positionMap.set(p.id, p);
        }

        const reviewPositions = masteryRows.map((m) => {
            const def = positionMap.get(m.positionId);
            return {
                id: m.positionId,
                name: def?.name || `Posición ${m.positionId}`,
                category: def?.category || 'Repaso Inteligente',
                hint: def?.hint || 'Repasa el ángulo y la velocidad para mejorar tu efectividad.',
                difficulty: def?.difficulty || 3,
                white: def?.whitePos || { x: 50, y: 110 },
                yellow: def?.yellowPos || { x: 100, y: 65 },
                red: def?.redPos || { x: 230, y: 105 },
                trajectory: def?.trajectory || undefined,
                lifetimeAccuracy: Number(m.lifetimeAccuracy),
                totalAttempts: m.totalAttempts,
                totalHits: m.totalHits,
                masteryStatus: m.masteryStatus,
                perceivedDifficultyAvg: m.perceivedDifficultyAvg ? Number(m.perceivedDifficultyAvg) : null,
                nextReviewDue: m.nextReviewDue,
            };
        });

        res.json({
            success: true,
            positions: reviewPositions,
            count: reviewPositions.length,
            message: `Tienes ${reviewPositions.length} posición(es) recomendada(s) para repaso espaciado.`,
        });
    } catch (error) {
        console.error('[training] Error in smart-review:', error);
        res.status(500).json({ error: 'Error al consultar posiciones de repaso.' });
    }
});

// ---------------------------------------------------------------------------
// 4c. POST /training/claim-guest-data — Migrate guest device training data to authenticated user
// ---------------------------------------------------------------------------
trainingRouter.post('/claim-guest-data', async (req: Request, res: Response) => {
    try {
        const { userId } = await getAuthContext(req);
        if (!userId) {
            return res.status(401).json({ error: 'Debes iniciar sesión para vincular los entrenamientos de invitado.' });
        }

        const { guestDeviceId } = req.body;
        if (!guestDeviceId) {
            return res.status(400).json({ error: 'guestDeviceId es requerido para la migración.' });
        }

        // 1. Migrate training_sessions
        let migratedSessions = 0;
        try {
            const updateResult = await db
                .update(trainingSessions)
                .set({ userId })
                .where(and(eq(trainingSessions.guestDeviceId, guestDeviceId), sql`${trainingSessions.userId} IS NULL`));
            migratedSessions = 1;
        } catch (e) {
            console.warn('[training] session migration warning:', e);
        }

        // 2. Migrate user_position_mastery
        try {
            await db
                .update(userPositionMastery)
                .set({ userId })
                .where(and(eq(userPositionMastery.guestDeviceId, guestDeviceId), sql`${userPositionMastery.userId} IS NULL`));
        } catch (e) {
            console.warn('[training] mastery migration warning:', e);
        }

        res.json({
            success: true,
            message: 'Tus entrenamientos y estadísticas locales se han vinculado con éxito a tu cuenta.',
        });
    } catch (error) {
        console.error('[training] Error claiming guest data:', error);
        res.status(500).json({ error: 'Error al vincular los datos de invitado.' });
    }
});

// ---------------------------------------------------------------------------
// 5. GET /training/sessions — Retrieve past training sessions
// ---------------------------------------------------------------------------
trainingRouter.get('/sessions', async (req: Request, res: Response) => {
    try {
        const { userId } = await getAuthContext(req);
        const queryUserId = (req.query.userId as string) || userId;
        const limit = parseInt((req.query.limit as string) || '50', 10);
        const offset = parseInt((req.query.offset as string) || '0', 10);

        let whereClause = sql`1=1`;
        if (queryUserId && queryUserId !== 'guest') {
            whereClause = sql`user_id = ${queryUserId}`;
        }

        const listQuery = sql`
            SELECT * FROM training_session_history
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const countQuery = sql`SELECT COUNT(*) as count FROM training_session_history WHERE ${whereClause}`;

        const [listResult, countResult] = await Promise.all([
            db.execute(listQuery),
            db.execute(countQuery),
        ]);

        const sessions = listResult.rows.map((row: any) => ({
            id: String(row.id),
            date: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
            totalTarget: Number(row.total_target) || 0,
            totalHits: Number(row.total_hits) || 0,
            accuracy: Number(row.accuracy) || 0,
            positionsCount: Number(row.positions_count) || 0,
            positions: Array.isArray(row.details) ? row.details : [],
        }));

        res.json({
            sessions,
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

// ---------------------------------------------------------------------------
// 7. GET /training/systems — List all classical billiard systems
// ---------------------------------------------------------------------------
trainingRouter.get('/systems', async (_req: Request, res: Response) => {
    try {
        const rows = await db.select().from(billiardSystems);
        if (rows.length === 0) {
            return res.json([BASE_50_SYSTEM_RECORD]);
        }
        res.json(rows);
    } catch (error) {
        console.error('Error fetching systems:', error);
        res.json([BASE_50_SYSTEM_RECORD]);
    }
});

// ---------------------------------------------------------------------------
// 8. GET /training/systems/:id — Fetch specific system (e.g. base-50)
// ---------------------------------------------------------------------------
trainingRouter.get('/systems/:id', async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const [row] = await db
            .select()
            .from(billiardSystems)
            .where(eq(billiardSystems.id, id))
            .limit(1);

        if (row) {
            return res.json(row);
        }

        if (id === 'base-50') {
            return res.json(BASE_50_SYSTEM_RECORD);
        }

        return res.status(404).json({ error: 'Sistema no encontrado' });
    } catch (error) {
        console.error(`Error fetching system ${req.params.id}:`, error);
        if (req.params.id === 'base-50') {
            return res.json(BASE_50_SYSTEM_RECORD);
        }
        res.status(500).json({ error: 'Error al obtener el sistema de billar' });
    }
});

