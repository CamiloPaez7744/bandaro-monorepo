import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    PanResponder,
    Animated,
    type GestureResponderEvent,
} from 'react-native';
import { IconBolt, IconFlame } from '@/src/presentation/components/icons';

interface CaromPowerMeterProps {
    powerLevel: number; // 0..100
    onPowerChange: (power: number) => void;
    onShoot: (finalPower: number) => void;
    disabled?: boolean;
}

/**
 * Medidor vertical de potencia estilo 8 Ball Pool:
 * - Taco estilizado con muelle elástico.
 * - Deslizamiento suave hacia abajo para acumular fuerza.
 * - Gradiente cromático vivo: Esmeralda -> Oro -> Naranja -> Fuego.
 * - Al soltar el dedo/ratón, dispara automáticamente.
 */
export const CaromPowerMeter = React.memo(function CaromPowerMeter({
    powerLevel,
    onPowerChange,
    onShoot,
    disabled = false,
}: CaromPowerMeterProps) {
    const [isDragging, setIsDragging] = useState(false);
    const containerHeightRef = useRef<number>(260);
    const powerLevelRef = useRef(powerLevel);
    powerLevelRef.current = powerLevel;

    const onShootRef = useRef(onShoot);
    onShootRef.current = onShoot;

    const onPowerChangeRef = useRef(onPowerChange);
    onPowerChangeRef.current = onPowerChange;

    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !disabledRef.current,
            onMoveShouldSetPanResponder: () => !disabledRef.current,
            onPanResponderGrant: (evt: GestureResponderEvent) => {
                if (disabledRef.current) return;
                setIsDragging(true);
                const { locationY } = evt.nativeEvent;
                const h = containerHeightRef.current;
                const pct = Math.min(100, Math.max(0, Math.round((locationY / h) * 100)));
                onPowerChangeRef.current(pct);
            },
            onPanResponderMove: (evt: GestureResponderEvent) => {
                if (disabledRef.current) return;
                const { locationY } = evt.nativeEvent;
                const h = containerHeightRef.current;
                const pct = Math.min(100, Math.max(0, Math.round((locationY / h) * 100)));
                onPowerChangeRef.current(pct);
            },
            onPanResponderRelease: () => {
                setIsDragging(false);
                const finalPower = powerLevelRef.current;
                if (finalPower > 5) {
                    onShootRef.current(finalPower);
                }
                onPowerChangeRef.current(0);
            },
            onPanResponderTerminate: () => {
                setIsDragging(false);
                onPowerChangeRef.current(0);
            },
        })
    ).current;

    // Convert power (0..100) to rail speed indicator (1..5)
    const railSpeed = Math.min(5, Math.max(1, Math.round((powerLevel / 100) * 4) + 1));

    // Dynamic color based on power
    const getFillColor = (pct: number) => {
        if (pct < 35) return '#10b981'; // Esmeralda
        if (pct < 65) return '#f59e0b'; // Ámbar / Oro
        if (pct < 85) return '#f97316'; // Naranja
        return '#ef4444'; // Carmesí fuego
    };

    const fillColor = getFillColor(powerLevel);

    return (
        <View style={styles.outerContainer}>
            {/* Header / Badge superior de fuerza */}
            <View style={[styles.speedBadge, { borderColor: `${fillColor}55` }]}>
                {powerLevel >= 80 ? (
                    <IconFlame size={12} color={fillColor} />
                ) : (
                    <IconBolt size={12} color={fillColor} />
                )}
                <Text style={[styles.speedText, { color: fillColor }]}>{powerLevel}%</Text>
            </View>

            {/* Ranura del medidor vertical */}
            <View
                style={[
                    styles.meterTrack,
                    isDragging && { borderColor: fillColor, shadowColor: fillColor },
                ]}
                onLayout={(e) => {
                    containerHeightRef.current = e.nativeEvent.layout.height;
                }}
                {...panResponder.panHandlers}>
                {/* Relleno cromático de energía */}
                <View
                    style={[
                        styles.meterFill,
                        {
                            height: `${powerLevel}%`,
                            backgroundColor: fillColor,
                            shadowColor: fillColor,
                        },
                    ]}
                />

                {/* Líneas de graduación / Marcas de velocidad de 1 a 5 bandas */}
                <View style={styles.ticksContainer} pointerEvents="none">
                    {[20, 40, 60, 80].map((mark) => (
                        <View key={mark} style={[styles.tickLine, { top: `${mark}%` }]} />
                    ))}
                </View>

                {/* Tirador / Taco visual deslizable */}
                <View
                    style={[
                        styles.cueHandle,
                        {
                            top: `${Math.min(92, Math.max(2, powerLevel))}%`,
                            borderColor: fillColor,
                        },
                    ]}
                    pointerEvents="none">
                    <View style={[styles.cueTipPuff, { backgroundColor: fillColor }]} />
                    <View style={styles.cueHandleGrip} />
                </View>
            </View>

            {/* Indicador inferior de velocidad de banda */}
            <View style={styles.footerInfo}>
                <Text style={styles.footerLabel}>VEL</Text>
                <Text style={[styles.footerValue, { color: fillColor }]}>{railSpeed}</Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    outerContainer: {
        width: 44,
        alignItems: 'center',
        gap: 6,
        userSelect: 'none',
    },
    speedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    speedText: {
        fontSize: 10,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    meterTrack: {
        width: 32,
        height: 250,
        backgroundColor: 'rgba(15, 23, 42, 0.80)',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'ns-resize' as any,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 6,
    },
    meterFill: {
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.85,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    ticksContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    tickLine: {
        position: 'absolute',
        left: 4,
        right: 4,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    cueHandle: {
        position: 'absolute',
        left: 3,
        right: 3,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#1e293b',
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
        elevation: 4,
    },
    cueTipPuff: {
        width: 10,
        height: 4,
        borderRadius: 2,
        marginBottom: 1,
    },
    cueHandleGrip: {
        width: 14,
        height: 2,
        borderRadius: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    footerInfo: {
        alignItems: 'center',
    },
    footerLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 0.5,
    },
    footerValue: {
        fontSize: 12,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
});
