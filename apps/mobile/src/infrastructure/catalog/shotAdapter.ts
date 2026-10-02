import type { Point2D } from '@/src/presentation/screens/Training/trainingData';
import {
    translateSourceSpin,
    spinToClock,
    calibrateSourceSpeed,
    type SpinEffect,
    type CalibratedPower,
} from '@bandaro/core';

export type CatalogLanguage = 'es' | 'en' | 'ko';

export interface CatalogShot {
    id: number;
    category: string;
    categoryName: string;
    nameEs: string;
    nameEn: string;
    nameKo: string;

    description: string;
    descriptionEs: string;
    descriptionEn: string;
    descriptionKo: string;

    tips: string;
    tipsEs: string;
    tipsEn: string;
    tipsKo: string;

    playerName: string;
    playerNationality: string;
    clubName: string;

    white: Point2D;
    yellow: Point2D;
    red: Point2D;

    cueBallTrajectory: Point2D[];
    objectBall1Trajectory: Point2D[];
    objectBall2Trajectory: Point2D[];
    cueStickTrajectory: Point2D[];

    ballThickness: number;
    railSpeed: number;
    powerLevel: number;
    effectX: number;
    effectY: number;

    spinEffect?: SpinEffect;
    spinHour?: number;
    spinTips?: number;
    calibratedPower?: CalibratedPower;

    isDifficult: boolean;
    isPosition: boolean;
    isDefense: boolean;
    isAvoidKiss: boolean;
    youtubeUrl: string | null;
    isFavorite: boolean;
}

const BB_WIDTH = 500;
const BB_HEIGHT = 250;
const TABLE_W = 284;
const TABLE_H = 142;

export const CATEGORY_NAMES_ES: Record<string, string> = {
    draw: 'Cajones (Retros)',
    side_spin: 'Rodadas',
    follow: 'Corridos (Seguimiento)',
    cut: 'Corte Fino',
    big_spin: 'Doble Vuelta (Gran Vuelta)',
    standing: 'Línea (Vertical)',
    double_cushion: 'Dos Bandas (Doble Banda)',
    cross_table: 'Zigzag (Pasones)',
    reverse: 'Renversé (Contra-efecto)',
    come_back: 'Retorno (Tiki-Tiki)',
    bounce: 'Curvón (Bounding)',
    bank_shot: 'Banda Previa (Previas)',
    basic: 'Fundamentos (Básico)',
    rescue: 'Tikis de Truco (Fantasía)',
    ball_choice: 'Selección de Tacada',
};

export const CATEGORY_NAMES_EN: Record<string, string> = {
    draw: 'Draw Shot',
    side_spin: 'Side Spin',
    follow: 'Follow Shot',
    cut: 'Cut Shot',
    big_spin: 'Big Spin',
    standing: 'Standing',
    double_cushion: 'Double Cushion',
    cross_table: 'Cross Table',
    reverse: 'Reverse',
    come_back: 'Come Back',
    bounce: 'Bounce',
    bank_shot: 'Bank Shot',
    basic: 'Basic',
    rescue: 'Rescue',
    ball_choice: 'Ball Choice',
};

export const CATEGORY_NAMES_KO: Record<string, string> = {
    draw: '뒤돌리기',
    side_spin: '옆돌리기',
    follow: '앞돌리기',
    cut: '비켜치기',
    big_spin: '대회전',
    standing: '세워치기',
    double_cushion: '더블쿠션',
    cross_table: '횡단',
    reverse: '리버스',
    come_back: '되돌아오기',
    bounce: '바운딩',
    bank_shot: '뱅크샷',
    basic: '기본',
    rescue: '구난구',
    ball_choice: '구종선택',
};

export const CATEGORY_NAMES = CATEGORY_NAMES_ES;

export function getLocalizedCategoryName(category: string, lang: CatalogLanguage = 'es'): string {
    if (lang === 'en') return CATEGORY_NAMES_EN[category] ?? category;
    if (lang === 'ko') return CATEGORY_NAMES_KO[category] ?? category;
    return CATEGORY_NAMES_ES[category] ?? category;
}

export function getLocalizedShot(
    shot: CatalogShot,
    lang: CatalogLanguage = 'es'
): {
    name: string;
    description: string;
    tips: string;
} {
    if (lang === 'en') {
        return {
            name: shot.nameEn || CATEGORY_NAMES_EN[shot.category] || shot.categoryName,
            description: shot.descriptionEn || shot.descriptionEs || shot.description,
            tips: shot.tipsEn || shot.tipsEs || shot.tips,
        };
    }
    if (lang === 'ko') {
        return {
            name: shot.nameKo || CATEGORY_NAMES_KO[shot.category] || shot.categoryName,
            description: shot.descriptionKo || shot.descriptionEs || shot.description,
            tips: shot.tipsKo || shot.tipsEs || shot.tips,
        };
    }
    return {
        name: CATEGORY_NAMES_ES[shot.category] || shot.nameEs || shot.categoryName,
        description: shot.descriptionEs || shot.description,
        tips: shot.tipsEs || shot.tips,
    };
}

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

        const pt = pixelToTable(x, y);
        // Avoid consecutive duplicate points (ball at rest before shot)
        if (
            points.length === 0 ||
            Math.hypot(points[points.length - 1].x - pt.x, points[points.length - 1].y - pt.y) > 0.4
        ) {
            points.push(pt);
        }
    }

    return points;
}

