import { Vec2, BallId } from '@bandaro/core';
import { BallSkinId } from './tablePreferences';

export type Quaternion = [number, number, number, number]; // [w, x, y, z]

export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export const QUAT_IDENTITY: Quaternion = [1, 0, 0, 0];

export function quatNormalize(q: Quaternion): Quaternion {
    const [w, x, y, z] = q;
    const len = Math.hypot(w, x, y, z) || 1;
    return [w / len, x / len, y / len, z / len];
}

export function quatMultiply(a: Quaternion, b: Quaternion): Quaternion {
    const [aw, ax, ay, az] = a;
    const [bw, bx, by, bz] = b;
    return [
        aw * bw - ax * bx - ay * by - az * bz,
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
    ];
}

export function quatFromAxisAngle(axis: Vec3, angle: number): Quaternion {
    const half = angle * 0.5;
    const sinH = Math.sin(half);
    const cosH = Math.cos(half);
    return [cosH, axis.x * sinH, axis.y * sinH, axis.z * sinH];
}

export function quatRotateVec3(q: Quaternion, v: Vec3): Vec3 {
    const [qw, qx, qy, qz] = q;
    const tx = 2 * (qy * v.z - qz * v.y);
    const ty = 2 * (qz * v.x - qx * v.z);
    const tz = 2 * (qx * v.y - qy * v.x);
    return {
        x: v.x + qw * tx + (qy * tz - qz * ty),
        y: v.y + qw * ty + (qz * tx - qx * tz),
        z: v.z + qw * tz + (qx * ty - qy * tx),
    };
}

/**
 * Initial canonical orientation tilted so that when resting at break,
 * multiple dots are attractively visible from the top-down perspective.
 */
export const INITIAL_BALL_QUATERNION: Quaternion = (() => {
    // 28 deg pitch around X + 22 deg roll around Y
    const qx = quatFromAxisAngle({ x: 1, y: 0, z: 0 }, (28 * Math.PI) / 180);
    const qy = quatFromAxisAngle({ x: 0, y: 1, z: 0 }, (22 * Math.PI) / 180);
    return quatNormalize(quatMultiply(qy, qx));
})();

/**
 * Updates a ball's 3D rotation quaternion based on 2D table displacement and spin.
 *
 * @param prevQuat Current 3D orientation quaternion [w, x, y, z]
 * @param deltaX Displacement along table X (in cm)
 * @param deltaY Displacement along table Y (in cm)
 * @param spinX Lateral spin / english (-1 .. +1)
 * @param ballRadius Ball physical radius (standard carom: 3.075 cm)
 */
export function updateBallOrientation(
    prevQuat: Quaternion,
    deltaX: number,
    deltaY: number,
    spinX: number = 0,
    ballRadius: number = 3.075
): Quaternion {
    const dist = Math.hypot(deltaX, deltaY);
    const spinYaw = spinX * 0.16;

    if (dist < 0.0001 && Math.abs(spinYaw) < 0.0001) {
        return prevQuat;
    }

    // Roll axis in table space is perpendicular to motion:
    // Motion in +X rotates around +Y; Motion in +Y rotates around -X.
    const rollAngleX = -deltaY / ballRadius;
    const rollAngleY = deltaX / ballRadius;
    const rollAngleZ = spinYaw;

    const angle = Math.hypot(rollAngleX, rollAngleY, rollAngleZ);
    if (angle < 1e-6) return prevQuat;

    const axis: Vec3 = {
        x: rollAngleX / angle,
        y: rollAngleY / angle,
        z: rollAngleZ / angle,
    };

    const deltaQuat = quatFromAxisAngle(axis, angle);
    return quatNormalize(quatMultiply(deltaQuat, prevQuat));
}

// 6 cardinal poles on the unit sphere for UMB & PBA dots
export const SPHERE_OCTAHEDRAL_DOTS: Vec3[] = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
];

export const SPHERE_CLASSIC_DOTS: Vec3[] = [
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
];

