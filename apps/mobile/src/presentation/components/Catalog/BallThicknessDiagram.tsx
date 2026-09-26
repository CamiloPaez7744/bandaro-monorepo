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
    ClipPath,
    Rect,
    Text as SvgText,
} from 'react-native-svg';
import type { CatalogLanguage } from '@/src/infrastructure/catalog/shotAdapter';
import { resolveEnglish } from './CueBallEnglishDiagram';

export interface BallThicknessDiagramProps {
    /** Thickness in 1/8 units (-8.0 to +8.0). Positive = left cut, Negative = right cut, 0 = frontal */
    thickness: number;
    /** Clock hour (0 to 12). 12 = Top/Follow, 3 = Right, 6 = Bottom/Draw, 9 = Left */
    hour?: number;
    /** English/Spin tip units (0 to 3.0+). 0 = center, 1 = light, 2 = medium, 3 = max */
    tips?: number;
    /** Alternatively, effectX (-1.0 to 1.0 or scraped format) */
    effectX?: number;
    /** Alternatively, effectY (-1.0 to 1.0 or scraped format) */
    effectY?: number;
    /** Ball diameter in pixels. Default 64 */
    diameter?: number;
    /** Cue ball color tint ('white' | 'yellow'). Default 'white' */
    cueBallType?: 'white' | 'yellow';
    /** Target object ball color tint ('yellow' | 'red' | 'white'). Default 'yellow' */
    objectBallType?: 'yellow' | 'red' | 'white';
    /** Current language */
    lang?: CatalogLanguage;
    /** Compact mode for small cards */
    compact?: boolean;
    /** Whether to show technical title and badges */
    showLabels?: boolean;
    /** Additional container style */
    style?: ViewStyle;
}

export interface ThicknessLabelInfo {
    fraction: string;
    description: string;
    cutDirection: string;
    percentage: number;
}

export function getThicknessInfo(thickness: number, lang: CatalogLanguage = 'es'): ThicknessLabelInfo {
    const absT = Math.min(8, Math.max(0, Math.abs(thickness)));
    const isLeft = thickness > 0.05;
    const isRight = thickness < -0.05;

    let fraction = '8/8';
    let percentage = 100;
    let descEs = 'Llena';
    let descEn = 'Full Ball';
    let descKo = '정면 (100%)';

    if (absT <= 0.3) {
        fraction = '8/8';
        percentage = 100;
        descEs = 'Bola Llena';
        descEn = 'Full Ball';
        descKo = '정면 충돌';
    } else if (absT <= 1.2) {
        fraction = '1/8';
        percentage = 12.5;
        descEs = '1/8 Fina';
        descEn = '1/8 Thin';
        descKo = '1/8 두께 (얇게)';
    } else if (absT <= 2.2) {
        fraction = '2/8';
        percentage = 25;
        descEs = '1/4 (2/8)';
        descEn = '1/4 Ball';
        descKo = '1/4 두께 (2/8)';
    } else if (absT <= 3.2) {
        fraction = '3/8';
        percentage = 37.5;
        descEs = '3/8 Bola';
        descEn = '3/8 Ball';
        descKo = '3/8 두께';
    } else if (absT <= 4.3) {
        fraction = '4/8';
        percentage = 50;
        descEs = '1/2 (Media)';
        descEn = '1/2 Half';
        descKo = '1/2 두께 (절반)';
    } else if (absT <= 5.3) {
        fraction = '5/8';
        percentage = 62.5;
        descEs = '5/8 Bola';
        descEn = '5/8 Ball';
        descKo = '5/8 두께';
    } else if (absT <= 6.3) {
        fraction = '6/8';
        percentage = 75;
        descEs = '3/4 (6/8)';
        descEn = '3/4 Ball';
        descKo = '3/4 두께 (6/8)';
    } else if (absT <= 7.3) {
        fraction = '7/8';
        percentage = 87.5;
        descEs = '7/8 Gruesa';
        descEn = '7/8 Heavy';
        descKo = '7/8 두께';
    } else {
        fraction = `${Math.round(absT * 10) / 10}/8`;
        percentage = Math.round((1 - absT / 8) * 100);
        descEs = `${fraction} Bola`;
        descEn = `${fraction} Ball`;
        descKo = `${fraction} 두께`;
    }

    let cutDirection = '';
    if (isLeft) {
        cutDirection = lang === 'en' ? 'Left Cut' : lang === 'ko' ? '좌측 빗겨치기' : 'Corte Izq ←';
    } else if (isRight) {
        cutDirection = lang === 'en' ? 'Right Cut' : lang === 'ko' ? '우측 빗겨치기' : '→ Corte Der';
    } else {
        cutDirection = lang === 'en' ? 'Head-On' : lang === 'ko' ? '정면' : 'Frontal Directo';
    }

    const description = lang === 'en' ? descEn : lang === 'ko' ? descKo : descEs;

    return {
        fraction,
        description,
        cutDirection,
        percentage,
    };
}

