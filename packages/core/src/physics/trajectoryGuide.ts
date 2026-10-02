import { BallId, Vec2 } from './types';
import { TrajectoryPrediction, TrajectoryPath, TrajectoryPoint } from './trajectory';

export type GuideStrokeStyle = 'solid' | 'dashed' | 'dotted';
export type AimGuideMode = 'straight' | 'exit_only' | 'full';

export interface TrajectoryGuideConfig {
    /** Stroke weight / thickness in pixels (0.4 to 3.0, default 1.2) */
    strokeWeight: number;
    /** Stroke pattern: solid, dashed (- - -), or dotted (* * *) */
    strokeStyle: GuideStrokeStyle;
    /** Aim guide visibility mode: straight angle of departure, exit only after first impact, or full multi-cushion path */
    aimMode: AimGuideMode;
    /** Show predicted aiming trajectory before the shot */
    showAimGuide: boolean;
    /** Show execution trail during/after the shot */
    showExecutionTrail: boolean;
}

export const DEFAULT_GUIDE_CONFIG: TrajectoryGuideConfig = {
    strokeWeight: 1.2,
    strokeStyle: 'solid',
    aimMode: 'straight',
    showAimGuide: true,
    showExecutionTrail: true,
};

/**
 * Strict ball colors according to 3-cushion billiards standards.
 * Ignores any source catalog colors.
 */
export const STRICT_BALL_GUIDE_COLORS: Record<BallId, { stroke: string; glow: string }> = {
    white: {
        stroke: '#ffffff',
        glow: 'rgba(255, 255, 255, 0.25)',
    },
    yellow: {
        stroke: '#facc15',
        glow: 'rgba(250, 204, 21, 0.25)',
    },
    red: {
        stroke: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.25)',
    },
};

/**
 * Maps Photoshop-style stroke styles to SVG stroke-dasharray values.
 */
export function getGuideStrokeDashArray(style: GuideStrokeStyle): string | undefined {
    switch (style) {
        case 'dashed':
            return '5 3';
        case 'dotted':
            return '1.5 2.5';
        case 'solid':
        default:
            return undefined;
    }
}

export interface FilteredAimGuide {
    paths: TrajectoryPath[];
    ghostBallPos: Vec2 | null;
    firstImpactType: 'ball_collision' | 'cushion' | null;
}

/**
 * Simplifies trajectory points using Ramer-Douglas-Peucker algorithm while
 * strictly preserving key billiard events (ball collision, cushion bounces, and path endpoints).
 * Eliminates collinear discretization jitter that causes SVG dashed/dotted lines to look jagged or deformed.
 */
export function simplifyTrajectoryPoints(
    points: TrajectoryPoint[],
    tolerance = 0.35
): TrajectoryPoint[] {
    if (points.length <= 2) return points;

    // Split points into segments between key events
    const segments: TrajectoryPoint[][] = [];
    let currentSegment: TrajectoryPoint[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
        const pt = points[i];
        currentSegment.push(pt);
        if (pt.type === 'collision' || pt.type === 'cushion') {
            segments.push(currentSegment);
            currentSegment = [pt];
        }
    }
    if (currentSegment.length > 1) {
        segments.push(currentSegment);
    }

    const rdp = (pts: TrajectoryPoint[], tol: number): TrajectoryPoint[] => {
        if (pts.length <= 2) return pts;
        const p1 = pts[0].pos;
        const p2 = pts[pts.length - 1].pos;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const segLenSq = dx * dx + dy * dy;

        let maxDist = 0;
        let index = 0;

        for (let i = 1; i < pts.length - 1; i++) {
            const p = pts[i].pos;
            let dist: number;
            if (segLenSq === 0) {
                dist = Math.hypot(p.x - p1.x, p.y - p1.y);
            } else {
                const t = Math.max(0, Math.min(1, ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / segLenSq));
                const projX = p1.x + t * dx;
                const projY = p1.y + t * dy;
                dist = Math.hypot(p.x - projX, p.y - projY);
            }
            if (dist > maxDist) {
                maxDist = dist;
                index = i;
            }
        }

        if (maxDist > tol) {
            const left = rdp(pts.slice(0, index + 1), tol);
            const right = rdp(pts.slice(index), tol);
            return left.slice(0, left.length - 1).concat(right);
        } else {
            return [pts[0], pts[pts.length - 1]];
        }
    };

    const result: TrajectoryPoint[] = [];
    segments.forEach((seg, sIdx) => {
        const simplified = rdp(seg, tolerance);
        if (sIdx === 0) {
            result.push(...simplified);
        } else {
            result.push(...simplified.slice(1));
        }
    });

    return result;
}

/**
 * Filters the predicted trajectory based on the selected AimGuideMode:
 * - 'full': Returns the entire predicted multi-cushion trajectory for all balls.
 * - 'exit_only': Truncates the cue ball path to show the trajectory up to the first impact
 *   (ball collision or cushion) and the immediate exit trajectory following that first impact.
 *   Also provides the ghost ball position if the first impact was with an object ball.
 */
