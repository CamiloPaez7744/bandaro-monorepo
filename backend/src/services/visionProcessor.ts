import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { v4 as uuid } from 'uuid';

import type { Point } from './cornerValidator.js';

const execFileAsync = promisify(execFile);

export interface PythonBall {
    label: string;
    x: number;
    y: number;
    radius: number;
    confidence: number;
    imageX?: number;
    imageY?: number;
    contactX?: number;
    contactY?: number;
    apparentRadius?: number;
    depthTier?: 'cercana' | 'media' | 'lejana';
    relativeDepth?: number;
    ballColor?: string;
}

export interface DetectedDiamond {
    x: number;
    y: number;
    rail: string;
    index: number;
}

export interface ProjectedGridLine {
    diamondIndex: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface ProjectedGrid {
    verticalLines: ProjectedGridLine[];
    horizontalLines: ProjectedGridLine[];
}

export interface VisionResult {
    balls: PythonBall[];
    topDownImage: string;
    totalDetected: number;
    totalValid: number;
    detectionMethod?: string;
    detectedCorners?: Point[];
    detectedDiamonds?: DetectedDiamond[];
    projectedGrid?: ProjectedGrid;
    cameraAngle?: string;
    tableOrientation?: 'horizontal' | 'vertical';
    aspectRatio?: number;
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
    const defaultWinPython = 'C:\\Users\\camil\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe';
    const pythonPath = process.env.PYTHON_PATH ?? (process.platform === 'win32' ? defaultWinPython : 'python3');
    let scriptPath = join(
        import.meta.dirname ?? process.cwd(),
        '..',
        'python',
        'detect_balls.py',
    );
    if (!existsSync(scriptPath)) {
        scriptPath = join(
            import.meta.dirname ?? process.cwd(),
            '..',
            '..',
            'src',
            'python',
            'detect_balls.py',
        );
    }

    try {
        await writeFile(inputPath, imageBuffer);

        const args = [scriptPath, inputPath];
        if (corners && corners.length === 4) {
            args.push(JSON.stringify(corners));
        }

        const { stdout, stderr } = await execFileAsync(pythonPath, args, {
            timeout: 30_000,
            maxBuffer: 15 * 1024 * 1024,
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
            detectedCorners?: Point[];
            detectedDiamonds?: DetectedDiamond[];
            projectedGrid?: ProjectedGrid;
            cameraAngle?: string;
            tableOrientation?: 'horizontal' | 'vertical';
            aspectRatio?: number;
            error?: string;
        };

        return {
            balls: result.balls ?? [],
            topDownImage: result.topDownImage ?? '',
            totalDetected: result.totalDetected ?? 0,
            totalValid: result.totalValid ?? 0,
            detectionMethod: result.detectionMethod,
            detectedCorners: result.detectedCorners,
            detectedDiamonds: result.detectedDiamonds,
            projectedGrid: result.projectedGrid,
            cameraAngle: result.cameraAngle,
            tableOrientation: result.tableOrientation,
            aspectRatio: result.aspectRatio,
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
