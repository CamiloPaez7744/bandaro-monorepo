import { Ball, BallId, Vec2, DEFAULT_TABLE } from './types';
import { predictTrajectory, TrajectoryPrediction } from './trajectory';
import { translateSourceSpin } from './spinMapping';
import { calibrateSourceSpeed } from './powerCalibration';
import { vec2, vec2Distance, vec2Normalize, vec2Sub } from './physics';

export interface CatalogPlayData {
    id?: number;
    white: Vec2;
    yellow: Vec2;
    red: Vec2;
    cueBallId?: BallId;
    aimDirection?: Vec2;
    speed?: number | string;
    power?: number;
    spin?: string | { x?: number; y?: number; hour?: number; tips?: number };
    referenceTrajectory: Vec2[];
    expectedCushions?: number;
}

export interface TrajectoryValidationResult {
    playId?: number;
    matched: boolean;
    fitScore: number;               // 0 to 100%
    averageErrorCm: number;         // Mean Euclidean error in centimeters
    maxErrorCm: number;             // Maximum deviation in centimeters
    referencePointsCount: number;
    simulatedPointsCount: number;
    cushionContacts: {
        simulated: number;
        expected: number;
        matched: boolean;
    };
    caromCompleted: boolean;
    firstBallHit: {
        hit: boolean;
        errorCm?: number;
    };
    secondBallHit: {
        hit: boolean;
        errorCm?: number;
    };
    notes: string[];
}

export interface BatchValidationSummary {
    totalPlays: number;
    passedPlays: number;
    failedPlays: number;
    averageFitScore: number;
    results: TrajectoryValidationResult[];
}

/**
 * Validates a single catalog play by comparing the scraped reference trajectory
 * against the output of the calibrated physics simulator.
 */
