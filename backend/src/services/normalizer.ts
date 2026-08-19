export interface NormalizedBall {
    label: string;
    x: number;
    y: number;
}

interface VisionBall {
    label: string;
    x: number;
    y: number;
    radius?: number;
    confidence?: number;
}

// Map detected colors to standard simulator colors (white, yellow, red)
const COLOR_MAP: Record<string, string> = {
    white: 'white',
    habana: 'white',
    yellow: 'yellow',
    orange: 'yellow',
    red: 'red',
    blue: 'red',
};

function mapColor(detectedLabel: string): string {
    return COLOR_MAP[detectedLabel] ?? detectedLabel;
}

export function normalizeBalls(balls: VisionBall[]): NormalizedBall[] {
    const mapped = balls.map((b) => ({
        label: mapColor(b.label),
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
            warning: `Only ${validDetected.length} ball(s) detected: ${validDetected.join(', ')}`,
        };
    }

    return { valid: true };
}
