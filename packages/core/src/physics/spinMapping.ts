import { SpinEffect } from './types';

/**
 * Standard clock-face representation of cue ball strike point.
 */
export interface ClockSpin {
    hour: number;        // 1.0 to 12.0 (e.g. 12 = top, 3 = right, 6 = bottom, 7 = bottom-left, 9 = left)
    tips: number;        // 0.0 to 3.0 tips (3.0 is maximum safe tip offset before miscue)
    description?: string;
}

/**
 * Convert clock-face strike point to internal normalized Cartesian SpinEffect.
 * - +X is right (clockwise lateral spin)
 * - -X is left (anti-clockwise lateral spin)
 * - +Y is top (forward / follow)
 * - -Y is bottom (backward / draw)
 */
export function clockToSpin(hour: number, tips: number = 2.5): SpinEffect {
    if (tips <= 0.01) {
        return { x: 0, y: 0, magnitude: 0 };
    }

    const clampedTips = Math.max(0, Math.min(3.0, tips));
    const normalizedMag = Math.min(1.0, clampedTips / 3.0);

    // In a 12-hour clock:
    // 12 o'clock: angle = 0 rad -> x = 0, y = +1 (top)
    // 3 o'clock: angle = pi/2 -> x = +1, y = 0 (right)
    // 6 o'clock: angle = pi -> x = 0, y = -1 (bottom)
    // 7 o'clock: angle = 7/12 * 2*pi -> x = sin(7/6*pi) = -0.5, y = cos(7/6*pi) = -0.866 (bottom-left)
    // 9 o'clock: angle = 3*pi/2 -> x = -1, y = 0 (left)
    const angleRad = (hour / 12) * 2 * Math.PI;
    const x = Math.round(Math.sin(angleRad) * normalizedMag * 1000) / 1000;
    const y = Math.round(Math.cos(angleRad) * normalizedMag * 1000) / 1000;
    const magnitude = Math.round(Math.hypot(x, y) * 1000) / 1000;

    return {
        x,
        y,
        magnitude: Math.min(1.0, magnitude),
    };
}

/**
 * Convert internal Cartesian SpinEffect back to clock-face strike point.
 */
export function spinToClock(spin: SpinEffect): ClockSpin {
    if (spin.magnitude < 0.05 || (Math.abs(spin.x) < 0.05 && Math.abs(spin.y) < 0.05)) {
        return { hour: 12, tips: 0, description: 'Center' };
    }

    // atan2(x, y) gives angle from +Y (12 o'clock) clockwise towards +X (3 o'clock)
    let angleRad = Math.atan2(spin.x, spin.y);
    if (angleRad < 0) {
        angleRad += 2 * Math.PI;
    }

    let hour = (angleRad / (2 * Math.PI)) * 12;
    if (hour <= 0.05) hour = 12;
    hour = Math.round(hour * 10) / 10;

    const tips = Math.round(Math.min(3.0, spin.magnitude * 3.0) * 10) / 10;

    return {
        hour,
        tips,
        description: getClockDescription(hour, tips),
    };
}

function getClockDescription(hour: number, tips: number): string {
    if (tips <= 0.2) return 'Center';
    if (hour >= 11.5 || hour <= 0.5) return '12 o\'clock (Top / Follow)';
    if (hour > 0.5 && hour < 2.5) return '1:30 o\'clock (High Right)';
    if (hour >= 2.5 && hour <= 3.5) return '3 o\'clock (Maximum Right)';
    if (hour > 3.5 && hour < 5.5) return '4:30 o\'clock (Low Right)';
    if (hour >= 5.5 && hour <= 6.5) return '6 o\'clock (Bottom / Draw)';
    if (hour > 6.5 && hour < 8.5) return '7:30 o\'clock (Bottom Left)';
    if (hour >= 8.5 && hour <= 9.5) return '9 o\'clock (Maximum Left)';
    if (hour > 9.5 && hour < 11.5) return '10:30 o\'clock (High Left)';
    return `${hour.toFixed(1)} o'clock`;
}

/**
 * Canonical dictionary mapping text labels from scraped billiard sources to ClockSpin.
 */
