import { BallId, ShotEvent, Vec2 } from '../physics/types';

export interface ShotValidation {
    isValid: boolean;
    cushionContacts: number;
    ballCollisions: { ball1: BallId; ball2: BallId }[];
    reason: string;
    scoringDetails: ScoringDetails;
}

export interface ScoringDetails {
    firstBallHit: BallId | null;
    secondBallHit: BallId | null;
    cushionsBeforeFirstHit: number;
    cushionsBetweenHits: number;
    cushionsAfterSecondHit: number;
    totalCushions: number;
}

export function validateThreeCushionShot(
    events: ShotEvent[],
    cueBallId: BallId
): ShotValidation {
    const cushionContacts: Vec2[] = [];
    const ballCollisions: { ball1: BallId; ball2: BallId; eventIndex: number }[] = [];

    events.forEach((event, index) => {
        if (event.type === 'cushion') {
            cushionContacts.push((event.data as any).position);
        } else if (event.type === 'ball_collision') {
            const collision = event.data as any;
            if (collision.ball1 === cueBallId || collision.ball2 === cueBallId) {
                ballCollisions.push({
                    ball1: collision.ball1,
                    ball2: collision.ball2,
                    eventIndex: index,
                });
            }
        }
    });

    const scoringDetails = calculateScoringDetails(
        events,
        cueBallId,
        cushionContacts.length,
        ballCollisions
    );

    const isValid = checkThreeCushionRule(scoringDetails);

    const reason = generateValidationReason(isValid, scoringDetails);

    return {
        isValid,
        cushionContacts: cushionContacts.length,
        ballCollisions: ballCollisions.map((c) => ({
            ball1: c.ball1,
            ball2: c.ball2,
        })),
        reason,
        scoringDetails,
    };
}

function calculateScoringDetails(
    events: ShotEvent[],
    cueBallId: BallId,
    totalCushions: number,
    ballCollisions: { ball1: BallId; ball2: BallId; eventIndex: number }[]
): ScoringDetails {
    let firstBallHit: BallId | null = null;
    let secondBallHit: BallId | null = null;
    let cushionsBeforeFirstHit = 0;
    let cushionsBetweenHits = 0;
    let cushionsAfterSecondHit = 0;

    let cushionCount = 0;
    let collisionCount = 0;

    for (const event of events) {
        if (event.type === 'cushion') {
            cushionCount++;
            if (collisionCount === 0) {
                cushionsBeforeFirstHit++;
            } else if (collisionCount === 1) {
                cushionsBetweenHits++;
            } else if (collisionCount === 2) {
                cushionsAfterSecondHit++;
            }
        } else if (event.type === 'ball_collision') {
            const collision = event.data as any;
            if (collision.ball1 === cueBallId || collision.ball2 === cueBallId) {
                collisionCount++;
                if (collisionCount === 1) {
                    firstBallHit =
                        collision.ball1 === cueBallId
                            ? collision.ball2
                            : collision.ball1;
                } else if (collisionCount === 2) {
                    secondBallHit =
                        collision.ball1 === cueBallId
                            ? collision.ball2
                            : collision.ball1;
                }
            }
        }
    }

    return {
        firstBallHit,
        secondBallHit,
        cushionsBeforeFirstHit,
        cushionsBetweenHits,
        cushionsAfterSecondHit,
        totalCushions,
    };
}

function checkThreeCushionRule(details: ScoringDetails): boolean {
    if (details.totalCushions < 3) {
        return false;
    }

    if (!details.firstBallHit || !details.secondBallHit) {
        return details.totalCushions >= 3;
    }

    if (details.cushionsBeforeFirstHit >= 3 && details.secondBallHit) {
        return true;
    }

    if (
        details.firstBallHit &&
        details.cushionsBetweenHits >= 3 &&
        details.secondBallHit
    ) {
        return true;
    }

    if (details.totalCushions >= 3 && details.firstBallHit && details.secondBallHit) {
        return true;
    }

    return false;
}

function generateValidationReason(
    isValid: boolean,
    details: ScoringDetails
): string {
    if (isValid) {
        const parts: string[] = [];
        parts.push(`Tiro válido`);
        parts.push(`${details.totalCushions} contactos con banda`);
        if (details.firstBallHit) {
            parts.push(`Primera bola: ${details.firstBallHit}`);
        }
        if (details.secondBallHit) {
            parts.push(`Segunda bola: ${details.secondBallHit}`);
        }
        return parts.join(' | ');
    }

    const issues: string[] = [];

    if (details.totalCushions < 3) {
        issues.push(
            `Faltan ${3 - details.totalCushions} contacto(s) con banda (actual: ${details.totalCushions})`
        );
    }

    if (!details.firstBallHit) {
        issues.push('No se contactó ninguna bola');
    } else if (!details.secondBallHit) {
        issues.push('Solo se contactó una bola');
    }

    return `Tiro inválido: ${issues.join(', ')}`;
}

export function getShotStatistics(
    events: ShotEvent[],
    cueBallId: BallId
): {
    totalCushions: number;
    totalCollisions: number;
    cueBallCollisions: number;
    shotDuration: number;
} {
    let totalCushions = 0;
    let totalCollisions = 0;
    let cueBallCollisions = 0;
    let maxTimestamp = 0;

    events.forEach((event) => {
        if (event.type === 'cushion') {
            totalCushions++;
        } else if (event.type === 'ball_collision') {
            totalCollisions++;
            const collision = event.data as any;
            if (collision.ball1 === cueBallId || collision.ball2 === cueBallId) {
                cueBallCollisions++;
            }
        }
        if (event.timestamp > maxTimestamp) {
            maxTimestamp = event.timestamp;
        }
    });

    return {
        totalCushions,
        totalCollisions,
        cueBallCollisions,
        shotDuration: maxTimestamp,
    };
}