// 3D Ring points on the unit sphere for PBA Cosmo Helix Vision and Dynaspheres
function generateSphereRing(angularRadiusRad: number, numPoints: number = 32, normal: Vec3 = { x: 0, y: 0, z: 1 }): Vec3[] {
    const points: Vec3[] = [];
    const r = Math.sin(angularRadiusRad);
    const z = Math.cos(angularRadiusRad);
    for (let i = 0; i < numPoints; i++) {
        const phi = (i / numPoints) * 2 * Math.PI;
        points.push({
            x: r * Math.cos(phi),
            y: r * Math.sin(phi),
            z,
        });
    }
    return points;
}

export const PBA_VISION_RING_1 = generateSphereRing((40 * Math.PI) / 180, 28);
export const PBA_VISION_RING_2 = generateSphereRing((40 * Math.PI) / 180, 28, { x: 0, y: 0, z: -1 }).map((p) => ({
    x: p.x,
    y: p.y,
    z: -p.z,
}));

export const DYNASPHERES_RING = generateSphereRing((32 * Math.PI) / 180, 24);

export interface ProjectedDot {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rotationDeg: number;
    opacity: number;
    zPrime: number;
}

/**
 * Projects a 3D unit point onto the 2D SVG canvas with true spherical foreshortening.
 */
export function projectSpherePointToSvg(
    point: Vec3,
    quat: Quaternion,
    ballCenterSvg: Vec2,
    ballRadiusSvg: number,
    baseDotRadius: number,
    isVertical: boolean
): ProjectedDot | null {
    const rotated = quatRotateVec3(quat, point);

    // Only render features on the visible upper hemisphere facing the camera (z' > 0)
    if (rotated.z <= 0.02) {
        return null;
    }

    // Map rotated 3D coordinates to 2D SVG screen offsets:
    // In horizontal: x' maps to +X, y' maps to +Y
    // In vertical: y' maps to +X, -x' maps to +Y (90 deg counter-clockwise table rotation)
    const offsetX = isVertical ? rotated.y * ballRadiusSvg : rotated.x * ballRadiusSvg;
    const offsetY = isVertical ? -rotated.x * ballRadiusSvg : rotated.y * ballRadiusSvg;

    const cx = ballCenterSvg.x + offsetX;
    const cy = ballCenterSvg.y + offsetY;

    const distFromCenter = Math.hypot(offsetX, offsetY);
    const zPrime = rotated.z; // cos(inclination angle)

    // Spherical foreshortening:
    // The radial dimension compresses with zPrime, tangential remains full width
    const rx = baseDotRadius;
    const ry = Math.max(0.06, baseDotRadius * zPrime);

    const angleDeg = distFromCenter > 0.001
        ? (Math.atan2(offsetY, offsetX) * 180) / Math.PI
        : 0;

    // Smooth horizon falloff when dot rolls out of view over the limb
    const opacity = Math.min(1, zPrime / 0.16);

    return {
        cx,
        cy,
        rx,
        ry,
        rotationDeg: angleDeg + 90,
        opacity,
        zPrime,
    };
}

/**
 * Projects a 3D ring onto the 2D SVG canvas as visible arc segments.
 */
export function projectSphereRingToSvg(
    ringPoints: Vec3[],
    quat: Quaternion,
    ballCenterSvg: Vec2,
    ballRadiusSvg: number,
    isVertical: boolean
): string[] {
    const segments: string[] = [];
    let currentPolyline: Vec2[] = [];

    for (let i = 0; i <= ringPoints.length; i++) {
        const pt = ringPoints[i % ringPoints.length];
        const rot = quatRotateVec3(quat, pt);

        if (rot.z > 0.04) {
            const offsetX = isVertical ? rot.y * ballRadiusSvg : rot.x * ballRadiusSvg;
            const offsetY = isVertical ? -rot.x * ballRadiusSvg : rot.y * ballRadiusSvg;
            currentPolyline.push({
                x: ballCenterSvg.x + offsetX,
                y: ballCenterSvg.y + offsetY,
            });
        } else {
            if (currentPolyline.length >= 2) {
                segments.push(
                    currentPolyline
                        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                        .join(' ')
                );
            }
            currentPolyline = [];
        }
    }

    if (currentPolyline.length >= 2) {
        segments.push(
            currentPolyline
                .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                .join(' ')
        );
    }

    return segments;
}
