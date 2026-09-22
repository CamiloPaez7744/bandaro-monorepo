import type { Point2D } from '@/src/presentation/screens/Training/trainingData';

export interface CatalogShot {
    id: number;
    category: string;
    categoryName: string;
    description: string;
    tips: string;
    playerName: string;
    playerNationality: string;
    clubName: string;

    white: Point2D;
    yellow: Point2D;
    red: Point2D;

    cueBallTrajectory: Point2D[];
    objectBall1Trajectory: Point2D[];
    objectBall2Trajectory: Point2D[];

    ballThickness: number;
    railSpeed: number;
    powerLevel: number;
    effectX: number;
    effectY: number;

    isDifficult: boolean;
    isPosition: boolean;
    isDefense: boolean;
    isAvoidKiss: boolean;
    youtubeUrl: string | null;
}

const BB_WIDTH = 580;
const BB_HEIGHT = 290;
const TABLE_W = 284;
const TABLE_H = 142;

const CATEGORY_NAMES: Record<string, string> = {
    draw: 'Retro',
    side_spin: 'Efecto Lateral',
    follow: 'Seguimiento',
    cut: 'Corte',
    big_spin: 'Gran Rotación',
    standing: 'Vertical',
    double_cushion: 'Doble Banda',
    cross_table: 'Travesía',
    reverse: 'Reversa',
    come_back: 'Regreso',
    bounce: 'Rebote',
    bank_shot: 'Banco',
    basic: 'Básico',
    rescue: 'Rescate',
    ball_choice: 'Selección',
};

export function pixelToTable(x: number, y: number): Point2D {
    return {
        x: Math.round(((x / BB_WIDTH) * TABLE_W) * 100) / 100,
        y: Math.round(((y / BB_HEIGHT) * TABLE_H) * 100) / 100,
    };
}

export function parseTrajectory(raw: string): Point2D[] {
    if (!raw || raw.length < 5) return [];

    const parts = raw.split('|');
    const points: Point2D[] = [];

    for (let i = 0; i < parts.length - 2; i += 3) {
        const frame = parseInt(parts[i], 10);
        if (isNaN(frame)) continue;

        const x = parseFloat(parts[i + 1]);
        const y = parseFloat(parts[i + 2]);
        if (isNaN(x) || isNaN(y)) continue;

        points.push(pixelToTable(x, y));
    }

    return points;
}

export function thicknessToEffect(thickness: number): { x: number; y: number; magnitude: number } {
    const x = Math.min(1, Math.max(-1, thickness / -12));
    const y = 0;
    return {
        x: Math.round(x * 100) / 100,
        y,
        magnitude: Math.round(Math.abs(x) * 100) / 100,
    };
}

export function railSpeedToVelocity(railSpeed: number): number {
    const speeds: Record<number, number> = { 0: 1.2, 1: 2.2, 2: 3.5, 3: 5.2, 4: 6.0, 5: 7.5 };
    return speeds[railSpeed] ?? 3.5;
}

export function adaptCatalogShot(raw: any): CatalogShot {
    return {
        id: raw.external_id,
        category: raw.category,
        categoryName: CATEGORY_NAMES[raw.category] ?? raw.category,
        description: raw.description ?? '',
        tips: raw.tips ?? '',
        playerName: [raw.player_first_name, raw.player_last_name].filter(Boolean).join(' '),
        playerNationality: raw.player_nationality ?? '',
        clubName: raw.club_name ?? '',

        white: pixelToTable(raw.cue_ball_x, raw.cue_ball_y),
        yellow: pixelToTable(raw.object_ball_1_x, raw.object_ball_1_y),
        red: pixelToTable(raw.object_ball_2_x, raw.object_ball_2_y),

        cueBallTrajectory: parseTrajectory(raw.cue_ball_trajectory),
        objectBall1Trajectory: parseTrajectory(raw.object_ball_1_trajectory),
        objectBall2Trajectory: parseTrajectory(raw.object_ball_2_trajectory),

        ballThickness: raw.ball_thickness,
        railSpeed: raw.rail_speed,
        powerLevel: raw.power_level,
        effectX: raw.effect_x,
        effectY: raw.effect_y,

        isDifficult: raw.is_difficult,
        isPosition: raw.is_position,
        isDefense: raw.is_defense,
        isAvoidKiss: raw.is_avoid_kiss,
        youtubeUrl: raw.youtube_url,
    };
}

export function adaptCatalogShotList(raw: any[]): CatalogShot[] {
    return raw.map(adaptCatalogShot);
}