export function filterAimTrajectory(
    prediction: TrajectoryPrediction,
    cueBallId: BallId,
    aimMode: AimGuideMode
): FilteredAimGuide {
    if (!prediction || prediction.paths.length === 0) {
        return { paths: [], ghostBallPos: null, firstImpactType: null };
    }

    if (aimMode === 'straight') {
        const cuePath = prediction.paths.find((p) => p.ballId === cueBallId);
        if (!cuePath || cuePath.points.length === 0) {
            return { paths: [], ghostBallPos: null, firstImpactType: null };
        }

        const startPt = cuePath.points[0];
        // Short stub distance: showing exit trajectory (~18 cm on table, classic short aim guide)
        const SHORT_EXIT_DISTANCE = 18.0;

        let ghostBallPos: Vec2 | null = null;
        let firstImpactType: 'ball_collision' | 'cushion' | null = null;

        // Check if there is an impact along the trajectory
        const firstEventIdx = cuePath.points.findIndex((p) => p.type === 'collision' || p.type === 'cushion');

        if (firstEventIdx >= 0) {
            const evPt = cuePath.points[firstEventIdx];
            firstImpactType = evPt.type === 'collision' ? 'ball_collision' : 'cushion';
            if (evPt.type === 'collision') {
                ghostBallPos = evPt.ghostBallPos ?? evPt.pos;
            }

            // 1. Cue ball path from initial position straight to impact point
            const impactPos = ghostBallPos ? { ...ghostBallPos } : { ...evPt.pos };
            const approachPoints: TrajectoryPoint[] = [
                startPt,
                {
                    pos: impactPos,
                    type: evPt.type,
                    ghostBallPos: evPt.ghostBallPos,
                    cushionPos: evPt.cushionPos,
                    timestamp: evPt.timestamp,
                },
            ];

            // 2. Cue ball deflection exit stub (short straight line following collision/cushion)
            const postPoints: TrajectoryPoint[] = [];
            let accCueExitDist = 0;
            let lastPos = impactPos;

            for (let i = firstEventIdx + 1; i < cuePath.points.length; i++) {
                const pt = cuePath.points[i];
                const d = Math.hypot(pt.pos.x - lastPos.x, pt.pos.y - lastPos.y);
                if (d < 0.001) continue;
                accCueExitDist += d;

                if (accCueExitDist >= SHORT_EXIT_DISTANCE) {
                    const over = accCueExitDist - SHORT_EXIT_DISTANCE;
                    const ratio = Math.max(0, (d - over) / d);
                    postPoints.push({
                        pos: {
                            x: lastPos.x + (pt.pos.x - lastPos.x) * ratio,
                            y: lastPos.y + (pt.pos.y - lastPos.y) * ratio,
                        },
                        type: 'normal',
                        timestamp: pt.timestamp,
                    });
                    break;
                }

                postPoints.push(pt);
                lastPos = pt.pos;
                if (pt.type === 'collision' || pt.type === 'cushion') break;
            }

            const cueResultPoints = [...approachPoints];
            if (postPoints.length > 0) {
                cueResultPoints.push(postPoints[postPoints.length - 1]);
            }

            const paths: TrajectoryPath[] = [{
                ballId: cueBallId,
                points: cueResultPoints,
            }];

            // 3. Object ball short exit stub (if first event was ball collision)
            if (firstImpactType === 'ball_collision' && prediction.ballCollisions.length > 0) {
                const firstCol = prediction.ballCollisions[0];
                const targetBallId = firstCol.ball1 === cueBallId ? firstCol.ball2 : firstCol.ball1;
                const targetPath = prediction.paths.find((p) => p.ballId === targetBallId);

                if (targetPath && targetPath.points.length >= 2) {
                    const objStart = targetPath.points[0];
                    const objPoints: TrajectoryPoint[] = [objStart];
                    let accObjDist = 0;
                    let lastObjPos = objStart.pos;

                    for (let i = 1; i < targetPath.points.length; i++) {
                        const pt = targetPath.points[i];
                        const d = Math.hypot(pt.pos.x - lastObjPos.x, pt.pos.y - lastObjPos.y);
                        if (d < 0.001) continue;
                        accObjDist += d;

                        if (accObjDist >= SHORT_EXIT_DISTANCE) {
                            const over = accObjDist - SHORT_EXIT_DISTANCE;
                            const ratio = Math.max(0, (d - over) / d);
                            objPoints.push({
                                pos: {
                                    x: lastObjPos.x + (pt.pos.x - lastObjPos.x) * ratio,
                                    y: lastObjPos.y + (pt.pos.y - lastObjPos.y) * ratio,
                                },
                                type: 'normal',
                                timestamp: pt.timestamp,
                            });
                            break;
                        }

                        objPoints.push(pt);
                        lastObjPos = pt.pos;
                        if (pt.type === 'collision' || pt.type === 'cushion') break;
                    }

                    const objStraight = [objStart, objPoints[objPoints.length - 1]];
                    paths.push({
                        ballId: targetBallId,
                        points: objStraight,
                    });
                }
            }

            return {
                paths,
                ghostBallPos,
                firstImpactType,
            };
        } else {
            // No impact: straight stub along aim direction
            const STUB_DISTANCE = 35.0;
            const straightPoints: TrajectoryPoint[] = [startPt];
            let accDist = 0;
            for (let i = 1; i < cuePath.points.length; i++) {
                const prev = cuePath.points[i - 1];
                const curr = cuePath.points[i];
                const d = Math.hypot(curr.pos.x - prev.pos.x, curr.pos.y - prev.pos.y);
                accDist += d;
                if (accDist >= STUB_DISTANCE) {
                    const over = accDist - STUB_DISTANCE;
                    const ratio = Math.max(0, (d - over) / Math.max(0.001, d));
                    straightPoints.push({
                        pos: {
                            x: prev.pos.x + (curr.pos.x - prev.pos.x) * ratio,
                            y: prev.pos.y + (curr.pos.y - prev.pos.y) * ratio,
                        },
                        type: 'normal',
                        timestamp: curr.timestamp,
                    });
                    break;
                }
                straightPoints.push(curr);
            }
            if (straightPoints.length < 2 && cuePath.points.length >= 2) {
                straightPoints.push(cuePath.points[1]);
            }
            return {
                paths: [{ ballId: cueBallId, points: [startPt, straightPoints[straightPoints.length - 1]] }],
                ghostBallPos: null,
                firstImpactType: null,
            };
        }
    }

    if (aimMode === 'full') {
        const cuePath = prediction.paths.find((p) => p.ballId === cueBallId);
        let ghostBallPos: Vec2 | null = null;
        let firstImpactType: 'ball_collision' | 'cushion' | null = null;

        if (cuePath) {
            const firstEventIdx = cuePath.points.findIndex((p) => p.type === 'collision' || p.type === 'cushion');
            if (firstEventIdx >= 0) {
                const pt = cuePath.points[firstEventIdx];
                firstImpactType = pt.type === 'collision' ? 'ball_collision' : 'cushion';
                if (pt.type === 'collision') {
                    ghostBallPos = pt.ghostBallPos ?? pt.pos;
                }
            }
        }

        const simplifiedPaths = prediction.paths.map((p) => ({
            ballId: p.ballId,
            points: simplifyTrajectoryPoints(p.points),
        }));

        return {
            paths: simplifiedPaths,
            ghostBallPos,
            firstImpactType,
        };
    }

    // Exit-only mode:
    const cuePath = prediction.paths.find((p) => p.ballId === cueBallId);
    if (!cuePath || cuePath.points.length === 0) {
        return { paths: [], ghostBallPos: null, firstImpactType: null };
    }

    // Find the first event (collision or cushion)
    const firstEventIdx = cuePath.points.findIndex((p) => p.type === 'collision' || p.type === 'cushion');

    if (firstEventIdx < 0) {
        // No event found: show up to the full cue path
        return {
            paths: [{ ballId: cueBallId, points: simplifyTrajectoryPoints(cuePath.points) }],
            ghostBallPos: null,
            firstImpactType: null,
        };
    }

    const firstPt = cuePath.points[firstEventIdx];
    const firstImpactType: 'ball_collision' | 'cushion' = firstPt.type === 'collision' ? 'ball_collision' : 'cushion';
    const ghostBallPos: Vec2 | null = firstPt.type === 'collision' ? (firstPt.ghostBallPos ?? firstPt.pos) : null;

    // Find the second event to limit the exit trajectory segment
    const secondEventIdx = cuePath.points.findIndex(
        (p, idx) => idx > firstEventIdx && (p.type === 'collision' || p.type === 'cushion')
    );

    // End index includes the exit segment after first impact (up to second event or +25 points)
    const exitEndIdx = secondEventIdx >= 0
        ? secondEventIdx + 1
        : Math.min(cuePath.points.length, firstEventIdx + 25);

    const filteredCuePoints = cuePath.points.slice(0, exitEndIdx);
    const filteredPaths: TrajectoryPath[] = [{ ballId: cueBallId, points: simplifyTrajectoryPoints(filteredCuePoints) }];

    // If first impact was with an object ball, also show that object ball's exit trajectory
    if (firstPt.type === 'collision' && prediction.ballCollisions.length > 0) {
        const firstCol = prediction.ballCollisions[0];
        const targetBallId = firstCol.ball1 === cueBallId ? firstCol.ball2 : firstCol.ball1;
        const targetPath = prediction.paths.find((p) => p.ballId === targetBallId);

        if (targetPath && targetPath.points.length > 0) {
            // Find object ball's next event
            const targetSecondEventIdx = targetPath.points.findIndex(
                (p, idx) => idx > 0 && (p.type === 'collision' || p.type === 'cushion')
            );
            const targetEndIdx = targetSecondEventIdx >= 0
                ? targetSecondEventIdx + 1
                : Math.min(targetPath.points.length, 25);

            filteredPaths.push({
                ballId: targetBallId,
                points: simplifyTrajectoryPoints(targetPath.points.slice(0, targetEndIdx)),
            });
        }
    }

    return {
        paths: filteredPaths,
        ghostBallPos,
        firstImpactType,
    };
}
