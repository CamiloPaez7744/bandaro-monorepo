import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8181';
const GUEST_DEVICE_ID_KEY = '@bandaro/guest_device_id';

export async function getOrCreateGuestDeviceId(): Promise<string> {
    try {
        let deviceId = await AsyncStorage.getItem(GUEST_DEVICE_ID_KEY);
        if (!deviceId) {
            deviceId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await AsyncStorage.setItem(GUEST_DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    } catch {
        return `guest_${Date.now()}_tmp`;
    }
}

export interface TrainingDrillPayload {
    id: string;
    name?: string;
    category?: string;
    target: number;
    hits: number;
    accuracy: number;
    perceivedDifficulty?: number; // 1 to 5
    failureReason?: 'speed' | 'spin' | 'angle' | 'kiss' | 'stroke' | 'none';
    userNotes?: string;
}

export interface TrainingSessionPayload {
    id?: string;
    userId?: string;
    guestDeviceId?: string;
    sessionType?: 'guided_route' | 'free_practice' | 'weakness_review';
    nodeId?: string;
    durationSeconds?: number;
    totalTarget: number;
    totalHits: number;
    accuracy: number;
    positionsCount: number;
    positions: TrainingDrillPayload[];
}

export interface TrainingSessionResponse {
    success: boolean;
    sessionId?: string;
    session?: any;
    xpEarned?: number;
    overallAccuracy?: string;
    strugglingPositionsCount?: number;
    isGuest?: boolean;
    suggestLogin?: boolean;
    message?: string;
    error?: string;
}

export interface SmartReviewPosition {
    id: string;
    name: string;
    category: string;
    hint?: string;
    difficulty: number;
    white: { x: number; y: number };
    yellow: { x: number; y: number };
    red: { x: number; y: number };
    trajectory?: { x: number; y: number }[];
    lifetimeAccuracy: number;
    totalAttempts: number;
    totalHits: number;
    masteryStatus: string;
    perceivedDifficultyAvg: number | null;
    nextReviewDue: string;
}

export interface SmartReviewResponse {
    success: boolean;
    positions: SmartReviewPosition[];
    count: number;
    message?: string;
    error?: string;
}

/**
 * Persists completed training session stats to the backend PostgreSQL database
 */
export async function saveTrainingSessionToBackend(
    payload: TrainingSessionPayload,
    accessToken?: string
): Promise<TrainingSessionResponse> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_URL}/training/session`, {
            method: 'POST',
            headers,
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

/**
 * Retrieves positions due for Spaced Repetition (accuracy < 60% or scheduled review)
 */
export async function fetchSmartReviewPositions(
    accessToken?: string,
    guestDeviceId?: string
): Promise<SmartReviewResponse> {
    try {
        const headers: Record<string, string> = {};
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        const query = guestDeviceId ? `?guestDeviceId=${encodeURIComponent(guestDeviceId)}` : '';
        const res = await fetch(`${API_URL}/training/smart-review${query}`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    } catch (err: any) {
        return {
            success: false,
            positions: [],
            count: 0,
            error: err?.message || 'Error fetching review positions',
        };
    }
}

/**
 * Migrates local guest sessions and mastery data into the authenticated user profile
 */
export async function claimGuestTrainingData(
    guestDeviceId: string,
    accessToken: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const res = await fetch(`${API_URL}/training/claim-guest-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ guestDeviceId }),
        });
        return res.json();
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Error claiming guest data',
        };
    }
}

/**
 * Fetches user training sessions from PostgreSQL database
 */
export async function fetchTrainingSessions(
    accessToken?: string,
    userId?: string
): Promise<any[]> {
    try {
        const headers: Record<string, string> = {};
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }
        const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
        const res = await fetch(`${API_URL}/training/sessions${query}`, { headers });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.sessions) ? data.sessions : [];
    } catch {
        return [];
    }
}
