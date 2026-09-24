import { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { BallId, SpinEffect } from '@bandaro/core';

interface CaromSpinBallWidgetProps {
    spin: SpinEffect;
    cueBallId: BallId;
    onPress: () => void;
    disabled?: boolean;
    compact?: boolean;
}

/**
 * Returns a human-friendly label for current spin:
 * e.g., "E0 • Centro", "E2 • 3h Der", "E1 • 12h Corrido", "E3 • 6h Pique"
 */
function getSpinShortLabel(spin: SpinEffect, compact = false): string {
    const mag = spin.magnitude;
    if (mag < 0.12) return compact ? 'E0 Centro' : 'E0 • Centro';

    const level = Math.min(4, Math.max(1, Math.round(mag / 0.23)));

    let angleDeg = (Math.atan2(spin.y, spin.x) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    let dir = '';
    if (angleDeg >= 337.5 || angleDeg < 22.5) dir = compact ? '3h' : '3h (Der)';
    else if (angleDeg >= 22.5 && angleDeg < 67.5) dir = '1:30';
    else if (angleDeg >= 67.5 && angleDeg < 112.5) dir = compact ? '12h' : '12h (Corr)';
    else if (angleDeg >= 112.5 && angleDeg < 157.5) dir = '10:30';
    else if (angleDeg >= 157.5 && angleDeg < 202.5) dir = compact ? '9h' : '9h (Izq)';
    else if (angleDeg >= 202.5 && angleDeg < 247.5) dir = '7:30';
    else if (angleDeg >= 247.5 && angleDeg < 292.5) dir = compact ? '6h' : '6h (Pique)';
    else dir = '4:30';

    return `E${level} ${compact ? '' : '• '}${dir}`;
}

export const CaromSpinBallWidget = memo(function CaromSpinBallWidget({
    spin,
    cueBallId,
    onPress,
    disabled = false,
    compact = false,
}: CaromSpinBallWidgetProps) {
    const size = compact ? 38 : 50;
    const center = size / 2;
    const radius = compact ? 16 : 21;
    const maxTipOffset = radius * 0.76;

    // Tip position on widget
    const tipX = center + spin.x * maxTipOffset;
    const tipY = center - spin.y * maxTipOffset;

    const isYellow = cueBallId === 'yellow';
    const gradientId = useMemo(() => `widgetBallGrad-${Math.random().toString(36).slice(2, 7)}`, []);
    const shortLabel = useMemo(() => getSpinShortLabel(spin, compact), [spin, compact]);

    return (
        <TouchableOpacity
            style={[styles.container, compact && styles.containerCompact]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Selector de Efecto Profesional">
            <View style={[styles.ballWrapper, compact && { width: 38, height: 38 }]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Defs>
                        {isYellow ? (
                            <RadialGradient id={gradientId} cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#fffbeb" />
                                <Stop offset="30%" stopColor="#fef08a" />
                                <Stop offset="70%" stopColor="#eab308" />
                                <Stop offset="100%" stopColor="#854d0e" />
                            </RadialGradient>
                        ) : (
                            <RadialGradient id={gradientId} cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#ffffff" />
                                <Stop offset="35%" stopColor="#f8fafc" />
                                <Stop offset="75%" stopColor="#cbd5e1" />
                                <Stop offset="100%" stopColor="#64748b" />
                            </RadialGradient>
                        )}
                    </Defs>

                    {/* Sombra de apoyo */}
                    <Circle cx={center} cy={center + 1.5} r={radius} fill="rgba(0,0,0,0.4)" />

                    {/* Esfera 3D de la bola */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill={`url(#${gradientId})`}
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth={1}
                    />

                    {/* Retícula fina en cruz azul neón */}
                    <Line
                        x1={center - radius + 2}
                        y1={center}
                        x2={center + radius - 2}
                        y2={center}
                        stroke="rgba(0, 210, 255, 0.45)"
                        strokeWidth={0.8}
                    />
                    <Line
                        x1={center}
                        y1={center - radius + 2}
                        x2={center}
                        y2={center + radius - 2}
                        stroke="rgba(0, 210, 255, 0.45)"
                        strokeWidth={0.8}
                    />

                    {/* Resplandor neón exterior del casquillo */}
                    <Circle
                        cx={tipX}
                        cy={tipY}
                        r={compact ? 4 : 5.5}
                        fill="rgba(0, 210, 255, 0.35)"
                    />

                    {/* Casquillo / Punto de impacto en azul neón brillante */}
                    <Circle
                        cx={tipX}
                        cy={tipY}
                        r={compact ? 2.5 : 3.5}
                        fill="#00d2ff"
                        stroke="#ffffff"
                        strokeWidth={1}
                    />
                </Svg>
            </View>

            <View style={[styles.textContainer, compact && styles.textContainerCompact]}>
                <View style={styles.labelRow}>
                    <Text style={[styles.labelTitle, compact && { fontSize: 7.5 }]}>EFECTO</Text>
                    <View style={styles.liveDot} />
                </View>
                <Text style={[styles.labelValue, compact && { fontSize: 9.5 }]} numberOfLines={1}>
                    {shortLabel}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 255, 0.35)',
        borderRadius: 22,
        paddingLeft: 4,
        paddingRight: 10,
        paddingVertical: 3,
        userSelect: 'none',
        shadowColor: '#00d2ff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    containerCompact: {
        paddingLeft: 2,
        paddingRight: 6,
        paddingVertical: 2,
        gap: 4,
        borderRadius: 18,
    },
    ballWrapper: {
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        justifyContent: 'center',
        gap: 1,
        minWidth: 70,
    },
    textContainerCompact: {
        minWidth: 50,
        gap: 0,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    labelTitle: {
        fontSize: 8,
        fontWeight: '800',
        color: '#00d2ff',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    liveDot: {
        width: 3.5,
        height: 3.5,
        borderRadius: 2,
        backgroundColor: '#00d2ff',
    },
    labelValue: {
        fontSize: 10,
        fontWeight: '800',
        color: '#f8fafc',
        fontVariant: ['tabular-nums'],
    },
});
