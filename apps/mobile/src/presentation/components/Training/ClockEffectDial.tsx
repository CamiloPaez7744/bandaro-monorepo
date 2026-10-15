import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { theme } from '@/constants/theme';

export type EffectSystemType = 'reloj' | 'estandar' | 'conti' | 'ingles';

export interface ClockEffectDialProps {
    selectedPoint?: number; // 0, 1, 2, 3, 4
    onSelectPoint?: (point: number) => void;
    systemType?: EffectSystemType;
    onSelectSystemType?: (type: EffectSystemType) => void;
    cueDirection?: 'right' | 'left'; // right = clockwise (1:00..4:00), left = counter-clockwise (11:00..8:00)
    onToggleDirection?: () => void;
}

const RELOJ_POINTS = [
    { point: 0, hourRight: '12:00', hourLeft: '12:00', color: '#0f172a', ring: '#0284c7', label: '0', angleRight: -90, angleLeft: -90, desc: 'Sin efecto lateral. Golpe centrado arriba.' },
    { point: 1, hourRight: '1:00', hourLeft: '11:00', color: '#854d0e', ring: '#0284c7', label: '1', angleRight: -60, angleLeft: -120, desc: 'Efecto 1 suave: 1 punta de taco hacia la banda.' },
    { point: 2, hourRight: '2:00', hourLeft: '10:00', color: '#16a34a', ring: '#0284c7', label: '2', angleRight: -30, angleLeft: -150, desc: 'Efecto 2 medio: 2 puntas de taco, rotación constante.' },
    { point: 3, hourRight: '3:00', hourLeft: '9:00', color: '#dc2626', ring: '#38bdf8', label: '3', angleRight: 0, angleLeft: 180, desc: 'Efecto 3 Canónico Base 50: Rotación máxima natural a las 3:00.' },
    { point: 4, hourRight: '4:00', hourLeft: '8:00', color: '#0284c7', ring: '#1e3a8a', label: '4', angleRight: 30, angleLeft: 150, desc: 'Efecto 4 corrido bajo: Máximo agarre de banda.' },
];

