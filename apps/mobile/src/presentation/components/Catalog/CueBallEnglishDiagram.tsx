import React, { memo, useId } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, {
    Defs,
    RadialGradient,
    LinearGradient,
    Stop,
    Circle,
    Line,
    G,
    Text as SvgText,
} from 'react-native-svg';
import type { CatalogLanguage } from '@/src/infrastructure/catalog/shotAdapter';

export interface CueBallEnglishDiagramProps {
    /** Clock hour (0 to 12). 12 = Top/Follow, 3 = Right, 6 = Bottom/Draw, 9 = Left */
    hour?: number;
    /** English/Spin tip units (0 to 3.0+). 0 = center, 1 = light, 2 = medium, 3 = max */
    tips?: number;
    /** Alternatively, effectX (-1.0 to 1.0 or scraped format) */
    effectX?: number;
    /** Alternatively, effectY (-1.0 to 1.0 or scraped format) */
    effectY?: number;
    /** Ball diameter in pixels. Default 74 */
    diameter?: number;
    /** Current language */
    lang?: CatalogLanguage;
    /** Compact mode for small cards */
    compact?: boolean;
    /** Whether to show technical title and badges */
    showLabels?: boolean;
    /** Additional container style */
    style?: ViewStyle;
}

interface EnglishResolvedInfo {
    hour: number;
    tips: number;
    clockFormatted: string;
    clockString: string;
    tipsString: string;
    spinDescription: string;
    offsetX: number;
    offsetY: number;
}

/**
 * Resolves (hour, tips) from explicit props or (effectX, effectY)
 */
export function resolveEnglish(
    props: CueBallEnglishDiagramProps,
    radius: number,
    lang: CatalogLanguage = 'es'
): EnglishResolvedInfo {
    let hour = 12;
    let tips = 0;

    if (props.hour != null && props.tips != null) {
        hour = props.hour;
        tips = Math.max(0, Math.min(3.5, props.tips));
    } else if (props.effectX != null || props.effectY != null) {
        const ex = props.effectX ?? 0;
        const ey = props.effectY ?? 0;

        if (Math.abs(ex) < 0.001 && Math.abs(ey) < 0.001) {
            hour = 12;
            tips = 0;
        } else if (ey < 0) {
            // Billiard bible scraper format: effectY = -contract_y / 5.0, effectX = contract_x / 5.0
            tips = Math.min(3.5, Math.max(0, Math.abs(ey * 5.0)));
            const rawHour = ex * 5.0;
            if (rawHour <= 0.05 && tips > 0) {
                hour = 12;
            } else {
                hour = Math.round(rawHour * 10) / 10;
                if (hour === 0) hour = 12;
            }
        } else {
            // Standard Cartesian [-1, 1] vector (ex = right/left, ey = top/bottom)
            const angle = Math.atan2(ey, ex); // rad
            // Convert to clock hour (0 rad = 3 o'clock, pi/2 = 6 o'clock, pi = 9, -pi/2 = 12)
            let h = ((angle + Math.PI / 2) / (2 * Math.PI)) * 12;
            if (h <= 0) h += 12;
            hour = Math.round(h * 2) / 2;
            if (hour === 0) hour = 12;
            tips = Math.min(3.5, Math.hypot(ex, ey) * 3.0);
        }
    }

    // Format clock string (e.g. "2:30", "9:00", "12:00")
    const hourWhole = Math.floor(hour);
    const minuteFrac = hour - hourWhole;
    const minutes = Math.round(minuteFrac * 60);
    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const clockFormatted = `${hourWhole === 0 ? 12 : hourWhole}:${minStr}`;

    let clockString = '';
    if (tips <= 0.15) {
        clockString = lang === 'en' ? 'Center Ball' : lang === 'ko' ? '무회전 (중심)' : 'Centro / Sin Efecto';
    } else if (lang === 'en') {
        clockString = `${clockFormatted} o'clock`;
    } else if (lang === 'ko') {
        clockString = `${clockFormatted} 시 방향`;
    } else {
        clockString = `A las ${clockFormatted}`;
    }

    const tipsRounded = Math.round(tips * 10) / 10;
    const tipsString = lang === 'en'
        ? `${tipsRounded} Tips`
        : lang === 'ko'
        ? `${tipsRounded} 팁`
        : `${tipsRounded} Tips`;

    // Mathematical coordinate of contact point on cue ball face
    // Billiard bible: angle = (hour / 12) * 2 * PI - PI / 2
    const theta = (hour / 12) * 2 * Math.PI - Math.PI / 2;
    // max strike radius is 60% of cue ball radius (miscue safe limit)
    const maxStrikeRadius = radius * 0.60;
    const strikeDist = (Math.min(tips, 3.0) / 3.0) * maxStrikeRadius;
    const offsetX = Math.cos(theta) * strikeDist;
    const offsetY = Math.sin(theta) * strikeDist;

    // Spin category label
    let spinDescription = '';
    if (tips <= 0.2) {
        spinDescription = lang === 'en' ? 'Center Hit' : lang === 'ko' ? '중단 무회전' : 'Bola Plana';
    } else {
        const isFollow = hour >= 10.5 || hour <= 1.5;
        const isDraw = hour >= 4.5 && hour <= 7.5;
        const isRight = hour > 1.5 && hour < 4.5;
        const isLeft = hour > 7.5 && hour < 10.5;

        if (isFollow) {
            spinDescription = lang === 'en' ? 'Top / Follow' : lang === 'ko' ? '상단 (밀어치기)' : 'Corrido (Arriba)';
        } else if (isDraw) {
            spinDescription = lang === 'en' ? 'Bottom / Draw' : lang === 'ko' ? '하단 (끌어치기)' : 'Retroceso (Abajo)';
        } else if (isRight) {
            spinDescription = lang === 'en' ? 'Right English' : lang === 'ko' ? '우측 회전' : 'Efecto Derecho';
        } else if (isLeft) {
            spinDescription = lang === 'en' ? 'Left English' : lang === 'ko' ? '좌측 회전' : 'Efecto Izquierdo';
        } else {
            spinDescription = lang === 'en' ? 'Side Spin' : lang === 'ko' ? '복합 당점' : 'Efecto Compuesto';
        }
    }

    return {
        hour,
        tips: tipsRounded,
        clockFormatted,
        clockString,
        tipsString,
        spinDescription,
        offsetX,
        offsetY,
    };
}

