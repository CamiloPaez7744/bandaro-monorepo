export interface NormalizedBall {
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
    ballColor?: string;
}

interface VisionBall {
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
    ballColor?: string;
}

// Map detected colors to standard simulator colors (white, yellow, red)
// Note: 3rd carom target ball can be red (traditional), orange (Aramith tournament), or blue (PBA tour)
const COLOR_MAP: Record<string, string> = {
    white: 'white',
    habana: 'white',
    yellow: 'yellow',
    orange: 'red',
    red: 'red',
    blue: 'red',
};

function mapColor(detectedLabel: string): string {
    return COLOR_MAP[detectedLabel] ?? detectedLabel;
}

export function normalizeBalls(balls: VisionBall[]): NormalizedBall[] {
    const mapped: NormalizedBall[] = balls.map((b) => ({
        ...b,
        label: mapColor(b.label),
        ...(b.ballColor ? { ballColor: b.ballColor } : {}),
        x: clamp(b.x, 0, 1),
        y: clamp(b.y, 0, 1),
    }));

    // Ensure no duplicate labels: if duplicates exist, reassign by position
    const labels = mapped.map((b) => b.label);
    const hasDup = labels.length !== new Set(labels).size;

    if (hasDup && mapped.length >= 3) {
        const STANDARD = ['white', 'yellow', 'red'];
        const used = new Set<string>();
        const result: NormalizedBall[] = [];

        // Sort by x position (left to right), then by y (top to bottom)
        const sorted = [...mapped].sort((a, b) => a.x - b.x || a.y - b.y);

        for (const ball of sorted) {
            if (!used.has(ball.label)) {
                used.add(ball.label);
                result.push(ball);
            } else {
                // Duplicate — assign first unused standard color
                const nextColor = STANDARD.find((c) => !used.has(c));
                if (nextColor) {
                    used.add(nextColor);
                    result.push({ ...ball, label: nextColor });
                } else {
                    result.push(ball);
                }
            }
        }

        return result;
    }

    return mapped;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

const VALID_LABELS = ['white', 'yellow', 'red', 'orange', 'blue', 'habana'];

const BALL_RADIUS_CM = 3.1;
const TABLE_W_CM = 284.0;
const TABLE_H_CM = 142.0;
const MIN_BALL_DIST_CM = 6.25;

/**
 * Enforces real-world billiard physics on normalized ball positions [0..1]:
 * 1. Clamps coordinates so ball never penetrates rubber cushions.
 * 2. Resolves overlapping balls (distance >= 2 * radius).
 */
export function enforceBilliardPhysicsNormalized(balls: NormalizedBall[]): NormalizedBall[] {
    if (balls.length === 0) return [];

    const minX = BALL_RADIUS_CM;
    const maxX = TABLE_W_CM - BALL_RADIUS_CM;
    const minY = BALL_RADIUS_CM;
    const maxY = TABLE_H_CM - BALL_RADIUS_CM;

    // Convert to cm
    const pts = balls.map((b) => ({
        ...b,
        xCm: Math.max(minX, Math.min(maxX, b.x * TABLE_W_CM)),
        yCm: Math.max(minY, Math.min(maxY, b.y * TABLE_H_CM)),
    }));

    const fallbackAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

    for (let it = 0; it < 25; it++) {
        let moved = false;
        let pairIdx = 0;
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[j].xCm - pts[i].xCm;
                const dy = pts[j].yCm - pts[i].yCm;
                const dist = Math.hypot(dx, dy);

                if (dist < MIN_BALL_DIST_CM) {
                    moved = true;
                    const overlap = MIN_BALL_DIST_CM - dist;
                    let nx: number;
                    let ny: number;

                    if (dist < 0.001) {
                        const ang = fallbackAngles[pairIdx % fallbackAngles.length];
                        nx = Math.cos(ang);
                        ny = Math.sin(ang);
                    } else {
                        nx = dx / dist;
                        ny = dy / dist;
                    }

                    const push = overlap * 0.55;
                    pts[i].xCm -= nx * push;
                    pts[i].yCm -= ny * push;
                    pts[j].xCm += nx * push;
                    pts[j].yCm += ny * push;

                    pts[i].xCm = Math.max(minX, Math.min(maxX, pts[i].xCm));
                    pts[i].yCm = Math.max(minY, Math.min(maxY, pts[i].yCm));
                    pts[j].xCm = Math.max(minX, Math.min(maxX, pts[j].xCm));
                    pts[j].yCm = Math.max(minY, Math.min(maxY, pts[j].yCm));
                }
                pairIdx++;
            }
        }
        if (!moved) break;
    }

    return pts.map(({ xCm, yCm, ...rest }) => ({
        ...rest,
        x: Math.round((xCm / TABLE_W_CM) * 10000) / 10000,
        y: Math.round((yCm / TABLE_H_CM) * 10000) / 10000,
    }));
}

export function validateBallCount(balls: NormalizedBall[]): {
    valid: boolean;
    warning?: string;
} {
    const detectedLabels = balls.map((b) => b.label);
    const validDetected = detectedLabels.filter((l) => VALID_LABELS.includes(l));

    if (validDetected.length === 0) {
        return { valid: false, warning: 'No valid balls detected' };
    }

    if (validDetected.length < 3) {
        return {
            valid: true,
            warning: `Missing: only ${validDetected.length} ball(s) detected: ${validDetected.join(', ')}`,
        };
    }

    if (balls.length > 3) {
        return {
            valid: true,
            warning: `Extra balls detected: expected 3, found ${balls.length}`,
        };
    }

    return { valid: true };
}
