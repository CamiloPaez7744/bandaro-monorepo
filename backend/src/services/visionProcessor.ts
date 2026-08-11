import { execFile } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { v4 as uuid } from 'uuid';

import type { Point } from './cornerValidator.js';

const execFileAsync = promisify(execFile);

interface PythonBall {
    label: string;
    x: number;
    y: number;
    radius: number;
    confidence: number;
}

export interface VisionResult {
    balls: PythonBall[];
    topDownImage: string;
    totalDetected: number;
    totalValid: number;
    detectionMethod?: string;
    error?: string;
}

export async function processImage(
    imageBuffer: Buffer,
    corners?: Point[],
    mimeType: string = 'image/jpeg',
): Promise<VisionResult> {
    const jobId = uuid();
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const inputPath = join(tmpdir(), `bandaro_${jobId}.${ext}`);
    const pythonPath = process.env.PYTHON_PATH ?? 'python3';
    const scriptPath = join(
        import.meta.dirname ?? process.cwd(),
        '..',
        'python',
        'detect_balls.py',
    );

    try {
        await writeFile(inputPath, imageBuffer);

        const args = [scriptPath, inputPath];
        if (corners && corners.length === 4) {
            args.push(JSON.stringify(corners));
        }

        const { stdout, stderr } = await execFileAsync(pythonPath, args, {
            timeout: 30_000,
            maxBuffer: 10 * 1024 * 1024,
        });

        if (stderr) {
            console.warn('[visionProcessor] stderr:', stderr);
        }

        const result = JSON.parse(stdout) as {
            balls?: PythonBall[];
            topDownImage?: string;
            totalDetected?: number;
            totalValid?: number;
            detectionMethod?: string;
            error?: string;
        };

        return {
            balls: result.balls ?? [],
            topDownImage: result.topDownImage ?? '',
            totalDetected: result.totalDetected ?? 0,
            totalValid: result.totalValid ?? 0,
            detectionMethod: result.detectionMethod,
            error: result.error,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[visionProcessor] error:', message);
        return {
            balls: [],
            topDownImage: '',
            totalDetected: 0,
            totalValid: 0,
            error: `Vision processing failed: ${message}`,
        };
    } finally {
        await unlink(inputPath).catch(() => {});
    }
}
