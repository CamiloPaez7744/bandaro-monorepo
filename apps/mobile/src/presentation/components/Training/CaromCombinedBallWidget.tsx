import { memo, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { BallId, SpinEffect } from '@bandaro/core';
import { TablePreferences } from './tablePreferences';

export interface CaromCombinedBallWidgetProps {
    cueBallId: BallId;
    spin: SpinEffect;
    onPress: () => void;
    tablePreferences?: TablePreferences;
    disabled?: boolean;
    compact?: boolean;
    categoryColor?: string;
    isDark?: boolean;
}

export const CaromCombinedBallWidget = memo(function CaromCombinedBallWidget({
    cueBallId,
    spin,
    onPress,
    tablePreferences,
    disabled = false,
    compact = true,
    categoryColor,
    isDark = true,
}: CaromCombinedBallWidgetProps) {
    const size = compact ? 44 : 52;
    const center = size / 2;
    const radius = compact ? 19 : 23;
    const maxTipOffset = radius * 0.76;

    // Tip coordinates on widget
    const tipX = center + spin.x * maxTipOffset;
    const tipY = center - spin.y * maxTipOffset;

    const isYellow = cueBallId === 'yellow';
    const uid = useMemo(() => `cbw_${Math.random().toString(36).slice(2, 7)}`, []);
    const activeColor = categoryColor || '#00d2ff';
    const showDots = tablePreferences?.showBallDots !== false;
    const isPba = tablePreferences?.ballSkin === 'cosmo_helix_pba';
    const dotColor = isPba ? (isYellow ? '#1e3a8a' : '#00e5ff') : '#dc2626';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { width: size + 4, height: size + 4 },
                categoryColor ? { borderColor: `${categoryColor}70`, shadowColor: categoryColor } : null,
                !isDark ? { backgroundColor: '#ffffff', borderColor: categoryColor ? `${categoryColor}60` : 'rgba(0,0,0,0.12)' } : null,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={isYellow ? "Bola Amarilla - Control de Efecto y Tome" : "Bola Blanca - Control de Efecto y Tome"}>
            <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Defs>
                        {isYellow ? (
                            <RadialGradient id={`${uid}_grad`} cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#fffbeb" />
                                <Stop offset="30%" stopColor="#fef08a" />
                                <Stop offset="70%" stopColor="#eab308" />
                                <Stop offset="100%" stopColor="#854d0e" />
                            </RadialGradient>
                        ) : (
                            <RadialGradient id={`${uid}_grad`} cx="35%" cy="30%" r="70%">
                                <Stop offset="0%" stopColor="#ffffff" />
                                <Stop offset="35%" stopColor="#f8fafc" />
                                <Stop offset="75%" stopColor="#cbd5e1" />
                                <Stop offset="100%" stopColor="#475569" />
                            </RadialGradient>
                        )}
                        <RadialGradient id={`${uid}_shadow`} cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor="#000000" stopOpacity={0.45} />
                            <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
                        </RadialGradient>
                    </Defs>

                    {/* Sombra proyectada */}
                    <Circle cx={center} cy={center + 1.8} r={radius * 0.95} fill={`url(#${uid}_shadow)`} />

                    {/* Cuerpo esférico 3D fotorrealista */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill={`url(#${uid}_grad)`}
                        stroke={isYellow ? 'rgba(234, 179, 8, 0.45)' : 'rgba(255, 255, 255, 0.45)'}
                        strokeWidth={1}
                    />

                    {/* Marcajes oficiales / Punto de polo cardinal (Aramith o PBA) */}
                    {showDots && (
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius * 0.16}
                            fill={dotColor}
                            opacity={0.88}
                        />
                    )}

                    {/* Destello especular de luz cenital */}
                    <Circle
                        cx={center - radius * 0.3}
                        cy={center - radius * 0.3}
                        r={radius * 0.22}
                        fill="#ffffff"
                        opacity={0.7}
                    />

                    {/* Punto de impacto de taco (Efecto / Spin) */}
                    <Circle
                        cx={tipX}
                        cy={tipY}
                        r={3.8}
                        fill={categoryColor ? `${categoryColor}40` : "rgba(0, 210, 255, 0.35)"}
                    />
                    <Circle
                        cx={tipX}
                        cy={tipY}
                        r={2.4}
                        fill={activeColor}
                        stroke="#ffffff"
                        strokeWidth={0.8}
                    />
                </Svg>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        borderRadius: 999,
        backgroundColor: '#090d16',
        borderWidth: 1.5,
        borderColor: 'rgba(56, 189, 248, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00d2ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 4,
    },
});