/**
 * Generates a realistic projected carom trajectory for shots that don't have
 * raw multi-point recorded trajectories from Billiard Bible.
 */
export function synthesizeCaromTrajectory(
    white: Point2D,
    yellow: Point2D,
    red: Point2D,
    category: string,
    thickness: number = 0.5,
    effectX: number = 0
): Point2D[] {
    const points: Point2D[] = [white];

    // Cushion boundaries (taking ball radius ~3.6 into account)
    const minX = 4.0;
    const maxX = 280.0;
    const minY = 4.0;
    const maxY = 138.0;

    const dx = yellow.x - white.x;
    const dy = yellow.y - white.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) {
        return [white, red];
    }

    // Normal and tangent unit vectors between white and yellow
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;

    // Contact point on yellow ball (ball diameter ~ 7.1)
    const contactX = yellow.x - nx * 6.8;
    const contactY = yellow.y - ny * 6.8;
    points.push({
        x: Math.round(Math.max(minX, Math.min(maxX, contactX)) * 10) / 10,
        y: Math.round(Math.max(minY, Math.min(maxY, contactY)) * 10) / 10,
    });

    // Deflection direction after impact
    const spinFactor = effectX * 0.4;
    const cutSign = (tx * (white.x - yellow.x) + ty * (white.y - yellow.y)) >= 0 ? 1 : -1;
    const defX = nx * (1 - Math.abs(thickness)) + tx * cutSign * 0.8 + spinFactor * 0.3;
    const defY = ny * (1 - Math.abs(thickness)) + ty * cutSign * 0.8;
    const defLen = Math.hypot(defX, defY) || 1;
    const dirX = defX / defLen;
    const dirY = defY / defLen;

    // First cushion rebound
    let rail1X = contactX + dirX * 70;
    let rail1Y = dirY < 0 ? minY : maxY;
    if (dirX > 0 && rail1X > maxX) {
        rail1X = maxX;
        rail1Y = contactY + dirY * ((maxX - contactX) / (dirX || 0.1));
    } else if (dirX < 0 && rail1X < minX) {
        rail1X = minX;
        rail1Y = contactY + dirY * ((minX - contactX) / (dirX || 0.1));
    }
    points.push({
        x: Math.round(Math.max(minX, Math.min(maxX, rail1X)) * 10) / 10,
        y: Math.round(Math.max(minY, Math.min(maxY, rail1Y)) * 10) / 10,
    });

    // Intermediate cushion / waypoint heading towards red
    const midX = (rail1X + red.x) / 2 + (spinFactor > 0 ? 15 : -15);
    const midY = rail1Y < TABLE_H / 2 ? maxY - 10 : minY + 10;
    points.push({
        x: Math.round(Math.max(minX, Math.min(maxX, midX)) * 10) / 10,
        y: Math.round(Math.max(minY, Math.min(maxY, midY)) * 10) / 10,
    });

    // Final destination: red ball contact
    points.push({
        x: Math.round(Math.max(minX, Math.min(maxX, red.x)) * 10) / 10,
        y: Math.round(Math.max(minY, Math.min(maxY, red.y)) * 10) / 10,
    });

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
    const white = pixelToTable(raw.cue_ball_x, raw.cue_ball_y);
    const yellow = pixelToTable(raw.object_ball_1_x, raw.object_ball_1_y);
    const red = pixelToTable(raw.object_ball_2_x, raw.object_ball_2_y);

    const parsedCueTrajectory = parseTrajectory(raw.cue_ball_trajectory);
    const cueBallTrajectory = parsedCueTrajectory.length >= 2
        ? parsedCueTrajectory
        : synthesizeCaromTrajectory(
            white,
            yellow,
            red,
            raw.category,
            raw.ball_thickness,
            raw.effect_x
        );

    const nameEs = CATEGORY_NAMES_ES[raw.category] || raw.name_es || raw.category;
    const nameEn = CATEGORY_NAMES_EN[raw.category] || raw.name_en || raw.category;
    const nameKo = raw.name_ko || CATEGORY_NAMES_KO[raw.category] || raw.category;

    const descriptionEs = raw.description_es || raw.description || '';
    const descriptionEn = raw.description_en || '';
    const descriptionKo = raw.description_ko || '';

    const tipsEs = raw.tips_es || raw.tips || '';
    const tipsEn = raw.tips_en || '';
    const tipsKo = raw.tips_ko || '';

    const playId = raw.external_id ?? raw.id;
    let spinInput: any = null;
    if (raw.spin_hour !== undefined && raw.spin_hour !== null && raw.spin_tips !== undefined && raw.spin_tips !== null) {
        spinInput = { hour: parseFloat(raw.spin_hour), tips: parseFloat(raw.spin_tips) };
    } else if (raw.ball_contract_point && typeof raw.ball_contract_point === 'string') {
        const parts = raw.ball_contract_point.split('|');
        const hr = parseFloat(parts[0]);
        const tp = parseFloat(parts[1] ?? '0');
        if (!isNaN(hr)) {
            spinInput = { hour: hr, tips: isNaN(tp) ? 2.5 : tp };
        }
    }

    if (!spinInput) {
        if (raw.effect_x !== undefined && raw.effect_y !== undefined) {
            spinInput = {
                x: parseFloat(raw.effect_x),
                y: parseFloat(raw.effect_y),
                rotation: raw.rotation !== undefined && raw.rotation !== null ? parseFloat(raw.rotation) : undefined,
            };
        } else {
            spinInput = raw.tips || raw.spin || 'center';
        }
    }

    const spinEffect = translateSourceSpin(spinInput, playId);
    const clock = (spinInput && typeof spinInput === 'object' && spinInput.hour !== undefined)
        ? { hour: spinInput.hour, tips: spinInput.tips ?? 2.5, description: `${spinInput.hour} o'clock` }
        : spinToClock(spinEffect);

    const rawSpeed = raw.rail_speed !== undefined && raw.rail_speed !== null
        ? parseFloat(raw.rail_speed)
        : (raw.speed ?? raw.power_level ?? 3.5);
    const powerCalib = calibrateSourceSpeed(rawSpeed);

    return {
        id: raw.external_id,
        category: raw.category,
        categoryName: CATEGORY_NAMES_ES[raw.category] ?? raw.category,
        nameEs,
        nameEn,
        nameKo,

        description: descriptionEs,
        descriptionEs,
        descriptionEn,
        descriptionKo,

        tips: tipsEs,
        tipsEs,
        tipsEn,
        tipsKo,

        playerName: [raw.player_first_name, raw.player_last_name].filter(Boolean).join(' '),
        playerNationality: raw.player_nationality ?? '',
        clubName: raw.club_name ?? '',

        white,
        yellow,
        red,

        cueBallTrajectory,
        objectBall1Trajectory: parseTrajectory(raw.object_ball_1_trajectory),
        objectBall2Trajectory: parseTrajectory(raw.object_ball_2_trajectory),
        cueStickTrajectory: parseTrajectory(raw.cue_stick_trajectory),

        ballThickness: raw.ball_thickness,
        railSpeed: powerCalib.power,
        powerLevel: powerCalib.power,
        effectX: spinEffect.x,
        effectY: spinEffect.y,

        spinEffect,
        spinHour: clock.hour,
        spinTips: clock.tips,
        calibratedPower: powerCalib,

        isDifficult: raw.is_difficult,
        isPosition: raw.is_position,
        isDefense: raw.is_defense,
        isAvoidKiss: raw.is_avoid_kiss,
        youtubeUrl: raw.youtube_url,
        isFavorite: Boolean(raw.is_favorite),
    };
}

