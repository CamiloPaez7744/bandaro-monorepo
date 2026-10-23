import { describe, expect, it, vi, beforeEach } from 'vitest';
import { promisify } from 'node:util';

const { mockExecFileAsync, mockWriteFile, mockUnlink } = vi.hoisted(() => {
    const mockExecFileAsync = vi.fn();
    const mockWriteFile = vi.fn();
    const mockUnlink = vi.fn();
    return { mockExecFileAsync, mockWriteFile, mockUnlink };
});

vi.mock('node:child_process', () => {
    const mockExecFile: any = vi.fn();
    mockExecFile[promisify.custom] = (...args: any[]) => mockExecFileAsync(...args);
    return {
        execFile: mockExecFile,
    };
});

vi.mock('node:fs/promises', () => ({
    writeFile: (...args: any[]) => mockWriteFile(...args),
    unlink: (...args: any[]) => mockUnlink(...args),
}));

import { processImage } from '../visionProcessor.js';

describe('visionProcessor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWriteFile.mockResolvedValue(undefined);
        mockUnlink.mockResolvedValue(undefined);
    });

    it('processes image buffer successfully and parses JSON output from detector', async () => {
        const fakeOutput = {
            balls: [
                { label: 'white', x: 0.2, y: 0.3, radius: 10, confidence: 0.95 },
                { label: 'yellow', x: 0.5, y: 0.5, radius: 10, confidence: 0.92 },
                { label: 'red', x: 0.8, y: 0.7, radius: 10, confidence: 0.98 },
            ],
            topDownImage: 'data:image/jpeg;base64,mockedImage',
            totalDetected: 3,
            totalValid: 3,
            detectionMethod: 'hough_yolo_ensemble',
            detectedCorners: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 0, y: 1 },
            ],
            detectedDiamonds: [{ x: 10, y: 0, rail: 'top', index: 1 }],
            projectedGrid: {
                verticalLines: [],
                horizontalLines: [],
            },
            cameraAngle: 'perspective',
            tableOrientation: 'horizontal',
            aspectRatio: 2.0,
        };

        mockExecFileAsync.mockResolvedValue({
            stdout: JSON.stringify(fakeOutput),
            stderr: '',
        });

        const buffer = Buffer.from('fake-image-bytes');
        const corners = [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
        ];

        const result = await processImage(buffer, corners, 'image/png');

        expect(result.balls).toHaveLength(3);
        expect(result.totalDetected).toBe(3);
        expect(result.totalValid).toBe(3);
        expect(result.detectionMethod).toBe('hough_yolo_ensemble');
        expect(result.topDownImage).toBe('data:image/jpeg;base64,mockedImage');
        expect(result.detectedCorners).toHaveLength(4);
        expect(result.tableOrientation).toBe('horizontal');
        expect(result.error).toBeUndefined();
    });

    it('handles stderr logs from python process', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const fakeOutput = {
            balls: [],
            topDownImage: '',
            totalDetected: 0,
            totalValid: 0,
        };

        mockExecFileAsync.mockResolvedValue({
            stdout: JSON.stringify(fakeOutput),
            stderr: 'warning: torch cuda not available',
        });

        const result = await processImage(Buffer.from('bytes'));
        expect(result.totalDetected).toBe(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[visionProcessor] stderr:'),
            expect.stringContaining('torch cuda not available')
        );
        consoleWarnSpy.mockRestore();
    });

    it('returns error result when python execution fails or throws', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        mockExecFileAsync.mockRejectedValue(new Error('Process timed out after 30000ms'));

        const result = await processImage(Buffer.from('bytes'));
        expect(result.error).toContain('Vision processing failed');
        expect(result.balls).toEqual([]);
        expect(result.totalDetected).toBe(0);
        consoleErrorSpy.mockRestore();
    });

    it('handles non-Error exception cleanly', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        mockWriteFile.mockRejectedValue('Disk full');

        const result = await processImage(Buffer.from('bytes'));
        expect(result.error).toContain('Disk full');
        consoleErrorSpy.mockRestore();
    });
});