function ClockEffectDialBase({
    selectedPoint = 3,
    onSelectPoint,
    systemType = 'reloj',
    onSelectSystemType,
    cueDirection = 'right',
    onToggleDirection,
}: ClockEffectDialProps) {
    const isClockwise = cueDirection === 'right';
    const activePointData = RELOJ_POINTS.find((p) => p.point === selectedPoint) ?? RELOJ_POINTS[3];

    // Dial geometry in SVG (center at 60, 60, radius 46)
    const cx = 60;
    const cy = 60;
    const radius = 46;
    const pointRadius = 36; // Distance from center for effect markers

    return (
        <View style={styles.container}>
            {/* Header: Title and Effect Style Selector */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.systemBadge}>EFECTO DE ROTACIÓN</Text>
                    <Text style={styles.systemTitle}>Reloj Canónico (3:00)</Text>
                </View>
                {onToggleDirection && (
                    <TouchableOpacity style={styles.directionButton} onPress={onToggleDirection}>
                        <Text style={styles.directionButtonText}>
                            {isClockwise ? '⟳ Horario (Der.)' : '⟲ Anti-Horario (Izq.)'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Effect Systems Tabs */}
            <View style={styles.systemTabsRow}>
                {(['reloj', 'estandar', 'conti', 'ingles'] as EffectSystemType[]).map((type) => {
                    const isSelected = systemType === type;
                    const labels: Record<EffectSystemType, string> = {
                        reloj: 'Reloj (Base 50)',
                        estandar: 'Estándar',
                        conti: 'Conti (-5..+7)',
                        ingles: 'Inglés',
                    };
                    return (
                        <TouchableOpacity
                            key={type}
                            style={[styles.systemTab, isSelected && styles.systemTabActive]}
                            onPress={() => onSelectSystemType?.(type)}
                        >
                            <Text style={[styles.systemTabText, isSelected && styles.systemTabTextActive]}>
                                {labels[type]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Dial and Info Row */}
            <View style={styles.bodyRow}>
                {/* Visual SVG Cue Ball Dial */}
                <View style={styles.svgWrap}>
                    <Svg width={120} height={120} viewBox="0 0 120 120">
                        {/* Outer Cue Ball */}
                        <Circle cx={cx} cy={cy} r={radius} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} />
                        {/* Ball specular shadow */}
                        <Circle cx={cx + 3} cy={cy + 3} r={radius - 1} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />

                        {/* Clock Guidelines (every 30 degrees) */}
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                            const rad = (deg * Math.PI) / 180;
                            const x1 = cx + Math.cos(rad) * (radius - 5);
                            const y1 = cy + Math.sin(rad) * (radius - 5);
                            const x2 = cx + Math.cos(rad) * radius;
                            const y2 = cy + Math.sin(rad) * radius;
                            return (
                                <Line
                                    key={`guideline-${deg}`}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="#cbd5e1"
                                    strokeWidth={deg % 90 === 0 ? 1.5 : 0.8}
                                />
                            );
                        })}

                        {/* Crosshairs at Center */}
                        <Line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="2,2" />
                        <Line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="2,2" />

                        {/* Center Point */}
                        <Circle cx={cx} cy={cy} r={1.8} fill="#64748b" />

                        {/* Interactive Effect Points Graphics (0, 1, 2, 3, 4) */}
                        {RELOJ_POINTS.map((item) => {
                            const angleDeg = isClockwise ? item.angleRight : item.angleLeft;
                            const angleRad = (angleDeg * Math.PI) / 180;
                            const px = cx + Math.cos(angleRad) * pointRadius;
                            const py = cy + Math.sin(angleRad) * pointRadius;
                            const isCurrent = item.point === selectedPoint;

                            return (
                                <G key={`effect-pt-${item.point}`}>
                                    {/* Active Pulse Glow */}
                                    {isCurrent && (
                                        <Circle cx={px} cy={py} r={9.5} fill="none" stroke="#38bdf8" strokeWidth={2} opacity={0.8} />
                                    )}
                                    {/* Point Body */}
                                    <Circle
                                        cx={px}
                                        cy={py}
                                        r={7.2}
                                        fill={item.color}
                                        stroke={item.ring}
                                        strokeWidth={1.5}
                                    />
                                    {/* Text Label */}
                                    <SvgText
                                        x={px}
                                        y={py + 3.2}
                                        fontSize={9}
                                        fontWeight="bold"
                                        fill="#ffffff"
                                        textAnchor="middle"
                                    >
                                        {item.label}
                                    </SvgText>
                                </G>
                            );
                        })}
                    </Svg>

                    {/* Touch / Click Target Overlays (Standard React Native TouchableOpacity - No SVG responder warnings!) */}
                    {RELOJ_POINTS.map((item) => {
                        const angleDeg = isClockwise ? item.angleRight : item.angleLeft;
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const px = cx + Math.cos(angleRad) * pointRadius;
                        const py = cy + Math.sin(angleRad) * pointRadius;
                        return (
                            <TouchableOpacity
                                key={`touch-pt-${item.point}`}
                                style={[
                                    styles.pointTouchTarget,
                                    {
                                        left: px - 13,
                                        top: py - 13,
                                    },
                                ]}
                                onPress={() => onSelectPoint?.(item.point)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={`Efecto ${item.point}`}
                            />
                        );
                    })}
                </View>

                {/* Point Selector and Details */}
                <View style={styles.detailsWrap}>
                    <View style={styles.pointPillsRow}>
                        {RELOJ_POINTS.map((item) => {
                            const isCurrent = item.point === selectedPoint;
                            const hour = isClockwise ? item.hourRight : item.hourLeft;
                            return (
                                <TouchableOpacity
                                    key={`pill-${item.point}`}
                                    style={[
                                        styles.pointPill,
                                        isCurrent && styles.pointPillActive,
                                        item.point === 3 && styles.canonicalHighlight,
                                    ]}
                                    onPress={() => onSelectPoint?.(item.point)}
                                >
                                    <Text style={[styles.pointPillText, isCurrent && styles.pointPillTextActive]}>
                                        Ef. {item.label}
                                    </Text>
                                    <Text style={styles.pointPillHour}>{hour}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Active Description */}
                    <View style={styles.descriptionBox}>
                        <View style={styles.descHeader}>
                            <View style={[styles.dot, { backgroundColor: activePointData.color }]} />
                            <Text style={styles.descTitle}>
                                Efecto {activePointData.point} ({isClockwise ? activePointData.hourRight : activePointData.hourLeft})
                                {activePointData.point === 3 ? ' ★ CANÓNICO' : ''}
                            </Text>
                        </View>
                        <Text style={styles.descText}>{activePointData.desc}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

export const ClockEffectDial = memo(ClockEffectDialBase);

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0f172a',
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: '#1e293b',
        padding: 12,
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    systemBadge: {
        color: '#38bdf8',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    systemTitle: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '800',
    },
    directionButton: {
        backgroundColor: '#1e293b',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#334155',
    },
    directionButtonText: {
        color: '#38bdf8',
        fontSize: 11,
        fontWeight: '700',
    },
    systemTabsRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    systemTab: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    systemTabActive: {
        backgroundColor: '#0284c7',
        borderColor: '#38bdf8',
    },
    systemTabText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '600',
    },
    systemTabTextActive: {
        color: '#ffffff',
        fontWeight: '800',
    },
    bodyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    svgWrap: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    pointTouchTarget: {
        position: 'absolute',
        width: 26,
        height: 26,
        borderRadius: 13,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
    detailsWrap: {
        flex: 1,
        gap: 8,
    },
    pointPillsRow: {
        flexDirection: 'row',
        gap: 5,
        flexWrap: 'wrap',
    },
    pointPill: {
        backgroundColor: '#1e293b',
        borderRadius: theme.radius.sm,
        paddingVertical: 4,
        paddingHorizontal: 7,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
    },
    pointPillActive: {
        backgroundColor: '#0369a1',
        borderColor: '#38bdf8',
    },
    canonicalHighlight: {
        borderColor: '#ef4444',
    },
    pointPillText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
    },
    pointPillTextActive: {
        color: '#ffffff',
    },
    pointPillHour: {
        color: '#64748b',
        fontSize: 9,
        fontWeight: '600',
    },
    descriptionBox: {
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: theme.radius.md,
        padding: 8,
        borderWidth: 1,
        borderColor: '#334155',
        gap: 3,
    },
    descHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    descTitle: {
        color: '#f8fafc',
        fontSize: 11,
        fontWeight: '800',
    },
    descText: {
        color: '#94a3b8',
        fontSize: 11,
        lineHeight: 15,
        fontWeight: '500',
    },
});
