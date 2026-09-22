const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8181';

export interface TrainingSessionPayload {
    id: string;
    userId?: string;
    totalTarget: number;
    totalHits: number;
    accuracy: number;
    positionsCount: number;
    positions: {
        id: string;
        name: string;
        category: string;
        target: number;
        hits: number;
        accuracy: number;
    }[];
}

export interface TrainingSessionResponse {
    success: boolean;
    session?: any;
    message?: string;
    error?: string;
}

/**
 * Persists completed training session stats to the backend PostgreSQL database
 */
export async function saveTrainingSessionToBackend(
    payload: TrainingSessionPayload
): Promise<TrainingSessionResponse> {
    try {
        const response = await fetch(`${API_URL}/training/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[Training API] Backend responded with status ${response.status}:`, errorText);
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText}`,
            };
        }

        const data = await response.json();
        return data;
    } catch (err: any) {
        console.warn('[Training API] Network error saving training session to backend:', err);
        return {
            success: false,
            error: err?.message || 'Network error',
        };
    }
}
