import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { mockProcessImage } = vi.hoisted(() => {
    return { mockProcessImage: vi.fn() };
});

vi.mock('../../services/visionProcessor.js', () => ({
    processImage: (...args: any[]) => mockProcessImage(...args),
}));

vi.mock('../../db/index.js', () => {
    return {
        db: {
            insert: vi.fn(),
            select: vi.fn(),
            execute: vi.fn(),
        },
    };
});

import { db } from '../../db/index.js';
import { visionRouter } from '../vision.js';

describe('Vision Router', () => {
    const app = express();
    app.use(express.json());
    app.use('/vision', visionRouter);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /vision/table-snapshot', () => {
        it('returns 400 when no image file is uploaded', async () => {
            const res = await request(app).post('/vision/table-snapshot');
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Image file is required');
        });

        it('returns 422 when vision processor returns an error', async () => {
            mockProcessImage.mockResolvedValueOnce({
                error: 'Detection failed to find table',
                balls: [],
                totalDetected: 0,
            });

            const res = await request(app)
                .post('/vision/table-snapshot')
                .attach('image', Buffer.from('fake-image-bytes'), 'test.jpg');

            expect(res.status).toBe(422);
            expect(res.body.error).toBe('Detection failed to find table');
        });

        it('returns 422 when fewer than 3 balls are detected', async () => {
            mockProcessImage.mockResolvedValueOnce({
                balls: [
                    { label: 'white', x: 0.2, y: 0.3 },
                    { label: 'yellow', x: 0.5, y: 0.5 },
                ],
                totalDetected: 2,
                totalValid: 2,
            });

            const res = await request(app)
                .post('/vision/table-snapshot')
                .attach('image', Buffer.from('fake-image-bytes'), 'test.jpg');

            expect(res.status).toBe(422);
            expect(res.body.error).toContain('Solo se detectaron 2 bola(s)');
        });

        it('processes snapshot with valid corners and persists to database', async () => {
            const validCorners = [
                { x: 0.1, y: 0.1 },
                { x: 0.9, y: 0.1 },
                { x: 0.9, y: 0.9 },
                { x: 0.1, y: 0.9 },
            ];

            mockProcessImage.mockResolvedValueOnce({
                balls: [
                    { label: 'white', x: 0.2, y: 0.3 },
                    { label: 'yellow', x: 0.5, y: 0.5 },
                    { label: 'red', x: 0.8, y: 0.7 },
                ],
                topDownImage: 'data:image/jpeg;base64,...',
                totalDetected: 3,
                totalValid: 3,
                detectionMethod: 'auto_yolo',
                detectedCorners: validCorners,
            });

            const mockReturning = vi.fn().mockResolvedValue([{ id: 'snap-123' }]);
            const mockValues1 = vi.fn().mockReturnValue({ returning: mockReturning });
            const mockValues2 = vi.fn().mockResolvedValue([]);

            (db.insert as any)
                .mockReturnValueOnce({ values: mockValues1 })
                .mockReturnValueOnce({ values: mockValues2 });

            const res = await request(app)
                .post('/vision/table-snapshot')
                .field('corners', JSON.stringify(validCorners))
                .attach('image', Buffer.from('fake-image-bytes'), 'table.png');

            expect(res.status).toBe(200);
            expect(res.body.snapshotId).toBe('snap-123');
            expect(res.body.balls).toHaveLength(3);
            expect(res.body.topDownImage).toBe('data:image/jpeg;base64,...');
            expect(res.body.detectionMethod).toBe('auto_yolo');
        });

        it('handles invalid custom corners JSON and proceeds with auto-detection', async () => {
            mockProcessImage.mockResolvedValueOnce({
                balls: [
                    { label: 'white', x: 0.2, y: 0.3 },
                    { label: 'yellow', x: 0.5, y: 0.5 },
                    { label: 'red', x: 0.8, y: 0.7 },
                ],
                totalDetected: 3,
                totalValid: 3,
            });

            const mockReturning = vi.fn().mockResolvedValue([{ id: 'snap-456' }]);
            const mockValues1 = vi.fn().mockReturnValue({ returning: mockReturning });
            const mockValues2 = vi.fn().mockResolvedValue([]);

            (db.insert as any)
                .mockReturnValueOnce({ values: mockValues1 })
                .mockReturnValueOnce({ values: mockValues2 });

            const res = await request(app)
                .post('/vision/table-snapshot')
                .field('corners', 'invalid-json{')
                .attach('image', Buffer.from('fake-image-bytes'), 'table.jpg');

            expect(res.status).toBe(200);
            expect(res.body.snapshotId).toBe('snap-456');
        });

        it('handles non-convex/invalid custom corners and falls back', async () => {
            const invalidCorners = [{ x: 0, y: 0 }]; // only 1 corner

            mockProcessImage.mockResolvedValueOnce({
                balls: [
                    { label: 'white', x: 0.2, y: 0.3 },
                    { label: 'yellow', x: 0.5, y: 0.5 },
                    { label: 'red', x: 0.8, y: 0.7 },
                ],
                totalDetected: 3,
                totalValid: 3,
            });

            const mockReturning = vi.fn().mockResolvedValue([{ id: 'snap-789' }]);
            const mockValues1 = vi.fn().mockReturnValue({ returning: mockReturning });
            const mockValues2 = vi.fn().mockResolvedValue([]);

            (db.insert as any)
                .mockReturnValueOnce({ values: mockValues1 })
                .mockReturnValueOnce({ values: mockValues2 });

            const res = await request(app)
                .post('/vision/table-snapshot')
                .field('corners', JSON.stringify(invalidCorners))
                .attach('image', Buffer.from('fake-image-bytes'), 'table.jpg');

            expect(res.status).toBe(200);
            expect(res.body.snapshotId).toBe('snap-789');
        });

        it('handles db insertion failure gracefully and returns fallback snapshotId', async () => {
            mockProcessImage.mockResolvedValueOnce({
                balls: [
                    { label: 'white', x: 0.2, y: 0.3 },
                    { label: 'yellow', x: 0.5, y: 0.5 },
                    { label: 'red', x: 0.8, y: 0.7 },
                ],
                totalDetected: 3,
                totalValid: 3,
            });

            (db.insert as any).mockImplementation(() => {
                throw new Error('Database connection lost');
            });

            const res = await request(app)
                .post('/vision/table-snapshot')
                .attach('image', Buffer.from('fake-image-bytes'), 'table.jpg');

            expect(res.status).toBe(200);
            expect(res.body.snapshotId).toBeDefined();
            expect(res.body.balls).toHaveLength(3);
        });

        it('handles unexpected uncaught exception with status 500', async () => {
            mockProcessImage.mockRejectedValueOnce(new Error('Fatal memory allocation'));

            const res = await request(app)
                .post('/vision/table-snapshot')
                .attach('image', Buffer.from('fake-image-bytes'), 'table.jpg');

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Fatal memory allocation');
        });
    });

    describe('GET /vision/table-snapshot/:id', () => {
        it('returns 404 when snapshot is not found in database', async () => {
            (db.select as any).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const res = await request(app).get('/vision/table-snapshot/non-existent');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Snapshot not found');
        });

        it('returns 200 with snapshot and balls when found', async () => {
            const createdAt = new Date().toISOString();
            (db.select as any)
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([{ id: 'snap-1', createdAt }]),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([
                            { ballLabel: 'white', posX: '0.2', posY: '0.3' },
                            { ballLabel: 'yellow', posX: '0.5', posY: '0.5' },
                            { ballLabel: 'red', posX: '0.8', posY: '0.7' },
                        ]),
                    }),
                });

            const res = await request(app).get('/vision/table-snapshot/snap-1');
            expect(res.status).toBe(200);
            expect(res.body.snapshotId).toBe('snap-1');
            expect(res.body.createdAt).toBe(createdAt);
            expect(res.body.balls).toEqual([
                { label: 'white', x: 0.2, y: 0.3 },
                { label: 'yellow', x: 0.5, y: 0.5 },
                { label: 'red', x: 0.8, y: 0.7 },
            ]);
        });

        it('handles database error in get snapshot endpoint with 500', async () => {
            (db.select as any).mockImplementation(() => {
                throw new Error('DB read error');
            });

            const res = await request(app).get('/vision/table-snapshot/snap-error');
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Internal server error');
        });
    });
});