export const CueBallEnglishDiagram = memo(function CueBallEnglishDiagram({
    hour,
    tips,
    effectX,
    effectY,
    diameter = 74,
    lang = 'es',
    compact = false,
    showLabels = true,
    style,
}: CueBallEnglishDiagramProps) {
    const rawId = useId();
    const uid = rawId.replace(/[^a-zA-Z0-9]/g, '_');

    const radius = diameter / 2;
    const svgSize = Math.round(diameter * 1.34);
    const center = svgSize / 2;

    const resolved = resolveEnglish(
        { hour, tips, effectX, effectY },
        radius,
        lang
    );

    const tipX = center + resolved.offsetX;
    const tipY = center + resolved.offsetY;
    const tipMarkerRadius = Math.max(3.5, radius * 0.16);

    // Aramith red reference dots (positioned at 120-degree angles)
    const dotOffset = radius * 0.58;

    // Clock hour tick marks (1 to 12)
    const clockTicks = Array.from({ length: 12 }, (_, i) => {
        const tickHour = i + 1;
        const tickAngle = (tickHour / 12) * 2 * Math.PI - Math.PI / 2;
        const isMajor = tickHour % 3 === 0;
        const rInner = radius * (isMajor ? 0.76 : 0.85);
        const rOuter = radius * 0.94;

        return {
            hour: tickHour,
            x1: center + Math.cos(tickAngle) * rInner,
            y1: center + Math.sin(tickAngle) * rInner,
            x2: center + Math.cos(tickAngle) * rOuter,
            y2: center + Math.sin(tickAngle) * rOuter,
            isMajor,
        };
    });

    return (
        <View style={[styles.card, compact && styles.cardCompact, style]}>
            {/* Header Titles */}
            {showLabels && (
                <View style={styles.header}>
                    <View style={styles.titleBadgeRow}>
                        <Text style={styles.labelTitle}>
                            {lang === 'en' ? 'CUE SPIN / HIT' : lang === 'ko' ? '당점 및 회전' : 'EFECTO / TANGENCIA'}
                        </Text>
                        <View style={styles.tipsPill}>
                            <Text style={styles.tipsText}>{resolved.tipsString}</Text>
                        </View>
                    </View>

                    <Text style={styles.clockHeader}>
                        {resolved.clockString}
                    </Text>
                </View>
            )}

            {/* SVG Diagram Canvas */}
            <View style={styles.svgWrapper}>
                <Svg
                    width={svgSize}
                    height={svgSize}
                    viewBox={`0 0 ${svgSize} ${svgSize}`}
                >
                    <Defs>
                        {/* 3D Radial Gradient - Cue Ball */}
                        <RadialGradient
                            id={`cueBallFace_${uid}`}
                            cx="35%"
                            cy="30%"
                            r="70%"
                        >
                            <Stop offset="0%" stopColor="#FFFFFF" />
                            <Stop offset="45%" stopColor="#F8FAFC" />
                            <Stop offset="78%" stopColor="#CBD5E1" />
                            <Stop offset="100%" stopColor="#64748B" />
                        </RadialGradient>

                        {/* Blue Master Chalk Tip Gradient */}
                        <RadialGradient
                            id={`chalkTipGrad_${uid}`}
                            cx="40%"
                            cy="35%"
                            r="65%"
                        >
                            <Stop offset="0%" stopColor="#67E8F9" />
                            <Stop offset="30%" stopColor="#0284C7" />
                            <Stop offset="80%" stopColor="#0369A1" />
                            <Stop offset="100%" stopColor="#0C4A6E" />
                        </RadialGradient>

                        {/* Drop shadow behind ball */}
                        <RadialGradient
                            id={`cueBallShadow_${uid}`}
                            cx="50%"
                            cy="50%"
                            r="50%"
                        >
                            <Stop offset="0%" stopColor="rgba(0,0,0,0.5)" />
                            <Stop offset="70%" stopColor="rgba(0,0,0,0.18)" />
                            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
                        </RadialGradient>
                    </Defs>

                    {/* 1. Ambient Drop Shadow */}
                    <Circle
                        cx={center + 1}
                        cy={center + radius * 0.8}
                        r={radius * 0.92}
                        fill={`url(#cueBallShadow_${uid})`}
                    />

                    {/* 2. 3D CUE BALL SPHERE */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill={`url(#cueBallFace_${uid})`}
                        stroke="rgba(255, 255, 255, 0.4)"
                        strokeWidth={1.2}
                    />

                    {/* 3. Subtle Clock Hour Tick Marks */}
                    {clockTicks.map((tick) => (
                        <Line
                            key={tick.hour}
                            x1={tick.x1}
                            y1={tick.y1}
                            x2={tick.x2}
                            y2={tick.y2}
                            stroke={tick.isMajor ? 'rgba(51, 65, 85, 0.65)' : 'rgba(100, 116, 139, 0.35)'}
                            strokeWidth={tick.isMajor ? 1.4 : 0.8}
                        />
                    ))}

                    {/* 4. Concentric Tip Guide Rings (1 tip, 2 tips, 3 tips) */}
                    {/* Ring 1 (1 Tip) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius * 0.20}
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.35)"
                        strokeWidth={0.8}
                        strokeDasharray="2 2"
                    />
                    {/* Ring 2 (2 Tips) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius * 0.40}
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.4)"
                        strokeWidth={0.8}
                        strokeDasharray="2 2"
                    />
                    {/* Ring 3 (3 Tips - Maximum Strike Safe Boundary) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius * 0.60}
                        fill="none"
                        stroke="rgba(239, 68, 68, 0.45)"
                        strokeWidth={1}
                        strokeDasharray="3 2"
                    />



                    {/* 6. Ball Specular Gloss Highlight */}
                    <Circle
                        cx={center - radius * 0.32}
                        cy={center - radius * 0.34}
                        r={radius * 0.28}
                        fill="rgba(255, 255, 255, 0.5)"
                    />

                    {/* 8. AIM / STRIKE VECTOR LINE (from center to hit point) */}
                    {resolved.tips > 0.15 && (
                        <Line
                            x1={center}
                            y1={center}
                            x2={tipX}
                            y2={tipY}
                            stroke="#0284C7"
                            strokeWidth={1.5}
                            strokeDasharray="2 1.5"
                        />
                    )}

                    {/* 9. CHALKED CUE TIP CONTACT POINT */}
                    <G>
                        {/* Glowing laser aura */}
                        <Circle
                            cx={tipX}
                            cy={tipY}
                            r={tipMarkerRadius * 1.6}
                            fill="rgba(2, 132, 199, 0.28)"
                        />
                        {/* Outer precision ring */}
                        <Circle
                            cx={tipX}
                            cy={tipY}
                            r={tipMarkerRadius * 1.2}
                            fill="none"
                            stroke="#38BDF8"
                            strokeWidth={1}
                        />
                        {/* Chalked core dot */}
                        <Circle
                            cx={tipX}
                            cy={tipY}
                            r={tipMarkerRadius}
                            fill={`url(#chalkTipGrad_${uid})`}
                            stroke="#FFFFFF"
                            strokeWidth={1}
                        />
                        {/* Target Reticle Crosshair */}
                        <Line
                            x1={tipX - tipMarkerRadius * 0.7}
                            y1={tipY}
                            x2={tipX + tipMarkerRadius * 0.7}
                            y2={tipY}
                            stroke="#FFFFFF"
                            strokeWidth={0.8}
                        />
                        <Line
                            x1={tipX}
                            y1={tipY - tipMarkerRadius * 0.7}
                            x2={tipX}
                            y2={tipY + tipMarkerRadius * 0.7}
                            stroke="#FFFFFF"
                            strokeWidth={0.8}
                        />
                    </G>
                </Svg>
            </View>

            {/* Bottom Footer Description */}
            {showLabels && (
                <View style={styles.footer}>
                    <Text style={styles.footerDescription}>
                        {resolved.spinDescription}
                    </Text>
                    <Text style={styles.footerCoord}>
                        {resolved.clockFormatted ?? `${resolved.hour}:00`}
                    </Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    cardCompact: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    titleBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    labelTitle: {
        color: '#94A3B8',
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    tipsPill: {
        backgroundColor: 'rgba(2, 132, 199, 0.2)',
        borderColor: 'rgba(56, 189, 248, 0.45)',
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 10,
    },
    tipsText: {
        color: '#38BDF8',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    clockHeader: {
        color: '#F1F5F9',
        fontSize: 11,
        fontWeight: '600',
    },
    svgWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 2,
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    footerDescription: {
        color: '#CBD5E1',
        fontSize: 11.5,
        fontWeight: '600',
    },
    footerCoord: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
});

export default CueBallEnglishDiagram;