export function validateTrajectoryPlay(
    play: CatalogPlayData,
    toleranceCm: number = 8.5
): TrajectoryValidationResult {
    const cueBallId: BallId = play.cueBallId ?? 'white';
    const initialBalls: Ball[] = [
        { id: 'white', pos: { ...play.white }, vel: { x: 0, y: 0 }, spin: { x: 0, y: 0 }, radius: 3.075 },
        { id: 'yellow', pos: { ...play.yellow }, vel: { x: 0, y: 0 }, spin: { x: 0, y: 0 }, radius: 3.075 },
        { id: 'red', pos: { ...play.red }, vel: { x: 0, y: 0 }, spin: { x: 0, y: 0 }, radius: 3.075 },
    ];

    // 1. Resolve Aim Direction
    let aimDir = play.aimDirection;
    if (!aimDir || (aimDir.x === 0 && aimDir.y === 0)) {
        if (play.referenceTrajectory.length >= 2) {
            aimDir = vec2Normalize(vec2Sub(play.referenceTrajectory[1], play.referenceTrajectory[0]));
        } else {
            // Default towards yellow
            aimDir = vec2Normalize(vec2Sub(play.yellow, play.white));
        }
    }

    // 2. Resolve Calibrated Spin and Speed
    const spin = translateSourceSpin(play.spin, play.id);
    const calibration = calibrateSourceSpeed(play.speed ?? play.power ?? 3.5);

    // 3. Run Physics Simulator Prediction
    const prediction: TrajectoryPrediction = predictTrajectory(
        initialBalls,
        cueBallId,
        aimDir,
        calibration.velocity,
        spin,
        800,
        DEFAULT_TABLE
    );

    const cuePath = prediction.paths.find((p) => p.ballId === cueBallId);
    const simPoints = cuePath ? cuePath.points.map((p) => p.pos) : [];

    const notes: string[] = [];
    const refPoints = play.referenceTrajectory;

    if (refPoints.length < 2) {
        notes.push('Reference trajectory has fewer than 2 points; validation based on simulated outcome.');
        return {
            playId: play.id,
            matched: prediction.isValid,
            fitScore: prediction.isValid ? 100 : 50,
            averageErrorCm: 0,
            maxErrorCm: 0,
            referencePointsCount: refPoints.length,
            simulatedPointsCount: simPoints.length,
            cushionContacts: {
                simulated: prediction.cushionContacts,
                expected: play.expectedCushions ?? 3,
                matched: prediction.cushionContacts >= (play.expectedCushions ?? 3),
            },
            caromCompleted: prediction.isValid,
            firstBallHit: { hit: prediction.ballCollisions.length >= 1 },
            secondBallHit: { hit: prediction.ballCollisions.length >= 2 },
            notes,
        };
    }

    if (simPoints.length < 2) {
        notes.push('Simulation failed to produce a valid trajectory path.');
        return {
            playId: play.id,
            matched: false,
            fitScore: 0,
            averageErrorCm: 999,
            maxErrorCm: 999,
            referencePointsCount: refPoints.length,
            simulatedPointsCount: 0,
            cushionContacts: {
                simulated: 0,
                expected: play.expectedCushions ?? 3,
                matched: false,
            },
            caromCompleted: false,
            firstBallHit: { hit: false },
            secondBallHit: { hit: false },
            notes,
        };
    }

    // 4. Calculate Point-to-Path Euclidean Distances
    let totalDist = 0;
    let maxDist = 0;

    for (const refPt of refPoints) {
        // Find closest point along the simulated trajectory path
        let minPtDist = Infinity;
        for (let i = 0; i < simPoints.length - 1; i++) {
            const p1 = simPoints[i];
            const p2 = simPoints[i + 1];
            const d = distanceToSegment(refPt, p1, p2);
            if (d < minPtDist) {
                minPtDist = d;
            }
        }
        totalDist += minPtDist;
        if (minPtDist > maxDist) {
            maxDist = minPtDist;
        }
    }

    const averageError = Math.round((totalDist / refPoints.length) * 100) / 100;
    const maxError = Math.round(maxDist * 100) / 100;

    // 5. Fit Score calculation (100% when avg error is 0, decreases gracefully as error grows)
    const fitScore = Math.max(0, Math.min(100, Math.round(100 - (averageError / toleranceCm) * 35)));
    const matched = averageError <= toleranceCm && maxError <= toleranceCm * 2.2;

    const expectedCushions = play.expectedCushions ?? 3;
    const cushionMatched = prediction.cushionContacts >= expectedCushions;

    const firstHit = prediction.ballCollisions.length >= 1;
    const secondHit = prediction.ballCollisions.length >= 2;

    if (matched) {
        notes.push(`Displacement mathematically validated within ${toleranceCm}cm tolerance (Avg: ${averageError}cm, Max: ${maxError}cm).`);
    } else {
        notes.push(`Displacement exceeded tolerance: Avg ${averageError}cm (threshold: ${toleranceCm}cm), Max ${maxError}cm.`);
    }

    return {
        playId: play.id,
        matched,
        fitScore,
        averageErrorCm: averageError,
        maxErrorCm: maxError,
        referencePointsCount: refPoints.length,
        simulatedPointsCount: simPoints.length,
        cushionContacts: {
            simulated: prediction.cushionContacts,
            expected: expectedCushions,
            matched: cushionMatched,
        },
        caromCompleted: firstHit && secondHit && cushionMatched,
        firstBallHit: { hit: firstHit },
        secondBallHit: { hit: secondHit },
        notes,
    };
}

/**
 * Validates an array of catalog plays and returns a consolidated summary.
 */
export function validateCatalogPlays(
    plays: CatalogPlayData[],
    toleranceCm: number = 8.5
): BatchValidationSummary {
    const results = plays.map((p) => validateTrajectoryPlay(p, toleranceCm));
    const passedPlays = results.filter((r) => r.matched).length;
    const totalFit = results.reduce((acc, r) => acc + r.fitScore, 0);

    return {
        totalPlays: plays.length,
        passedPlays,
        failedPlays: plays.length - passedPlays,
        averageFitScore: plays.length > 0 ? Math.round(totalFit / plays.length) : 0,
        results,
    };
}

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return vec2Distance(p, a);

    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(p.x - projX, p.y - projY);
}
