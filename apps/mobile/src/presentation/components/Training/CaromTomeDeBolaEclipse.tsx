import React, { memo, useCallback, useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    RadialGradient,
    Stop,
} from 'react-native-svg';
import {
    Ball,
    BallId,
    SpinEffect,
    TrajectoryPrediction,
    Vec2,
    vec2,
    vec2Dot,
    vec2Length,
    vec2Normalize,
    vec2Sub,
} from '@bandaro/core';

interface CaromTomeDeBolaEclipseProps {
    balls: Ball[];
    cueBallId: BallId;
    aimDirection: Vec2;
    spin: SpinEffect;
    trajectory: TrajectoryPrediction | null;
    onAimChange?: (newAim: Vec2) => void;
    disabled?: boolean;
    compact?: boolean;
}

interface TomeCalculation {
    targetBall: Ball;
    fraction: number; // 0..1
    fractionLabel: string;
    percentage: number; // 0..100
    side: 'left' | 'right' | 'center' | 'miss';
    cueDeflectionAlphaDeg: number;
    targetExitBetaDeg: number;
    directContact: boolean;
}

const BALL_RADIUS_CM = 3.075;
const COLLISION_DIAMETER_CM = BALL_RADIUS_CM * 2; // 6.15 cm

function calculateTomeDeBola(
    balls: Ball[],
    cueBallId: BallId,
    aimDirection: Vec2,
    trajectory: TrajectoryPrediction | null
): TomeCalculation | null {
    const cueBall = balls.find((b) => b.id === cueBallId);
    if (!cueBall) return null;

    const dir = vec2Normalize(aimDirection);
    const objectBalls = balls.filter((b) => b.id !== cueBallId);
    if (objectBalls.length === 0) return null;

    // 1. Check if trajectory already determined first collision
    let chosenTargetBall: Ball | null = null;
    if (trajectory && trajectory.ballCollisions && trajectory.ballCollisions.length > 0) {
        const firstCol = trajectory.ballCollisions[0];
        const targetId = firstCol.ball1 === cueBallId ? firstCol.ball2 : firstCol.ball1;
        chosenTargetBall = objectBalls.find((b) => b.id === targetId) ?? null;
    }

    // 2. If trajectory didn't collide yet or no trajectory, raycast aim direction
    if (!chosenTargetBall) {
        let bestScore = -Infinity;
        for (const ball of objectBalls) {
            const toBall = vec2Sub(ball.pos, cueBall.pos);
            const dist = vec2Length(toBall);
            const proj = vec2Dot(toBall, dir);

            if (proj > 0) {
                const perp = Math.sqrt(Math.max(0, dist * dist - proj * proj));
                const score = 1000 / (dist + 1) - perp * 20;
                if (score > bestScore) {
                    bestScore = score;
                    chosenTargetBall = ball;
                }
            }
        }
    }

    if (!chosenTargetBall) {
        chosenTargetBall = objectBalls.reduce((closest, cur) => {
            const dCur = vec2Length(vec2Sub(cur.pos, cueBall.pos));
            const dClosest = vec2Length(vec2Sub(closest.pos, cueBall.pos));
            return dCur < dClosest ? cur : closest;
        }, objectBalls[0]);
    }

    const toTarget = vec2Sub(chosenTargetBall.pos, cueBall.pos);
    const distToTarget = vec2Length(toTarget);
    const proj = vec2Dot(toTarget, dir);

    let fraction = 0;
    let side: TomeCalculation['side'] = 'center';
    let directContact = false;
    let alpha = 0;
    let beta = 0;

    if (proj > 0) {
        const perp = Math.sqrt(Math.max(0, distToTarget * distToTarget - proj * proj));
        const cross = toTarget.x * dir.y - toTarget.y * dir.x;

        if (perp <= COLLISION_DIAMETER_CM) {
            directContact = true;
            fraction = Math.max(0, Math.min(1, 1 - perp / COLLISION_DIAMETER_CM));
            
            if (perp < 0.25) {
                side = 'center';
            } else {
                side = cross > 0 ? 'right' : 'left';
            }

            const sinTheta = Math.max(0, Math.min(1, perp / COLLISION_DIAMETER_CM));
            const thetaRad = Math.asin(sinTheta);
            const thetaDeg = (thetaRad * 180) / Math.PI;

            beta = Math.round(thetaDeg);
            alpha = Math.round(90 - thetaDeg);
        } else {
            fraction = 0;
            side = 'miss';
        }
    } else {
        fraction = 0;
        side = 'miss';
    }

    let fractionLabel = 'Sin contacto';
    if (directContact) {
        if (fraction >= 0.90) fractionLabel = '1/1 Llena';
        else if (fraction >= 0.70) fractionLabel = '3/4 Bola';
        else if (fraction >= 0.45) fractionLabel = '1/2 Bola';
        else if (fraction >= 0.32) fractionLabel = '3/8 Bola';
        else if (fraction >= 0.20) fractionLabel = '1/4 Bola';
        else if (fraction >= 0.10) fractionLabel = '1/8 Bola';
        else fractionLabel = '1/16 Fina';
    }

    return {
        targetBall: chosenTargetBall,
        fraction,
        fractionLabel,
        percentage: Math.round(fraction * 100),
        side,
        cueDeflectionAlphaDeg: alpha,
        targetExitBetaDeg: beta,
        directContact,
    };
}

