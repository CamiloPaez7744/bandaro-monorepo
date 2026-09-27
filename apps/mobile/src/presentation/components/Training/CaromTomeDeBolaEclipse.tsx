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
import { useI18n } from '@/components/useLanguage';

export interface CaromTomeDeBolaEclipseProps {
    balls: Ball[];
    cueBallId: BallId;
    aimDirection: Vec2;
    spin: SpinEffect;
    trajectory: TrajectoryPrediction | null;
    onAimChange?: (newAim: Vec2) => void;
    disabled?: boolean;
    compact?: boolean;
    categoryColor?: string;
    isDark?: boolean;
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
    trajectory: TrajectoryPrediction | null,
    lang = 'es'
): TomeCalculation | null {
    const cueBall = balls.find((b) => b.id === cueBallId);
    if (!cueBall) return null;

    const dir = vec2Normalize(aimDirection);
    const objectBalls = balls.filter((b) => b.id !== cueBallId);
    if (objectBalls.length === 0) return null;

    let chosenTargetBall: Ball | null = null;
    let impactCuePos: Vec2 = cueBall.pos;
    let impactDir: Vec2 = dir;
    let trajectoryHadCollision = false;

    // 1. Check if trajectory simulation already determined the collision (handles cushions/bricoles)
    if (trajectory && trajectory.ballCollisions && trajectory.ballCollisions.length > 0) {
        const firstCol = trajectory.ballCollisions[0];
        const targetId = firstCol.ball1 === cueBallId ? firstCol.ball2 : firstCol.ball1;
        const found = objectBalls.find((b) => b.id === targetId) ?? null;
        if (found) {
            chosenTargetBall = found;
            const cuePath = trajectory.paths.find((p) => p.ballId === cueBallId);
            if (cuePath && cuePath.points.length > 0) {
                const idx = Math.min(firstCol.pointIndex, cuePath.points.length - 1);
                impactCuePos = cuePath.points[idx].pos;
                if (idx > 0) {
                    const prevPos = cuePath.points[idx - 1].pos;
                    const d = vec2Sub(impactCuePos, prevPos);
                    if (vec2Length(d) > 0.001) {
                        impactDir = vec2Normalize(d);
                        trajectoryHadCollision = true;
                    }
                }
            }
        }
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
        impactCuePos = cueBall.pos;
        impactDir = dir;
    }

    if (!chosenTargetBall) {
        chosenTargetBall = objectBalls.reduce((closest, cur) => {
            const dCur = vec2Length(vec2Sub(cur.pos, cueBall.pos));
            const dClosest = vec2Length(vec2Sub(closest.pos, cueBall.pos));
            return dCur < dClosest ? cur : closest;
        }, objectBalls[0]);
        impactCuePos = cueBall.pos;
        impactDir = dir;
    }

    const toTarget = vec2Sub(chosenTargetBall.pos, impactCuePos);
    const distToTarget = vec2Length(toTarget);
    const proj = vec2Dot(toTarget, impactDir);

    let fraction = 0;
    let side: TomeCalculation['side'] = 'center';
    let directContact = false;
    let alpha = 0;
    let beta = 0;

    if (trajectoryHadCollision || proj > 0) {
        const perp = Math.sqrt(Math.max(0, distToTarget * distToTarget - proj * proj));
        const cross = toTarget.x * impactDir.y - toTarget.y * impactDir.x;

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

    let fractionLabel = lang === 'en' ? 'No contact' : 'Sin contacto';
    if (directContact) {
        if (fraction >= 0.90) fractionLabel = lang === 'en' ? '1/1 Full' : '1/1 Llena';
        else if (fraction >= 0.70) fractionLabel = lang === 'en' ? '3/4 Ball' : '3/4 Bola';
        else if (fraction >= 0.45) fractionLabel = lang === 'en' ? '1/2 Ball' : '1/2 Bola';
        else if (fraction >= 0.32) fractionLabel = lang === 'en' ? '3/8 Ball' : '3/8 Bola';
        else if (fraction >= 0.20) fractionLabel = lang === 'en' ? '1/4 Ball' : '1/4 Bola';
        else if (fraction >= 0.10) fractionLabel = lang === 'en' ? '1/8 Ball' : '1/8 Bola';
        else fractionLabel = lang === 'en' ? '1/16 Thin' : '1/16 Fina';
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
    categoryColor,
    isDark = true,
}: CaromTomeDeBolaEclipseProps) {
    const { language } = useI18n();
    const { width: windowWidth } = useWindowDimensions();
    const [showPresets, setShowPresets] = useState(false);

    // Unique ID per instance prevents SVG gradient collisions on Web
    const uid = useMemo(() => `tome_${Math.random().toString(36).slice(2, 8)}`, []);

    const tome = useMemo(
        () => calculateTomeDeBola(balls, cueBallId, aimDirection, trajectory, language),
        [balls, cueBallId, aimDirection, trajectory, language]
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

    const getBallGradientId = (id: BallId) => {
        if (id === 'red') return `${uid}_gradRed`;
        if (id === 'yellow') return `${uid}_gradYellow`;
        return `${uid}_gradWhite`;
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

    const activeColor = categoryColor || '#38bdf8';
    const activeGlow = categoryColor ? `${categoryColor}40` : 'rgba(56, 189, 248, 0.35)';

    return (
        <View style={styles.outerContainer}>
            <TouchableOpacity
                style={[
                    styles.cardContainer,
                    compact && styles.cardContainerCompact,
                    categoryColor ? { borderColor: `${categoryColor}55`, shadowColor: categoryColor } : null,
                    !isDark ? { backgroundColor: '#ffffff', borderColor: categoryColor ? `${categoryColor}60` : 'rgba(0, 0, 0, 0.12)' } : null,
                ]}
                onPress={() => setShowPresets((prev) => !prev)}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={language === 'en' ? 'Ball Fullness (Eclipse)' : 'Tome de Bola Eclipse'}>
                
                {/* Visualizador tipo Eclipse */}
                <View style={[styles.eclipseWrap, compact && { width: 48, height: 38 }]}>
                    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        <Defs>
                            <RadialGradient id={`${uid}_gradWhite`} cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#ffffff" />
                                <Stop offset="40%" stopColor="#f8fafc" />
                                <Stop offset="75%" stopColor="#cbd5e1" />
                                <Stop offset="100%" stopColor="#64748b" />
                            </RadialGradient>
                            <RadialGradient id={`${uid}_gradYellow`} cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#fffbeb" />
                                <Stop offset="30%" stopColor="#fef08a" />
                                <Stop offset="70%" stopColor="#eab308" />
                                <Stop offset="100%" stopColor="#854d0e" />
                            </RadialGradient>
                            <RadialGradient id={`${uid}_gradRed`} cx="35%" cy="30%" r="70%">
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
                                    fill={`url(#${getBallGradientId(targetBall.id)})`}
                                    stroke="rgba(255, 255, 255, 0.35)"
                                    strokeWidth={1}
                                />
                                {/* Brillo especular 3D */}
                                <Circle
                                    cx={center - sphereRadius * 0.28}
                                    cy={center - sphereRadius * 0.28}
                                    r={sphereRadius * 0.22}
                                    fill="#ffffff"
                                    opacity={0.65}
                                />
                                <Line
                                    x1={center}
                                    y1={center - sphereRadius + 2}
                                    x2={center}
                                    y2={center + sphereRadius - 2}
                                    stroke={activeColor}
                                    strokeWidth={0.9}
                                    strokeDasharray="2 2"
                                    opacity={0.65}
                                />
                            </G>
                        )}

                        {/* 2. BOLA ATACADORA (Armonizada con el color de categoría) */}
                        {cueBall && (
                            <G opacity={0.92}>
                                <Circle
                                    cx={cueBallX}
                                    cy={center}
                                    r={sphereRadius}
                                    fill={`url(#${getBallGradientId(cueBall.id)})`}
                                    stroke={activeColor}
                                    strokeWidth={1.4}
                                />
                                {/* Brillo especular 3D de la bola tiradora */}
                                <Circle
                                    cx={cueBallX - sphereRadius * 0.28}
                                    cy={center - sphereRadius * 0.28}
                                    r={sphereRadius * 0.22}
                                    fill="#ffffff"
                                    opacity={0.65}
                                />
                                {/* Resplandor exterior del punto de contacto */}
                                <Circle
                                    cx={tipX}
                                    cy={tipY}
                                    r={tipRadius * 1.6}
                                    fill={activeGlow}
                                />
                                {/* Casquillo / impacto con color de categoría */}
                                <Circle
                                    cx={tipX}
                                    cy={tipY}
                                    r={tipRadius}
                                    fill={activeColor}
                                    stroke="#ffffff"
                                    strokeWidth={0.8}
                                />
                            </G>
                        )}
                    </Svg>
                </View>

                {/* Lecturas y Métricas de Desvío */}
                <View style={[styles.metricsCol, compact && styles.metricsColCompact]}>
                    <View style={styles.headerLabelRow}>
                        <Text style={[styles.headerLabelTitle, compact && { fontSize: 7.5 }, { color: activeColor }]}>
                            {language === 'en' ? 'FULLNESS' : 'TOME'}
                        </Text>
                        <View style={[styles.headerLiveDot, { backgroundColor: activeColor }]} />
                    </View>

                    <View style={styles.badgeRow}>
                        <Text
                            style={[
                                styles.fractionTitle,
                                compact && { fontSize: 8.5 },
                                !isDark ? { color: '#0f172a' } : null,
                            ]}
                            numberOfLines={1}
                        >
                            {tome?.fractionLabel ?? (language === 'en' ? 'Contact' : 'Tome')}
                        </Text>
                        <Text style={[styles.percentageText, compact && { fontSize: 8.5 }, { color: activeColor }]}>
                            {tome?.directContact ? `${tome.percentage}%` : '--'}
                        </Text>
                    </View>

                    <View style={styles.angleRow}>
                        <Text style={[styles.angleItem, compact && { fontSize: 8 }, !isDark ? { color: '#64748b' } : null]}>
                            α:<Text style={[styles.angleVal, !isDark ? { color: '#0f172a' } : null, { color: activeColor }]}>{tome?.directContact ? `${tome.cueDeflectionAlphaDeg}°` : '--'}</Text>
                        </Text>
                        <Text style={[styles.angleSep, !isDark ? { color: '#94a3b8' } : null]}>•</Text>
                        <Text style={[styles.angleItem, compact && { fontSize: 8 }, !isDark ? { color: '#64748b' } : null]}>
                            β:<Text style={[styles.angleVal, !isDark ? { color: '#0f172a' } : null]}>{tome?.directContact ? `${tome.targetExitBetaDeg}°` : '--'}</Text>
                        </Text>
                        {tome?.side !== 'center' && tome?.side !== 'miss' && (
                            <View style={[styles.sideBadgePill, { backgroundColor: `${activeColor}22`, borderColor: `${activeColor}55` }]}>
                                <Text style={[styles.sideBadgeText, compact && { fontSize: 7 }, { color: activeColor }]}>
                                    {tome?.side === 'right' ? (language === 'en' ? 'R' : 'Der') : (language === 'en' ? 'L' : 'Izq')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {/* Selector Rápido Popover de Tomes (Mobile safe) */}
            {showPresets && (
                <View style={[
                    styles.presetsPopover,
                    { maxWidth: Math.min(280, windowWidth - 20) },
                    categoryColor ? { borderColor: `${categoryColor}77` } : null,
                    !isDark ? { backgroundColor: '#ffffff', borderColor: categoryColor ? `${categoryColor}80` : '#cbd5e1' } : null,
                ]}>
                    <Text style={[styles.presetsTitle, { color: activeColor }]}>
                        {language === 'en' ? 'QUICK FULLNESS PRESETS' : 'ENCUADRE RÁPIDO DE TOME'}
                    </Text>
                    <View style={styles.presetsRow}>
                        {[
                            { frac: 0.125, label: '1/8' },
                            { frac: 0.25, label: '1/4' },
                            { frac: 0.375, label: '3/8' },
                            { frac: 0.5, label: '1/2' },
                            { frac: 0.75, label: '3/4' },
                            { frac: 1.0, label: language === 'en' ? 'Full' : 'Llena' },
                        ].map((preset) => {
                            const isSelected = tome && Math.abs(tome.fraction - preset.frac) < 0.06;
                            return (
                                <TouchableOpacity
                                    key={preset.label}
                                    style={[
                                        styles.presetPill,
                                        !isDark ? { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' } : null,
                                        isSelected ? { backgroundColor: `${activeColor}25`, borderColor: activeColor } : null,
                                    ]}
                                    onPress={() => snapToFraction(preset.frac)}>
                                    <Text
                                        style={[
                                            styles.presetPillText,
                                            !isDark ? { color: '#0f172a' } : null,
                                            isSelected ? { color: activeColor, fontWeight: '900' } : null,
                                        ]}>
                                        {preset.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
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
    headerLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerLabelTitle: {
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    headerLiveDot: {
        width: 4.5,
        height: 4.5,
        borderRadius: 2.25,
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
    sideBadgePill: {
        paddingHorizontal: 4,
        paddingVertical: 0.5,
        borderRadius: 4,
        borderWidth: 0.5,
        marginLeft: 2,
    },
    sideBadgeText: {
        fontSize: 7.5,
        fontWeight: '900',
        textTransform: 'uppercase',
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