export function adaptCatalogShotList(raw: any[]): CatalogShot[] {
    return raw.map(adaptCatalogShot);
}

/**
 * Calculates the exact initial aim direction vector towards the true pre-impact contact point
 * on Object Ball 1. Uses the authoritative cue stick stroke vector if available, avoiding pixel-quantization errors.
 */
export function getShotAimVector(shot: {
    white: Point2D;
    yellow: Point2D;
    red?: Point2D;
    cueBallTrajectory?: Point2D[];
    cueStickTrajectory?: Point2D[];
}): { x: number; y: number } {
    const cueStickTraj = shot.cueStickTrajectory;
    if (cueStickTraj && cueStickTraj.length >= 2) {
        const pFirst = cueStickTraj[0];
        const pLast = cueStickTraj[cueStickTraj.length - 1];
        const dx = pLast.x - pFirst.x;
        const dy = pLast.y - pFirst.y;
        const len = Math.hypot(dx, dy);
        if (len > 0.5) {
            return { x: dx / len, y: dy / len };
        }
    }

    const traj = shot.cueBallTrajectory;
    if (traj && traj.length >= 2) {
        for (let i = 1; i < traj.length; i++) {
            const dx = traj[i].x - shot.white.x;
            const dy = traj[i].y - shot.white.y;
            const d = Math.hypot(dx, dy);
            if (d >= 3.5) {
                return { x: dx / d, y: dy / d };
            }
        }
    }

    // Default: aim directly along the center line between white and yellow
    const dx = shot.yellow.x - shot.white.x;
    const dy = shot.yellow.y - shot.white.y;
    const len = Math.hypot(dx, dy);
    return len > 0.1 ? { x: dx / len, y: dy / len } : { x: 1, y: 0 };
}
