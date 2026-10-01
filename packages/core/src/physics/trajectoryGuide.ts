import { BallId, Vec2 } from './types';
import { TrajectoryPrediction, TrajectoryPath, TrajectoryPoint } from './trajectory';

export type GuideStrokeStyle = 'solid' | 'dashed' | 'dotted';
export type AimGuideMode = 'full' | 'exit_only';

export interface TrajectoryGuideConfig {
    /** Stroke weight / thickness in pixels (0.4 to 3.0, default 0.9) */
    strokeWeight: number;
    /** Stroke pattern: solid, dashed (- - -), or dotted (* * *) */
    strokeStyle: GuideStrokeStyle;
    /** Aim guide visibility mode: full multi-cushion path or only cue ball's exit after first impact */
    aimMode: AimGuideMode;
    /** Show predicted aiming trajectory before the shot */
    showAimGuide: boolean;
    /** Show execution trail during/after the shot */
    showExecutionTrail: boolean;
}

export const DEFAULT_GUIDE_CONFIG: TrajectoryGuideConfig = {
    strokeWeight: 0.9,
    strokeStyle: 'dashed',
    aimMode: 'full',
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
                    ghostBallPos = pt.pos;
                }
            }
        }

        return {
            paths: prediction.paths,
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
            paths: [{ ballId: cueBallId, points: cuePath.points }],
            ghostBallPos: null,
            firstImpactType: null,
        };
    }

    const firstPt = cuePath.points[firstEventIdx];
    const firstImpactType: 'ball_collision' | 'cushion' = firstPt.type === 'collision' ? 'ball_collision' : 'cushion';
    const ghostBallPos: Vec2 | null = firstPt.type === 'collision' ? firstPt.pos : null;

    // Find the second event to limit the exit trajectory segment
    const secondEventIdx = cuePath.points.findIndex(
        (p, idx) => idx > firstEventIdx && (p.type === 'collision' || p.type === 'cushion')
    );

    // End index includes the exit segment after first impact (up to second event or +25 points)
    const exitEndIdx = secondEventIdx >= 0
        ? secondEventIdx + 1
        : Math.min(cuePath.points.length, firstEventIdx + 25);

    const filteredCuePoints = cuePath.points.slice(0, exitEndIdx);
    const filteredPaths: TrajectoryPath[] = [{ ballId: cueBallId, points: filteredCuePoints }];

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
                points: targetPath.points.slice(0, targetEndIdx),
            });
        }
    }

    return {
        paths: filteredPaths,
        ghostBallPos,
        firstImpactType,
    };
}
