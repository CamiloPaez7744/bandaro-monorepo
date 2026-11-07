import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { shotCatalog } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedCatalog(limitFiles?: number) {
    console.log('[catalog-seed] Starting shot catalog seed...');

    // 0. Ensure id column has an auto-increment sequence attached in PostgreSQL
    try {
        await db.execute(sql`
            CREATE SEQUENCE IF NOT EXISTS shot_catalog_id_seq;
            ALTER TABLE shot_catalog ALTER COLUMN id SET DEFAULT nextval('shot_catalog_id_seq');
            SELECT setval('shot_catalog_id_seq', COALESCE((SELECT MAX(id) FROM shot_catalog), 0) + 1, false);
        `);
        console.log('[catalog-seed] Auto-increment sequence verified for shot_catalog.id');
    } catch (seqErr) {
        console.warn('[catalog-seed] Sequence check note:', seqErr);
    }

    const dataDir = path.resolve(__dirname, '../../tmp/scraper/translated_data');
    if (!fs.existsSync(dataDir)) {
        console.error(`[catalog-seed] Data directory not found: ${dataDir}`);
        return;
    }

    const files = fs
        .readdirSync(dataDir)
        .filter((f) => f.endsWith('.json'))
        .sort();

    console.log(`[catalog-seed] Found ${files.length} JSON batch files in ${dataDir}`);

    const filesToProcess = limitFiles ? files.slice(0, limitFiles) : files;
    let totalInserted = 0;

    for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const filePath = path.join(dataDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const shots = JSON.parse(content);

            if (!Array.isArray(shots) || shots.length === 0) continue;

            const records = shots
                .filter((s: any) => s && s.externalId != null && s.cueBallX != null && s.cueBallTrajectory)
                .map((s: any) => ({
                    externalId: Number(s.externalId),
                    sourceType: String(s.sourceType || 'analysis'),
                    nameEs: String(s.nameEs || s.nameKo || 'Tiro de Catálogo'),
                    nameEn: s.nameEn ? String(s.nameEn) : null,
                    nameKo: s.nameKo ? String(s.nameKo) : null,
                    category: String(s.category || 'general'),
                    playerFirstName: s.playerFirstName ? String(s.playerFirstName) : null,
                    playerLastName: s.playerLastName ? String(s.playerLastName) : null,
                    playerNationality: s.playerNationality ? String(s.playerNationality) : null,
                    clubName: s.clubName ? String(s.clubName) : null,
                    description: s.description ? String(s.description) : null,
                    descriptionEs: s.description ? String(s.description) : null,
                    descriptionEn: s.descriptionEn ? String(s.descriptionEn) : null,
                    descriptionKo: s.descriptionKo ? String(s.descriptionKo) : null,
                    tips: s.tips ? String(s.tips) : null,
                    tipsEs: s.tips ? String(s.tips) : null,
                    tipsEn: s.tipsEn ? String(s.tipsEn) : null,
                    tipsKo: s.tipsKo ? String(s.tipsKo) : null,
                    cueBallX: String(s.cueBallX),
                    cueBallY: String(s.cueBallY),
                    objectBall1X: String(s.objectBall1X),
                    objectBall1Y: String(s.objectBall1Y),
                    objectBall2X: String(s.objectBall2X),
                    objectBall2Y: String(s.objectBall2Y),
                    cueBallLabel: String(s.cueBallLabel || 'white'),
                    ballChoice: Number(s.ballChoice ?? 1),
                    ballThickness: String(s.ballThickness ?? '0'),
                    railSpeed: String(s.railSpeed ?? '2.0'),
                    rotation: String(s.rotation ?? '0'),
                    effectX: String(s.effectX ?? '0'),
                    effectY: String(s.effectY ?? '0'),
                    powerLevel: Number(s.powerLevel ?? 2),
                    cueBallTrajectory: String(s.cueBallTrajectory || ''),
                    objectBall1Trajectory: s.objectBall1Trajectory ? String(s.objectBall1Trajectory) : null,
                    objectBall2Trajectory: s.objectBall2Trajectory ? String(s.objectBall2Trajectory) : null,
                    cueStickTrajectory: s.cueStickTrajectory ? String(s.cueStickTrajectory) : null,
                    isDifficult: Boolean(s.isDifficult),
                    isPosition: Boolean(s.isPosition),
                    isDefense: Boolean(s.isDefense),
                    isAvoidKiss: Boolean(s.isAvoidKiss),
                    hasAnalysis: Boolean(s.hasAnalysis),
                    youtubeUrl: s.youtubeUrl ? String(s.youtubeUrl) : null,
                    thumbnailUrl: s.thumbnailUrl ? String(s.thumbnailUrl) : null,
                    isPremium: Boolean(s.isPremium),
                }));

            // Insert in chunks of 50 to avoid parameter limit
            for (let j = 0; j < records.length; j += 50) {
                const chunk = records.slice(j, j + 50);
                await db
                    .insert(shotCatalog)
                    .values(chunk)
                    .onConflictDoNothing({ target: shotCatalog.externalId });
            }

            totalInserted += records.length;
            if ((i + 1) % 20 === 0 || i === filesToProcess.length - 1) {
                console.log(`[catalog-seed] Processed ${i + 1}/${filesToProcess.length} batches (~${totalInserted} shots processed)...`);
            }
        } catch (err) {
            console.error(`[catalog-seed] Error processing ${file}:`, err);
        }
    }

    console.log(`[catalog-seed] Finished seeding shot catalog! Total processed: ${totalInserted}`);
}

seedCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('[catalog-seed] Fatal error:', err);
        process.exit(1);
    });