export const SOURCE_SPIN_DICTIONARY: Record<string, ClockSpin> = {
    // Center / Dead ball
    'center': { hour: 12, tips: 0, description: 'Center' },
    'center ball': { hour: 12, tips: 0, description: 'Center' },
    'none': { hour: 12, tips: 0, description: 'Center' },
    'dead ball': { hour: 12, tips: 0, description: 'Center' },
    'centro': { hour: 12, tips: 0, description: 'Center' },
    'sin efecto': { hour: 12, tips: 0, description: 'Center' },

    // Top / Follow (12 o'clock)
    'top': { hour: 12, tips: 2.2, description: 'Top' },
    'top spin': { hour: 12, tips: 2.5, description: 'Top Spin' },
    'high': { hour: 12, tips: 2.5, description: 'High' },
    'follow': { hour: 12, tips: 2.5, description: 'Follow' },
    'corrido': { hour: 12, tips: 2.5, description: 'Corrido' },
    'maximum follow': { hour: 12, tips: 3.0, description: 'Max Follow' },
    '12': { hour: 12, tips: 2.5, description: '12 o\'clock' },
    '12h': { hour: 12, tips: 2.5, description: '12 o\'clock' },
    '12 o\'clock': { hour: 12, tips: 2.5, description: '12 o\'clock' },

    // Bottom / Draw (6 o'clock)
    'bottom': { hour: 6, tips: 2.2, description: 'Bottom' },
    'bottom spin': { hour: 6, tips: 2.5, description: 'Bottom Spin' },
    'low': { hour: 6, tips: 2.5, description: 'Low' },
    'draw': { hour: 6, tips: 2.5, description: 'Draw' },
    'retro': { hour: 6, tips: 2.5, description: 'Retro' },
    'retroceso': { hour: 6, tips: 2.5, description: 'Retroceso' },
    'maximum draw': { hour: 6, tips: 3.0, description: 'Max Draw' },
    '6': { hour: 6, tips: 2.5, description: '6 o\'clock' },
    '6h': { hour: 6, tips: 2.5, description: '6 o\'clock' },
    '6 o\'clock': { hour: 6, tips: 2.5, description: '6 o\'clock' },

    // Right / Clockwise lateral (3 o'clock)
    'right': { hour: 3, tips: 2.2, description: 'Right' },
    'right spin': { hour: 3, tips: 2.5, description: 'Right Spin' },
    'side right': { hour: 3, tips: 2.5, description: 'Side Right' },
    'der': { hour: 3, tips: 2.5, description: 'Derecha' },
    'derecha': { hour: 3, tips: 2.5, description: 'Derecha' },
    'maximum right': { hour: 3, tips: 3.0, description: 'Max Right' },
    '3': { hour: 3, tips: 2.5, description: '3 o\'clock' },
    '3h': { hour: 3, tips: 2.5, description: '3 o\'clock' },
    '3 o\'clock': { hour: 3, tips: 2.5, description: '3 o\'clock' },

    // Left / Anti-clockwise lateral (9 o'clock)
    'left': { hour: 9, tips: 2.2, description: 'Left' },
    'left spin': { hour: 9, tips: 2.5, description: 'Left Spin' },
    'side left': { hour: 9, tips: 2.5, description: 'Side Left' },
    'izq': { hour: 9, tips: 2.5, description: 'Izquierda' },
    'izquierda': { hour: 9, tips: 2.5, description: 'Izquierda' },
    'maximum left': { hour: 9, tips: 3.0, description: 'Max Left' },
    '9': { hour: 9, tips: 2.5, description: '9 o\'clock' },
    '9h': { hour: 9, tips: 2.5, description: '9 o\'clock' },
    '9 o\'clock': { hour: 9, tips: 2.5, description: '9 o\'clock' },

    // Diagonal Combinations
    'top-right': { hour: 1.5, tips: 2.4, description: 'Top-Right' },
    'high right': { hour: 1.5, tips: 2.4, description: 'High Right' },
    '1:30': { hour: 1.5, tips: 2.4, description: '1:30 o\'clock' },
    '2': { hour: 2.0, tips: 2.5, description: '2 o\'clock' },
    '2 o\'clock': { hour: 2.0, tips: 2.5, description: '2 o\'clock' },

    'bottom-right': { hour: 4.5, tips: 2.4, description: 'Bottom-Right' },
    'low right': { hour: 4.5, tips: 2.4, description: 'Low Right' },
    '4:30': { hour: 4.5, tips: 2.4, description: '4:30 o\'clock' },
    '4': { hour: 4.0, tips: 2.5, description: '4 o\'clock' },
    '5': { hour: 5.0, tips: 2.5, description: '5 o\'clock' },

    'bottom-left': { hour: 7.5, tips: 2.4, description: 'Bottom-Left' },
    'low left': { hour: 7.5, tips: 2.4, description: 'Low Left' },
    '7:30': { hour: 7.5, tips: 2.4, description: '7:30 o\'clock' },
    '7': { hour: 7.0, tips: 2.5, description: '7 o\'clock' },
    '7h': { hour: 7.0, tips: 2.5, description: '7 o\'clock' },
    '7 o\'clock': { hour: 7.0, tips: 2.5, description: '7 o\'clock' },
    '8': { hour: 8.0, tips: 2.5, description: '8 o\'clock' },

    'top-left': { hour: 10.5, tips: 2.4, description: 'Top-Left' },
    'high left': { hour: 10.5, tips: 2.4, description: 'High Left' },
    '10:30': { hour: 10.5, tips: 2.4, description: '10:30 o\'clock' },
    '10': { hour: 10.0, tips: 2.5, description: '10 o\'clock' },
    '11': { hour: 11.0, tips: 2.5, description: '11 o\'clock' },
};

