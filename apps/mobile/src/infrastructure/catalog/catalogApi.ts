const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8181';

export interface CatalogShotRaw {
    id: number;
    external_id: number;
    category: string;
    name_es: string;
    name_ko: string;
    description: string;
    tips: string;
    player_first_name: string;
    player_last_name: string;
    player_nationality: string;
    club_name: string;
    cue_ball_x: string;
    cue_ball_y: string;
    object_ball_1_x: string;
    object_ball_1_y: string;
    object_ball_2_x: string;
    object_ball_2_y: string;
    ball_thickness: string;
    rail_speed: number;
    power_level: number;
    effect_x: string;
    effect_y: string;
    cue_ball_trajectory: string;
    object_ball_1_trajectory: string;
    object_ball_2_trajectory: string;
    is_difficult: boolean;
    is_position: boolean;
    is_defense: boolean;
    is_avoid_kiss: boolean;
    is_premium?: boolean;
    is_locked?: boolean;
    requires_premium?: boolean;
    youtube_url: string;
    is_favorite?: boolean;
}

export interface CatalogResponse {
    shots: CatalogShotRaw[];
    total: number;
    totalAvailable?: number;
    grandTotal?: number;
    limit: number;
    offset: number;
    isGuestPreview?: boolean;
    previewLimit?: number | null;
    userTier?: string;
    requiresLoginForFullCatalog?: boolean;
    message?: string | null;
}

export interface CategoryCount {
    category: string;
    count: string;
}

const BASE = `${API_URL}/shots`;

export async function fetchCatalog(params?: {
    category?: string;
    player?: string;
    search?: string;
    onlyFavorites?: boolean;
    userId?: string;
    limit?: number;
    offset?: number;
    accessToken?: string;
}): Promise<CatalogResponse> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.player) query.set('player', params.player);
    if (params?.search) query.set('search', params.search);
    if (params?.onlyFavorites) query.set('onlyFavorites', 'true');
    if (params?.userId) query.set('userId', params.userId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const headers: Record<string, string> = {};
    if (params?.accessToken) {
        headers.Authorization = `Bearer ${params.accessToken}`;
    }

    const url = `${BASE}/catalog${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchShotDetail(externalId: number, userId = 'guest'): Promise<CatalogShotRaw> {
    const res = await fetch(`${BASE}/catalog/${externalId}?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchCategories(): Promise<CategoryCount[]> {
    const res = await fetch(`${BASE}/catalog/categories`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function toggleFavoriteShot(
    shotId: number,
    userId = 'guest'
): Promise<{ success: boolean; isFavorite: boolean; shotId: number }> {
    const res = await fetch(`${BASE}/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId, userId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchFavoriteShotIds(userId = 'guest'): Promise<number[]> {
    const res = await fetch(`${BASE}/favorites?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.favoriteShotIds ?? [];
}