export const CaromTomeDeBolaEclipse = memo(function CaromTomeDeBolaEclipse({
    balls,
    cueBallId,
    aimDirection,
    spin,
    trajectory,
    onAimChange,
    disabled = false,
    compact = false,
}: CaromTomeDeBolaEclipseProps) {
    const { width: windowWidth } = useWindowDimensions();
    const [showPresets, setShowPresets] = useState(false);

    const tome = useMemo(
        () => calculateTomeDeBola(balls, cueBallId, aimDirection, trajectory),
        [balls, cueBallId, aimDirection, trajectory]
    );

    const size = compact ? 46 : 60;
    const center = size / 2;
    const sphereRadius = compact ? 17 : 23;

    const cueBall = balls.find((b) => b.id === cueBallId);
    const targetBall = tome?.targetBall;

    const overlapFrac = tome ? tome.fraction : 0;
    const maxOffset = sphereRadius * 1.95;
    const eclipseOffset = (1 - overlapFrac) * maxOffset;

    let cueBallX = center;
    if (tome?.side === 'right') {
        cueBallX = center + eclipseOffset;
    } else if (tome?.side === 'left') {
        cueBallX = center - eclipseOffset;
    } else if (tome?.side === 'miss') {
        cueBallX = center + sphereRadius * 1.6;
    }

    const tipRadius = compact ? 2.2 : 3;
    const tipX = cueBallX + spin.x * (sphereRadius * 0.7);
    const tipY = center - spin.y * (sphereRadius * 0.7);

    const getBallGradient = (id: BallId) => {
        if (id === 'red') return 'eclipseGradRed';
        if (id === 'yellow') return 'eclipseGradYellow';
        return 'eclipseGradWhite';
    };

    const snapToFraction = useCallback(
        (desiredFrac: number) => {
            if (!cueBall || !targetBall || !onAimChange || disabled) return;

            const toTarget = vec2Sub(targetBall.pos, cueBall.pos);
            const dist = vec2Length(toTarget);
            if (dist === 0) return;

            const h = (1 - desiredFrac) * COLLISION_DIAMETER_CM;
            const angleOffset = Math.asin(Math.max(-1, Math.min(1, h / dist)));

            const baseAngle = Math.atan2(toTarget.y, toTarget.x);
            const sign = tome?.side === 'left' ? -1 : 1;
            const newAngle = baseAngle + sign * angleOffset;

            onAimChange(vec2(Math.cos(newAngle), Math.sin(newAngle)));
            setShowPresets(false);
        },
        [cueBall, targetBall, onAimChange, disabled, tome?.side]
    );

    return (
        <View style={styles.outerContainer}>
            <TouchableOpacity
                style={[styles.cardContainer, compact && styles.cardContainerCompact]}
                onPress={() => setShowPresets((prev) => !prev)}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Tome de Bola Eclipse">
                
                {/* Visualizador tipo Eclipse */}
                <View style={[styles.eclipseWrap, compact && { width: 48, height: 38 }]}>
                    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        <Defs>
                            <RadialGradient id="eclipseGradWhite" cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#ffffff" />
                                <Stop offset="40%" stopColor="#f8fafc" />
                                <Stop offset="75%" stopColor="#cbd5e1" />
                                <Stop offset="100%" stopColor="#64748b" />
                            </RadialGradient>
                            <RadialGradient id="eclipseGradYellow" cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#fffbeb" />
                                <Stop offset="30%" stopColor="#fef08a" />
                                <Stop offset="70%" stopColor="#eab308" />
                                <Stop offset="100%" stopColor="#854d0e" />
                            </RadialGradient>
                            <RadialGradient id="eclipseGradRed" cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#fca5a5" />
                                <Stop offset="30%" stopColor="#ef4444" />
                                <Stop offset="70%" stopColor="#b91c1c" />
                                <Stop offset="100%" stopColor="#7f1d1d" />
                            </RadialGradient>
                        </Defs>

                        {/* 1. BOLA OBJETIVO */}
                        {targetBall && (
                            <G>
                                <Circle
                                    cx={center}
                                    cy={center}
                                    r={sphereRadius}
                                    fill={`url(#${getBallGradient(targetBall.id)})`}
                                    stroke="rgba(255, 255, 255, 0.35)"
                                    strokeWidth={1}
                                />
                                <Line
                                    x1={center}
                                    y1={center - sphereRadius + 2}
                                    x2={center}
                                    y2={center + sphereRadius - 2}
                                    stroke="rgba(0, 0, 0, 0.45)"
                                    strokeWidth={0.8}
                                    strokeDasharray="2 2"
                                />
                            </G>
                        )}

                        {/* 2. BOLA ATACADORA */}
                        {cueBall && (
                            <G opacity={0.88}>
                                <Circle
                                    cx={cueBallX}
                                    cy={center}
                                    r={sphereRadius}
                                    fill={`url(#${getBallGradient(cueBall.id)})`}
                                    stroke="#38bdf8"
                                    strokeWidth={1.2}
                                />
                                <Circle
                                    cx={tipX}
                                    cy={tipY}
                                    r={tipRadius * 1.5}
                                    fill="rgba(0, 210, 255, 0.4)"
                                />
                                <Circle
                                    cx={tipX}
                                    cy={tipY}
                                    r={tipRadius}
                                    fill="#00d2ff"
                                    stroke="#ffffff"
                                    strokeWidth={0.8}
                                />
                            </G>
                        )}
                    </Svg>
                </View>

                {/* Lecturas y Métricas de Desvío */}
                <View style={[styles.metricsCol, compact && styles.metricsColCompact]}>
                    <View style={styles.badgeRow}>
                        <Text style={[styles.fractionTitle, compact && { fontSize: 8.5 }]}>
                            {tome?.fractionLabel ?? 'Tome'}
                        </Text>
                        <Text style={[styles.percentageText, compact && { fontSize: 8 }]}>
                            {tome?.directContact ? `${tome.percentage}%` : '--'}
                        </Text>
                    </View>

                    <View style={styles.angleRow}>
                        <Text style={[styles.angleItem, compact && { fontSize: 8 }]}>
                            α:<Text style={styles.angleVal}>{tome?.directContact ? `${tome.cueDeflectionAlphaDeg}°` : '--'}</Text>
                        </Text>
                        <Text style={styles.angleSep}>•</Text>
                        <Text style={[styles.angleItem, compact && { fontSize: 8 }]}>
                            β:<Text style={styles.angleVal}>{tome?.directContact ? `${tome.targetExitBetaDeg}°` : '--'}</Text>
                        </Text>
                        {tome?.side !== 'center' && tome?.side !== 'miss' && (
                            <Text style={[styles.sideBadge, compact && { fontSize: 7 }]}>
                                {tome?.side === 'right' ? 'Der' : 'Izq'}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {/* Selector Rápido Popover de Tomes (Mobile safe) */}
            {showPresets && (
                <View style={[styles.presetsPopover, { maxWidth: Math.min(280, windowWidth - 20) }]}>
                    <Text style={styles.presetsTitle}>ENCUADRE RÁPIDO DE TOME</Text>
                    <View style={styles.presetsRow}>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={() => snapToFraction(0.125)}>
                            <Text style={styles.presetPillText}>1/8</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={() => snapToFraction(0.25)}>
                            <Text style={styles.presetPillText}>1/4</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={() => snapToFraction(0.375)}>
                            <Text style={styles.presetPillText}>3/8</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={() => snapToFraction(0.50)}>
                            <Text style={styles.presetPillText}>1/2</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={() => snapToFraction(0.75)}>
                            <Text style={styles.presetPillText}>3/4</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={() => snapToFraction(1.0)}>
                            <Text style={styles.presetPillText}>Llena</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    outerContainer: {
        position: 'relative',
        userSelect: 'none',
    },
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 22,
        paddingLeft: 4,
        paddingRight: 10,
        paddingVertical: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    cardContainerCompact: {
        paddingLeft: 2,
        paddingRight: 6,
        paddingVertical: 2,
        gap: 3,
        borderRadius: 18,
    },
    eclipseWrap: {
        width: 54,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    metricsCol: {
        justifyContent: 'center',
        gap: 1.5,
        minWidth: 80,
    },
    metricsColCompact: {
        minWidth: 62,
        gap: 0.5,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3,
    },
    fractionTitle: {
        fontSize: 9.5,
        fontWeight: '900',
        color: '#f8fafc',
    },
    percentageText: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#38bdf8',
        fontVariant: ['tabular-nums'],
    },
    angleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    angleItem: {
        fontSize: 8.5,
        fontWeight: '700',
        color: '#94a3b8',
    },
    angleVal: {
        color: '#f1f5f9',
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    angleSep: {
        fontSize: 7,
        color: '#475569',
    },
    sideBadge: {
        fontSize: 7.5,
        fontWeight: '800',
        color: '#fbbf24',
        textTransform: 'uppercase',
        marginLeft: 1,
    },
    presetsPopover: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.4)',
        borderRadius: 14,
        padding: 8,
        gap: 6,
        zIndex: 999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        minWidth: 220,
    },
    presetsTitle: {
        fontSize: 8,
        fontWeight: '800',
        color: '#38bdf8',
        letterSpacing: 0.8,
    },
    presetsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    presetPill: {
        flex: 1,
        paddingVertical: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetPillText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#e2e8f0',
    },
});
