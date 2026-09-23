import { Router, type Router as RouterType } from 'express';
import multer from 'multer';

import { db } from '../db/index.js';
import { ballPosition, tableSnapshot } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { validateCorners, type Point } from '../services/cornerValidator.js';
import {
    normalizeBalls,
    validateBallCount,
    enforceBilliardPhysicsNormalized,
} from '../services/normalizer.js';
import { processImage } from '../services/visionProcessor.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export const visionRouter: RouterType = Router();

// POST /vision/table-snapshot — detect balls from image (corners optional)
visionRouter.post('/table-snapshot', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Image file is required' });
            return;
        }

        // Parse optional corners
        let corners: Point[] | undefined;
        if (req.body.corners) {
            try {
                const parsed: Point[] = JSON.parse(req.body.corners as string);
                const validation = validateCorners(parsed);
                if (validation.valid) {
                    corners = parsed;
                } else {
                    console.warn('[vision] custom corners not strictly valid, falling back to auto-detection:', validation.error);
                }
            } catch {
                console.warn('[vision] invalid corners JSON, falling back to auto-detection');
            }
        }

        console.log('[vision] processing snapshot, auto-detection:', !corners);

        const visionResult = await processImage(req.file.buffer, corners ?? undefined, req.file.mimetype);

        if (visionResult.error) {
            res.status(422).json({
                error: visionResult.error,
                balls: [],
                totalDetected: visionResult.totalDetected,
            });
            return;
        }

        const normalized = enforceBilliardPhysicsNormalized(normalizeBalls(visionResult.balls));
        const countCheck = validateBallCount(normalized);

        if (normalized.length < 3) {
            res.status(422).json({
                error: `Solo se detectaron ${normalized.length} bola(s). Se necesitan exactamente 3 para continuar.`,
                balls: normalized,
                totalDetected: visionResult.totalDetected,
            });
            return;
        }

        // Take only the first 3 balls (e.g., if extras were detected)
        const threeBalls = normalized.slice(0, 3);

        const [snapshot] = await db
            .insert(tableSnapshot)
            .values({ sourceImageUrl: null })
            .returning({ id: tableSnapshot.id });

        await db.insert(ballPosition).values(
            threeBalls.map((b) => ({
                snapshotId: snapshot.id,
                ballLabel: b.label,
                posX: String(b.x),
                posY: String(b.y),
            })),
        );

        console.log(
            `[vision] snapshot ${snapshot.id}: method=${visionResult.detectionMethod}, detected=${visionResult.totalDetected}, valid=${visionResult.totalValid}`,
        );

        res.json({
            snapshotId: snapshot.id,
            balls: threeBalls,
            warning: countCheck.warning,
            topDownImage: visionResult.topDownImage,
            detectionMethod: visionResult.detectionMethod,
            detectedCorners: visionResult.detectedCorners,
            detectedDiamonds: visionResult.detectedDiamonds,
            projectedGrid: visionResult.projectedGrid,
            cameraAngle: visionResult.cameraAngle,
            tableOrientation: visionResult.tableOrientation,
            aspectRatio: visionResult.aspectRatio,
        });
    } catch (error) {
        console.error('[vision] error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});

// GET /vision/table-snapshot/:id — retrieve a saved snapshot
visionRouter.get('/table-snapshot/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const snapshots = await db
            .select()
            .from(tableSnapshot)
            .where(eq(tableSnapshot.id, id))
            .limit(1);

        if (snapshots.length === 0) {
            res.status(404).json({ error: 'Snapshot not found' });
            return;
        }

        const positions = await db
            .select()
            .from(ballPosition)
            .where(eq(ballPosition.snapshotId, id));

        res.json({
            snapshotId: snapshots[0].id,
            createdAt: snapshots[0].createdAt,
            balls: positions.map((p) => ({
                label: p.ballLabel,
                x: Number(p.posX),
                y: Number(p.posY),
            })),
        });
    } catch (error) {
        console.error('[vision] get snapshot error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
