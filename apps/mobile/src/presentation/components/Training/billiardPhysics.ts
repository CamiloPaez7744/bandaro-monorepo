/**
 * Real-world billiard physics constraints for carom billiards (Tres Bandas).
 * Standard carom table playing surface: 284.0 cm x 142.0 cm (strict 2:1 ratio).
 * Standard carom ball diameter: 61.5 mm (radius: ~3.075 - 3.1 cm).
 */

export interface PhysicsPoint {
  x: number; // 0..284 cm
  y: number; // 0..142 cm
}

export const BALL_RADIUS_CM = 3.1;
export const TABLE_WIDTH_CM = 284.0;
export const TABLE_HEIGHT_CM = 142.0;
export const MIN_BALL_DISTANCE_CM = 6.25; // 2 * BALL_RADIUS_CM + 0.05 cm safety margin

/**
 * Ensures a ball center stays strictly on the felt playing area,
 * never allowing the ball sphere to penetrate into the rubber cushions.
 * Valid center range: [radius, tableWidth - radius] x [radius, tableHeight - radius].
 */
export function clampBallToCushions(
  p: PhysicsPoint,
  radius = BALL_RADIUS_CM,
  tableW = TABLE_WIDTH_CM,
  tableH = TABLE_HEIGHT_CM
): PhysicsPoint {
  const minX = radius;
  const maxX = tableW - radius;
  const minY = radius;
  const maxY = tableH - radius;

  const validX = Number.isFinite(p.x) ? p.x : tableW / 2;
  const validY = Number.isFinite(p.y) ? p.y : tableH / 2;

  return {
    x: Math.round(Math.max(minX, Math.min(maxX, validX)) * 10) / 10,
    y: Math.round(Math.max(minY, Math.min(maxY, validY)) * 10) / 10,
  };
}

/**
 * Checks if a ball is in physical contact with or clipped into a cushion.
 */
export function isBallAgainstCushion(
  p: PhysicsPoint,
  radius = BALL_RADIUS_CM,
  tableW = TABLE_WIDTH_CM,
  tableH = TABLE_HEIGHT_CM
): { top: boolean; bottom: boolean; left: boolean; right: boolean; touchingAny: boolean } {
  const tolerance = 0.15; // 1.5 mm tolerance
  const left = p.x <= radius + tolerance;
  const right = p.x >= tableW - radius - tolerance;
  const top = p.y <= radius + tolerance;
  const bottom = p.y >= tableH - radius - tolerance;
  return {
    left,
    right,
    top,
    bottom,
    touchingAny: left || right || top || bottom,
  };
}

/**
 * Resolves physical collisions and boundary constraints for 3 carom balls.
 * 1. Clamps every ball center so no ball can be placed over/inside cushions.
 * 2. Repels overlapping balls so no two balls can occupy the same coordinates or space (dist >= 2R).
 * 3. Enforces cushion bounds during relaxation so balls pushed against cushions stay on felt.
 */
export function resolveBilliardPhysics(
  balls: [PhysicsPoint, PhysicsPoint, PhysicsPoint],
  radius = BALL_RADIUS_CM,
  tableW = TABLE_WIDTH_CM,
  tableH = TABLE_HEIGHT_CM,
  maxIterations = 25
): [PhysicsPoint, PhysicsPoint, PhysicsPoint] {
  const minX = radius;
  const maxX = tableW - radius;
  const minY = radius;
  const maxY = tableH - radius;
  const minDist = 2 * radius + 0.05; // 6.25 cm

  // 1. Initial clamp to valid cushion interior
  const pts: PhysicsPoint[] = balls.map((p) => ({
    x: Math.max(minX, Math.min(maxX, Number.isFinite(p.x) ? p.x : tableW / 2)),
    y: Math.max(minY, Math.min(maxY, Number.isFinite(p.y) ? p.y : tableH / 2)),
  }));

  // Deterministic separation angles for coincident points
  const fallbackAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

  // 2. Iterative collision relaxation
  for (let it = 0; it < maxIterations; it++) {
    let moved = false;
    let pairIdx = 0;

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDist) {
          moved = true;
          const overlap = minDist - dist;
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

          // Push balls apart along normal
          pts[i].x -= nx * push;
          pts[i].y -= ny * push;
          pts[j].x += nx * push;
          pts[j].y += ny * push;

          // Re-clamp both balls strictly inside cushion boundaries
          pts[i].x = Math.max(minX, Math.min(maxX, pts[i].x));
          pts[i].y = Math.max(minY, Math.min(maxY, pts[i].y));
          pts[j].x = Math.max(minX, Math.min(maxX, pts[j].x));
          pts[j].y = Math.max(minY, Math.min(maxY, pts[j].y));
        }
        pairIdx++;
      }
    }

    if (!moved) break;
  }

  return [
    { x: Math.round(pts[0].x * 10) / 10, y: Math.round(pts[0].y * 10) / 10 },
    { x: Math.round(pts[1].x * 10) / 10, y: Math.round(pts[1].y * 10) / 10 },
    { x: Math.round(pts[2].x * 10) / 10, y: Math.round(pts[2].y * 10) / 10 },
  ];
}
