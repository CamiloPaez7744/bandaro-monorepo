import { BallId, ShotEvent, Vec2 } from '../physics/types';

export type ShotClassification =
    | 'bricole' // Banda previa (3+ bandas antes de las bolas)
    | 'bricole_mixta' // 1 o 2 bandas previas + bandas intermedias
    | 'cajon' // Corta - Larga - Corta o Larga - Corta - Larga
    | 'pasebola' // Larga - Corta - Larga con recorrido largo
    | 'retroceso' // Fuerte efecto de retroceso
    | 'corrido' // Fuerte efecto de corrido
    | 'clasico' // Bola 1 -> 3+ bandas -> Bola 2
    | 'falta_bandas' // Tocó ambas bolas pero menos de 3 bandas antes de la 2da
    | 'carambola_directa' // Bola 1 -> Bola 2 directa (0 bandas antes)
    | 'incompleto'; // No tocó ambas bolas

export interface ShotValidation {
    isValid: boolean;
    cushionContacts: number;
    ballCollisions: { ball1: BallId; ball2: BallId }[];
    reason: string;
    classification: ShotClassification;
    classificationLabel: string;
    scoringDetails: ScoringDetails;
}

export interface ScoringDetails {
    firstBallHit: BallId | null;
    secondBallHit: BallId | null;
    cushionsBeforeFirstHit: number;
    cushionsBetweenHits: number;
    cushionsBeforeSecondHit: number;
    cushionsAfterSecondHit: number;
    totalCushions: number;
    eventTimeline: {
        step: number;
        type: 'cushion' | 'ball';
        description: string;
        ballId?: BallId;
        side?: string;
        cushionsCount: number;
        isThirdCushionReached: boolean;
    }[];
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
    const { classification, classificationLabel } = classifyShot(scoringDetails, isValid);
    const reason = generateValidationReason(isValid, scoringDetails, classificationLabel);

    return {
        isValid,
        cushionContacts: cushionContacts.length,
        ballCollisions: ballCollisions.map((c) => ({
            ball1: c.ball1,
            ball2: c.ball2,
        })),
        reason,
        classification,
        classificationLabel,
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
    const timeline: ScoringDetails['eventTimeline'] = [];

    for (const event of events) {
        if (event.type === 'cushion') {
            const cData = event.data as any;
            // Solo contamos bandas de la bola tiradora si está etiquetada, o todas si no hay filtro
            if (!cData.ballId || cData.ballId === cueBallId) {
                cushionCount++;
                if (collisionCount === 0) {
                    cushionsBeforeFirstHit++;
                } else if (collisionCount === 1) {
                    cushionsBetweenHits++;
                } else if (collisionCount >= 2) {
                    cushionsAfterSecondHit++;
                }

                timeline.push({
                    step: timeline.length + 1,
                    type: 'cushion',
                    description: `Banda #${cushionCount} (${cData.side ?? 'banda'})`,
                    side: cData.side,
                    cushionsCount: cushionCount,
                    isThirdCushionReached: cushionCount === 3,
                });
            }
        } else if (event.type === 'ball_collision') {
            const collision = event.data as any;
            if (collision.ball1 === cueBallId || collision.ball2 === cueBallId) {
                const targetBall = collision.ball1 === cueBallId ? collision.ball2 : collision.ball1;
                collisionCount++;

                if (collisionCount === 1) {
                    firstBallHit = targetBall;
                    timeline.push({
                        step: timeline.length + 1,
                        type: 'ball',
                        description: `Choque con 1ª bola (${targetBall}) tras ${cushionCount} bandas`,
                        ballId: targetBall,
                        cushionsCount: cushionCount,
                        isThirdCushionReached: cushionCount >= 3,
                    });
                } else if (collisionCount === 2) {
                    secondBallHit = targetBall;
                    timeline.push({
                        step: timeline.length + 1,
                        type: 'ball',
                        description: `Carambola en 2ª bola (${targetBall}) tras ${cushionCount} bandas previas`,
                        ballId: targetBall,
                        cushionsCount: cushionCount,
                        isThirdCushionReached: cushionCount >= 3,
                    });
                }
            }
        }
    }

    const cushionsBeforeSecondHit = cushionsBeforeFirstHit + cushionsBetweenHits;

    return {
        firstBallHit,
        secondBallHit,
        cushionsBeforeFirstHit,
        cushionsBetweenHits,
        cushionsBeforeSecondHit,
        cushionsAfterSecondHit,
        totalCushions,
        eventTimeline: timeline,
    };
}

export function checkThreeCushionRule(details: ScoringDetails): boolean {
    // Regla Oficial UMB:
    // La bola tiradora debe contactar a ambas bolas objetivo Y haber contactado
    // al menos tres veces una o varias bandas ANTES de tocar la segunda bola objetivo.
    if (!details.firstBallHit || !details.secondBallHit) {
        return false;
    }

    return details.cushionsBeforeSecondHit >= 3;
}

function classifyShot(
    details: ScoringDetails,
    isValid: boolean
): { classification: ShotClassification; classificationLabel: string } {
    if (!details.firstBallHit || !details.secondBallHit) {
        return {
            classification: 'incompleto',
            classificationLabel: 'Carambola incompleta (falta contactar bolas objetivo)',
        };
    }

    if (!isValid) {
        if (details.cushionsBeforeSecondHit === 0) {
            return {
                classification: 'carambola_directa',
                classificationLabel: 'Carambola directa (0 bandas antes de la 2da bola)',
            };
        }
        return {
            classification: 'falta_bandas',
            classificationLabel: `Falta de bandas (${details.cushionsBeforeSecondHit} de 3 bandas necesarias)`,
        };
    }

    if (details.cushionsBeforeFirstHit >= 3) {
        return {
            classification: 'bricole',
            classificationLabel: 'Banda Previa (Bricole pura de 3+ bandas)',
        };
    }

    if (details.cushionsBeforeFirstHit > 0) {
        return {
            classification: 'bricole_mixta',
            classificationLabel: `Banda previa mixta (${details.cushionsBeforeFirstHit} previa(s) + ${details.cushionsBetweenHits} intermedia(s))`,
        };
    }

    if (details.cushionsBetweenHits >= 4) {
        return {
            classification: 'pasebola',
            classificationLabel: `Pasebola / Vuelta y media (${details.cushionsBetweenHits} bandas)`,
        };
    }

    return {
        classification: 'clasico',
        classificationLabel: `Carambola clásica a 3 bandas (${details.cushionsBetweenHits} bandas)`,
    };
}

function generateValidationReason(
    isValid: boolean,
    details: ScoringDetails,
    classificationLabel: string
): string {
    if (isValid) {
        const parts: string[] = [];
        parts.push(`¡Carambola Válida UMB! 🎯 (+1 punto)`);
        parts.push(classificationLabel);
        parts.push(`${details.cushionsBeforeSecondHit} bandas antes de contactar a la bola ${details.secondBallHit}`);
        return parts.join(' | ');
    }

    const issues: string[] = [];
    if (!details.firstBallHit) {
        issues.push('No se impactó ninguna bola objetivo');
    } else if (!details.secondBallHit) {
        issues.push(`Solo se tocó una bola (${details.firstBallHit}), no completó la carambola`);
    } else if (details.cushionsBeforeSecondHit < 3) {
        issues.push(
            `Faltan ${3 - details.cushionsBeforeSecondHit} banda(s) antes de la segunda bola (tocó ${details.cushionsBeforeSecondHit} bandas)`
        );
    }

    return `Tiro no válido: ${issues.join('. ')}`;
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