/**
 * Strict overrides dictionary for specific catalog / scraped plays.
 * Reconciles catalog mislabeled plays (e.g. Play #27 indicates "top spin" in source,
 * but physically requires bottom-left / 7 o'clock to execute the required 3-cushion line).
 */
export const PLAY_SPIN_OVERRIDES: Record<number, ClockSpin> = {
    // Play #27: Mapped to bottom-left (7 o'clock)
    27: { hour: 7.0, tips: 2.5, description: 'Play #27 calibrated: 7 o\'clock (Bottom-Left / Retro-Izq)' },
};

/**
 * Translates any scraped spin description, clock time, or play id into standardized SpinEffect.
 * Priority:
 * 1. Play ID explicit override (e.g. Play #27)
 * 2. Clock hour & tips
 * 3. Text dictionary match
 * 4. Raw numeric X/Y coordinates
 */
export function translateSourceSpin(
    input: string | { x?: number; y?: number; rotation?: number; hour?: number; tips?: number } | null | undefined,
    playId?: number
): SpinEffect {
    // 1. Play ID override check
    if (playId !== undefined && PLAY_SPIN_OVERRIDES[playId]) {
        const override = PLAY_SPIN_OVERRIDES[playId];
        return clockToSpin(override.hour, override.tips);
    }

    if (!input) {
        return { x: 0, y: 0, magnitude: 0 };
    }

    // 2. Structured ClockSpin input
    if (typeof input === 'object') {
        if (typeof input.hour === 'number') {
            return clockToSpin(input.hour, input.tips ?? 2.5);
        }
        if (typeof input.x === 'number' && typeof input.y === 'number') {
            const mag = Math.min(1.0, Math.hypot(input.x, input.y));
            return {
                x: Math.max(-1.0, Math.min(1.0, input.x)),
                y: Math.max(-1.0, Math.min(1.0, input.y)),
                magnitude: mag,
            };
        }
        if (typeof input.rotation === 'number') {
            // Rotation in degrees (0 = top, 90 = right, 180 = bottom, 270 = left)
            const rad = (input.rotation * Math.PI) / 180;
            const x = Math.sin(rad);
            const y = Math.cos(rad);
            return {
                x: Math.round(x * 1000) / 1000,
                y: Math.round(y * 1000) / 1000,
                magnitude: 1.0,
            };
        }
    }

    // 3. String lookup
    if (typeof input === 'string') {
        const normalized = input.trim().toLowerCase();
        if (SOURCE_SPIN_DICTIONARY[normalized]) {
            const entry = SOURCE_SPIN_DICTIONARY[normalized];
            return clockToSpin(entry.hour, entry.tips);
        }

        // Try parsing "X o'clock" or "Xh"
        const clockMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:o'clock|h|hrs)?$/);
        if (clockMatch) {
            const hr = parseFloat(clockMatch[1]);
            if (hr >= 1 && hr <= 12) {
                return clockToSpin(hr, 2.5);
            }
        }
    }

    // Fallback: center ball
    return { x: 0, y: 0, magnitude: 0 };
}
