import type { TableSnapshot, TableSnapshotBall } from '@/src/domain/entities/TableSnapshot';
import type { ISnapshotRepository } from '@/src/domain/repositories/ISnapshotRepository';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8181';

interface VisionResponse {
    snapshotId: string;
    balls: { label: string; x: number; y: number }[];
    warning?: string;
    topDownImage?: string;
    detectionMethod?: string;
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

export interface VisionDetailedBall {
    label: string;
    x: number;
    y: number;
    radius?: number;
    confidence?: number;
    imageX?: number;
    imageY?: number;
    contactX?: number;
    contactY?: number;
    apparentRadius?: number;
    depthTier?: 'cercana' | 'media' | 'lejana';
    relativeDepth?: number;
}

export interface VisionDetailedResponse {
    snapshotId: string;
    balls: VisionDetailedBall[];
    detectedCorners?: { x: number; y: number }[];
    detectedDiamonds?: { x: number; y: number; rail: string; index: number }[];
    projectedGrid?: ProjectedGrid;
    cameraAngle?: string;
    tableOrientation?: 'horizontal' | 'vertical';
    aspectRatio?: number;
    topDownImage?: string;
    detectionMethod?: string;
    warning?: string;
}

export class ApiSnapshotRepository implements ISnapshotRepository {
    async submit(imageUri: string, corners?: { x: number; y: number }[]): Promise<TableSnapshot> {
        const data = await this.submitWithDetails(imageUri, corners);
        const balls: TableSnapshotBall[] = data.balls.map((b) => ({
            label: b.label as TableSnapshotBall['label'],
            x: b.x,
            y: b.y,
        }));

        return {
            id: data.snapshotId,
            balls,
            createdAt: new Date().toISOString(),
        };
    }

    async submitWithDetails(imageUri: string, corners?: { x: number; y: number }[]): Promise<VisionDetailedResponse> {
        const filename = imageUri.split('/').pop() ?? 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpeg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

        const formData = new FormData();

        if (!imageUri.startsWith('file://')) {
            const imageResponse = await fetch(imageUri);
            const blob = await imageResponse.blob();
            formData.append('image', blob, filename);
        } else {
            formData.append('image', {
                uri: imageUri,
                name: filename,
                type: mimeType,
            } as unknown as Blob);
        }

        if (corners && corners.length === 4) {
            formData.append('corners', JSON.stringify(corners));
        }

        const response = await fetch(`${API_URL}/vision/table-snapshot`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message = (errorBody as { error?: string }).error ?? `Error del servidor (${response.status})`;
            throw new Error(message);
        }

        return (await response.json()) as VisionDetailedResponse;
    }

    async getById(id: string): Promise<TableSnapshot | null> {
        const response = await fetch(`${API_URL}/vision/table-snapshot/${id}`);

        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Error fetching snapshot: ${response.status}`);

        const data = (await response.json()) as {
            snapshotId: string;
            balls: { label: string; x: number; y: number }[];
            createdAt: string;
        };

        return {
            id: data.snapshotId,
            balls: data.balls.map((b) => ({
                label: b.label as TableSnapshotBall['label'],
                x: b.x,
                y: b.y,
            })),
            createdAt: data.createdAt,
        };
    }
}