/**
 * Unified Ball Tactics Diagram:
 * Combines Ball Thickness (Tome de Bola) and Cue Ball English / Hit Point (Efecto)
 * into a single compact diagram, saving vertical space.
 * 
 * - Yellow Object Ball shows vertical thickness division lines (1/8, 1/4, 1/2, 3/4)
 *   with the active cut line highlighted in cyan.
 * - White Cue Ball is clean without black axes/arrows lines, rendered in 3D pearl white,
 *   with concentric tip guide rings and Master Chalk hit point marker for English.
 */
export const BallThicknessDiagram = memo(function BallThicknessDiagram({
    thickness,
    hour,
    tips,
    effectX,
    effectY,
    diameter = 64,
    cueBallType = 'white',
    objectBallType = 'yellow',
    lang = 'es',
    compact = false,
    showLabels = true,
    style,
}: BallThicknessDiagramProps) {
    const rawId = useId();
    const uid = rawId.replace(/[^a-zA-Z0-9]/g, '_');

    const radius = diameter / 2;
    const stepPerEighth = diameter / 8;
    const clampedThickness = Math.max(-8, Math.min(8, thickness));

    // Horizontal offset of object ball relative to cue ball
    // Positive thickness = left cut (object ball shifted to left)
    // Negative thickness = right cut (object ball shifted to right)
    const objOffset = -clampedThickness * stepPerEighth;

    // Viewbox width and height - tight and compact
    const svgWidth = Math.round(diameter * 2.85);
    const svgHeight = Math.round(diameter * 1.34);
    const centerY = Math.round(svgHeight * 0.52);
    const cueCenterX = svgWidth / 2;
    const objCenterX = cueCenterX + objOffset;

    const info = getThicknessInfo(clampedThickness, lang);
    const resolvedEnglish = resolveEnglish(
        { hour, tips, effectX, effectY },
        radius,
        lang
    );

    // Collision contact point coordinates
    const contactX = (cueCenterX + objCenterX) / 2;
    const contactRadius = radius * 0.16;

    const isRightCut = clampedThickness < -0.05;
    const absT = Math.abs(clampedThickness);

    // Vertical thickness division lines on object ball (1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8)
    const divisionLines = [1, 2, 3, 4, 5, 6, 7].map((eighth) => {
        const lineOffsetFromCenter = (isRightCut ? -1 : 1) * radius * (1 - eighth / 4);
        const lineX = objCenterX + lineOffsetFromCenter;
        const isCenter = eighth === 4;
        const isQuarter = eighth === 2;
        const isHalf = eighth === 4;
        const isThreeQuarter = eighth === 6;
        const isEighth = eighth === 1;
        const isMajor = isQuarter || isHalf || isThreeQuarter || isEighth;
        const isActive = Math.abs(absT - eighth) < 0.48;

        let label = '';
        if (isEighth) label = '1/8';
        else if (isQuarter) label = '1/4';
        else if (isHalf) label = '1/2';
        else if (isThreeQuarter) label = '3/4';

        return {
            eighth,
            lineX,
            isCenter,
            isMajor,
            isActive,
            label,
        };
    });

    // Cue tip contact coordinates on the white cue ball
    const tipX = cueCenterX + resolvedEnglish.offsetX;
    const tipY = centerY + resolvedEnglish.offsetY;
    const tipMarkerRadius = Math.max(3.2, radius * 0.15);

    return (
        <View style={[styles.card, compact && styles.cardCompact, style]}>
            {/* Header Titles & Badges */}
            {showLabels && (
                <View style={styles.header}>
                    <View style={styles.headerTitleCol}>
                        <Text style={styles.labelTitle}>
                            {lang === 'en' ? 'THICKNESS & ENGLISH' : lang === 'ko' ? '두께 및 당점' : 'TOME Y EFECTO'}
                        </Text>
                    </View>

                    <View style={styles.badgesRow}>
                        {/* Tome Fraction Badge */}
                        <View style={styles.fractionPill}>
                            <Text style={styles.fractionText}>{info.fraction}</Text>
                        </View>

                        {/* English Spin Badge */}
                        <View style={styles.tipsPill}>
                            <Text style={styles.tipsText}>
                                {resolvedEnglish.tips > 0.15
                                    ? `${resolvedEnglish.clockFormatted} • ${resolvedEnglish.tips}T`
                                    : (lang === 'en' ? 'Center' : lang === 'ko' ? '중심' : 'Centro')}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* SVG Diagram Canvas: Yellow Ball (Thickness) + White Ball (Clean Pearl + Cue English) */}
            <View style={styles.svgWrapper}>
                <Svg
                    width={svgWidth}
                    height={svgHeight}
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                >
                    <Defs>
                        {/* 3D Radial Gradient - White Pearl Cue Ball */}
                        <RadialGradient
                            id={`thickWhiteBall_${uid}`}
                            cx="34%"
                            cy="30%"
                            r="68%"
                        >
                            <Stop offset="0%" stopColor="#FFFFFF" />
                            <Stop offset="45%" stopColor="#F8FAFC" />
                            <Stop offset="80%" stopColor="#CBD5E1" />
                            <Stop offset="100%" stopColor="#64748B" />
                        </RadialGradient>

                        {/* 3D Radial Gradient - Golden Yellow Object Ball */}
                        <RadialGradient
                            id={`thickYellowBall_${uid}`}
                            cx="34%"
                            cy="30%"
                            r="68%"
                        >
                            <Stop offset="0%" stopColor="#FEF9C3" />
                            <Stop offset="30%" stopColor="#FDE047" />
                            <Stop offset="70%" stopColor="#EAB308" />
                            <Stop offset="100%" stopColor="#78350F" />
                        </RadialGradient>

                        {/* 3D Radial Gradient - Crimson Red Ball */}
                        <RadialGradient
                            id={`thickRedBall_${uid}`}
                            cx="34%"
                            cy="30%"
                            r="68%"
                        >
                            <Stop offset="0%" stopColor="#FCA5A5" />
                            <Stop offset="30%" stopColor="#EF4444" />
                            <Stop offset="75%" stopColor="#B91C1C" />
                            <Stop offset="100%" stopColor="#450A0A" />
                        </RadialGradient>

                        {/* Master Chalk Blue Cue Tip Gradient */}
                        <RadialGradient
                            id={`chalkTipGrad_${uid}`}
                            cx="38%"
                            cy="34%"
                            r="66%"
                        >
                            <Stop offset="0%" stopColor="#67E8F9" />
                            <Stop offset="35%" stopColor="#0284C7" />
                            <Stop offset="82%" stopColor="#0369A1" />
                            <Stop offset="100%" stopColor="#0C4A6E" />
                        </RadialGradient>

                        {/* Ambient Shadow Gradient underneath balls */}
                        <RadialGradient
                            id={`thickShadow_${uid}`}
                            cx="50%"
                            cy="50%"
                            r="50%"
                        >
                            <Stop offset="0%" stopColor="rgba(0,0,0,0.52)" />
                            <Stop offset="65%" stopColor="rgba(0,0,0,0.2)" />
                            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
                        </RadialGradient>

                        {/* Clip Path for Yellow Object Ball to contain vertical thickness lines */}
                        <ClipPath id={`objBallClip_${uid}`}>
                            <Circle cx={objCenterX} cy={centerY} r={radius} />
                        </ClipPath>
                    </Defs>

                    {/* 1. Ambient Drop Shadows */}
                    <Circle
                        cx={objCenterX + 2}
                        cy={centerY + radius * 0.8}
                        r={radius * 0.9}
                        fill={`url(#thickShadow_${uid})`}
                    />
                    <Circle
                        cx={cueCenterX + 2}
                        cy={centerY + radius * 0.82}
                        r={radius * 0.92}
                        fill={`url(#thickShadow_${uid})`}
                    />

                    {/* 2. OBJECT BALL 1 (Background Ball with Vertical Thickness Lines) */}
                    <G opacity={0.96}>
                        {/* Object Ball Sphere */}
                        <Circle
                            cx={objCenterX}
                            cy={centerY}
                            r={radius}
                            fill={`url(#thick${objectBallType === 'red' ? 'Red' : objectBallType === 'white' ? 'White' : 'Yellow'}Ball_${uid})`}
                            stroke="#0F172A"
                            strokeWidth={1}
                        />

                        {/* Vertical Thickness Division Lines (Clipped inside Ball) */}
                        <G clipPath={`url(#objBallClip_${uid})`}>
                            {divisionLines.map((item) => (
                                <G key={item.eighth}>
                                    {item.isActive && (
                                        <Line
                                            x1={item.lineX}
                                            y1={centerY - radius}
                                            x2={item.lineX}
                                            y2={centerY + radius}
                                            stroke="rgba(56, 189, 248, 0.45)"
                                            strokeWidth={4.5}
                                        />
                                    )}
                                    <Line
                                        x1={item.lineX}
                                        y1={centerY - radius}
                                        x2={item.lineX}
                                        y2={centerY + radius}
                                        stroke={
                                            item.isActive
                                                ? '#0284C7'
                                                : item.isCenter
                                                ? 'rgba(15, 23, 42, 0.75)'
                                                : item.isMajor
                                                ? 'rgba(15, 23, 42, 0.45)'
                                                : 'rgba(15, 23, 42, 0.22)'
                                        }
                                        strokeWidth={item.isActive ? 2.2 : item.isCenter ? 1.6 : item.isMajor ? 1.1 : 0.75}
                                        strokeDasharray={item.isActive || item.isCenter ? undefined : '2.5 2'}
                                    />
                                </G>
                            ))}
                        </G>

                        {/* Object Ball Specular highlight */}
                        <Circle
                            cx={objCenterX - radius * 0.32}
                            cy={centerY - radius * 0.34}
                            r={radius * 0.28}
                            fill="rgba(255, 255, 255, 0.32)"
                        />

                        {/* Fractional Labels for 1/8, 1/4, 1/2, 3/4 */}
                        {divisionLines
                            .filter((item) => item.label)
                            .map((item) => (
                                <G key={`lbl_${item.eighth}`}>
                                    <Rect
                                        x={item.lineX - 8.5}
                                        y={centerY - radius - 11.5}
                                        width={17}
                                        height={10}
                                        rx={3}
                                        fill={item.isActive ? '#0284C7' : 'rgba(15, 23, 42, 0.78)'}
                                    />
                                    <SvgText
                                        x={item.lineX}
                                        y={centerY - radius - 4}
                                        fill={item.isActive ? '#FFFFFF' : '#E2E8F0'}
                                        fontSize={6.5}
                                        fontWeight={item.isActive ? '800' : '600'}
                                        textAnchor="middle"
                                    >
                                        {item.label}
                                    </SvgText>
                                </G>
                            ))}
                    </G>

                    {/* 3. Overlap Impact Tangent Indicator */}
                    {Math.abs(objOffset) < diameter && (
                        <G>
                            <Line
                                x1={contactX}
                                y1={centerY - radius * 0.85}
                                x2={contactX}
                                y2={centerY + radius * 0.85}
                                stroke="#38BDF8"
                                strokeWidth={1.4}
                                strokeDasharray="2 2"
                            />
                            <Circle
                                cx={contactX}
                                cy={centerY}
                                r={contactRadius * 0.65}
                                fill="#38BDF8"
                                stroke="#FFFFFF"
                                strokeWidth={0.8}
                            />
                        </G>
                    )}

                    {/* 4. CUE BALL (Clean 3D Pearl Sphere + Cue Hit Point English - NO black axes or arrows) */}
                    <G opacity={0.97}>
                        {/* 3D Pearl Cue Ball Sphere */}
                        <Circle
                            cx={cueCenterX}
                            cy={centerY}
                            r={radius}
                            fill={`url(#thick${cueBallType === 'yellow' ? 'Yellow' : 'White'}Ball_${uid})`}
                            stroke="rgba(255, 255, 255, 0.45)"
                            strokeWidth={1.2}
                        />

                        {/* Concentric Tip Guide Rings (1 tip, 2 tips, 3 tips max safe boundary) */}
                        <Circle
                            cx={cueCenterX}
                            cy={centerY}
                            r={radius * 0.20}
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.3)"
                            strokeWidth={0.8}
                            strokeDasharray="2 2"
                        />
                        <Circle
                            cx={cueCenterX}
                            cy={centerY}
                            r={radius * 0.40}
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.32)"
                            strokeWidth={0.8}
                            strokeDasharray="2 2"
                        />
                        <Circle
                            cx={cueCenterX}
                            cy={centerY}
                            r={radius * 0.60}
                            fill="none"
                            stroke="rgba(239, 68, 68, 0.38)"
                            strokeWidth={0.85}
                            strokeDasharray="2.5 2"
                        />

                        {/* Cue Ball Specular Gloss Highlight */}
                        <Circle
                            cx={cueCenterX - radius * 0.32}
                            cy={centerY - radius * 0.34}
                            r={radius * 0.28}
                            fill="rgba(255, 255, 255, 0.42)"
                        />

                        {/* Subtle Spin Vector Line (if spin is applied) */}
                        {resolvedEnglish.tips > 0.2 && (
                            <Line
                                x1={cueCenterX}
                                y1={centerY}
                                x2={tipX}
                                y2={tipY}
                                stroke="rgba(2, 132, 199, 0.6)"
                                strokeWidth={1}
                                strokeDasharray="1.5 1.5"
                            />
                        )}

                        {/* Cue Tip Strike Contact Point (Master Chalk Blue Marker) */}
                        <G>
                            {/* Glowing aura */}
                            <Circle
                                cx={tipX}
                                cy={tipY}
                                r={tipMarkerRadius * 1.5}
                                fill="rgba(2, 132, 199, 0.25)"
                            />
                            {/* Precision cyan outer ring */}
                            <Circle
                                cx={tipX}
                                cy={tipY}
                                r={tipMarkerRadius * 1.15}
                                fill="none"
                                stroke="#38BDF8"
                                strokeWidth={0.9}
                            />
                            {/* Master chalk blue core */}
                            <Circle
                                cx={tipX}
                                cy={tipY}
                                r={tipMarkerRadius}
                                fill={`url(#chalkTipGrad_${uid})`}
                                stroke="#FFFFFF"
                                strokeWidth={0.8}
                            />
                            {/* Micro reticle inside tip marker */}
                            <Line
                                x1={tipX - tipMarkerRadius * 0.55}
                                y1={tipY}
                                x2={tipX + tipMarkerRadius * 0.55}
                                y2={tipY}
                                stroke="#FFFFFF"
                                strokeWidth={0.7}
                            />
                            <Line
                                x1={tipX}
                                y1={tipY - tipMarkerRadius * 0.55}
                                x2={tipX}
                                y2={tipY + tipMarkerRadius * 0.55}
                                stroke="#FFFFFF"
                                strokeWidth={0.7}
                            />
                        </G>
                    </G>
                </Svg>
            </View>

            {/* Bottom Footer Description (Tome Cut Direction + Spin Type) */}
            {showLabels && (
                <View style={styles.footer}>
                    <Text style={styles.footerCutText}>
                        {info.cutDirection} ({info.fraction})
                    </Text>
                    <Text style={styles.footerSpinText}>
                        {resolvedEnglish.spinDescription}
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
        paddingVertical: 9,
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
    headerTitleCol: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    labelTitle: {
        color: '#94A3B8',
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    fractionPill: {
        backgroundColor: 'rgba(56, 189, 248, 0.18)',
        borderColor: 'rgba(56, 189, 248, 0.45)',
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 10,
    },
    fractionText: {
        color: '#38BDF8',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.2,
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
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    svgWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 1,
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
    footerCutText: {
        color: '#CBD5E1',
        fontSize: 11,
        fontWeight: '600',
    },
    footerSpinText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '600',
    },
});

export default BallThicknessDiagram;
