export interface Point {
    x: number;
    y: number;
}

interface CornerValidationResult {
    valid: boolean;
    error?: string;
}

function crossProduct(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function polygonArea(points: Point[]): number {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
}

function angleBetween(o: Point, a: Point, b: Point): number {
    const oa = { x: a.x - o.x, y: a.y - o.y };
    const ob = { x: b.x - o.x, y: b.y - o.y };
    const dot = oa.x * ob.x + oa.y * ob.y;
    const magOA = Math.sqrt(oa.x * oa.x + oa.y * oa.y);
    const magOB = Math.sqrt(ob.x * ob.x + ob.y * ob.y);
    if (magOA === 0 || magOB === 0) return 0;
    const cosAngle = Math.max(-1, Math.min(1, dot / (magOA * magOB)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
}

export function validateCorners(corners: Point[]): CornerValidationResult {
    if (corners.length !== 4) {
        return { valid: false, error: 'Exactly 4 corners are required' };
    }

    for (const c of corners) {
        if (typeof c.x !== 'number' || typeof c.y !== 'number') {
            return { valid: false, error: 'Each corner must have numeric x and y' };
        }
        if (c.x < 0 || c.x > 1 || c.y < 0 || c.y > 1) {
            return { valid: false, error: 'Corner coordinates must be between 0 and 1' };
        }
    }

    // Check minimum area (at least 5% of unit square)
    const area = polygonArea(corners);
    if (area < 0.05) {
        return { valid: false, error: 'Quadrilateral area is too small' };
    }

    // Check that it's convex (all cross products have same sign)
    const signs: number[] = [];
    for (let i = 0; i < 4; i++) {
        const o = corners[i];
        const a = corners[(i + 1) % 4];
        const b = corners[(i + 2) % 4];
        signs.push(Math.sign(crossProduct(o, a, b)));
    }
    const nonZero = signs.filter((s) => s !== 0);
    if (nonZero.length > 0 && !nonZero.every((s) => s === nonZero[0])) {
        return { valid: false, error: 'Quadrilateral must be convex' };
    }

    // Check angles are between 30 and 150 degrees
    for (let i = 0; i < 4; i++) {
        const prev = corners[(i + 3) % 4];
        const curr = corners[i];
        const next = corners[(i + 1) % 4];
        const angle = angleBetween(prev, curr, next);
        if (angle < 30 || angle > 150) {
            return {
                valid: false,
                error: `Corner ${i + 1} has angle ${angle.toFixed(1)}° (expected 30°-150°)`,
            };
        }
    }

    return { valid: true };
}
