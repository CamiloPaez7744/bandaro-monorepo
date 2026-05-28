import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { SpinEffect, POWER_LEVELS, PowerLevel } from '@bandaro/core';
import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface SpinControlProps {
    spin: SpinEffect;
    onSpinChange: (spin: SpinEffect) => void;
    disabled?: boolean;
}

function SpinControlBase(props: Readonly<SpinControlProps>) {
    const { spin, onSpinChange, disabled = false } = props;
    const palette = getPalette(useColorScheme());

    const ballSize = 140;
    const ballRadius = ballSize / 2;

    const handleSpinGesture = useCallback(() => {
        return Gesture.Pan()
            .onUpdate((event) => {
                if (disabled) return;

                const x = (event.x - ballRadius) / ballRadius;
                const y = (event.y - ballRadius) / ballRadius;

                const clampedX = Math.max(-1, Math.min(1, x));
                const clampedY = Math.max(-1, Math.min(1, y));

                const magnitude = Math.sqrt(clampedX * clampedX + clampedY * clampedY);
                const normalizedMagnitude = Math.min(1, magnitude);

                onSpinChange({
                    x: clampedX,
                    y: clampedY,
                    magnitude: normalizedMagnitude,
                });
            })
            .onEnd(() => {
            });
    }, [disabled, ballRadius, onSpinChange]);

    const handleReset = useCallback(() => {
        onSpinChange({ x: 0, y: 0, magnitude: 0 });
    }, [onSpinChange]);

    const indicatorX = ballRadius + spin.x * (ballRadius - 15);
    const indicatorY = ballRadius + spin.y * (ballRadius - 15);

    const getSpinLabel = (): string => {
        if (spin.magnitude < 0.1) return 'Centro';

        const angle = Math.atan2(spin.y, spin.x) * (180 / Math.PI);

        if (angle >= -22.5 && angle < 22.5) return 'Derecha';
        if (angle >= 22.5 && angle < 67.5) return 'Abajo-Derecha';
        if (angle >= 67.5 && angle < 112.5) return 'Abajo';
        if (angle >= 112.5 && angle < 157.5) return 'Abajo-Izquierda';
        if (angle >= 157.5 || angle < -157.5) return 'Izquierda';
        if (angle >= -157.5 && angle < -112.5) return 'Arriba-Izquierda';
        if (angle >= -112.5 && angle < -67.5) return 'Arriba';
        if (angle >= -67.5 && angle < -22.5) return 'Arriba-Derecha';

        return 'Efecto';
    };

    return (
        <View style={styles.spinContainer}>
            <Text style={[styles.spinTitle, { color: palette.text }]}>Efecto</Text>

            <GestureDetector gesture={handleSpinGesture()}>
                <View style={[styles.spinBallContainer, { width: ballSize, height: ballSize }]}>
                    <Svg width={ballSize} height={ballSize} viewBox={`0 0 ${ballSize} ${ballSize}`}>
                        <Defs>
                            <RadialGradient id="spinBallGradient" cx="35%" cy="35%" r="65%">
                                <Stop offset="0%" stopColor="#ffffff" />
                                <Stop offset="70%" stopColor="#e8e8e8" />
                                <Stop offset="100%" stopColor="#c8c8c8" />
                            </RadialGradient>
                        </Defs>
                        <Circle
                            cx={ballRadius}
                            cy={ballRadius}
                            r={ballRadius - 2}
                            fill="url(#spinBallGradient)"
                            stroke="#cbd5e1"
                            strokeWidth={1}
                        />
                        <Circle cx={ballRadius} cy={ballRadius} r={2} fill="rgba(0,0,0,0.2)" />
                        <Circle
                            cx={indicatorX}
                            cy={indicatorY}
                            r={8}
                            fill="#ef4444"
                            stroke="#991b1b"
                            strokeWidth={1.5}
                        />
                        <Circle cx={indicatorX - 2} cy={indicatorY - 2} r={2.5} fill="rgba(255,255,255,0.8)" />
                    </Svg>
                </View>
            </GestureDetector>

            <Text style={[styles.spinLabel, { color: palette.text }]}>{getSpinLabel()}</Text>
            <Text style={[styles.spinMagnitude, { color: palette.muted }]}>
                Intensidad: {Math.round(spin.magnitude * 100)}%
            </Text>

            <Pressable
                style={[styles.resetButton, { backgroundColor: `${palette.primary}22` }]}
                onPress={handleReset}
                disabled={disabled}>
                <Text style={[styles.resetButtonText, { color: palette.primary }]}>Centrar</Text>
            </Pressable>
        </View>
    );
}

export const SpinControl = memo(SpinControlBase);

interface PowerControlProps {
    powerLevel: number;
    onPowerChange: (level: number) => void;
    disabled?: boolean;
}

function PowerControlBase(props: Readonly<PowerControlProps>) {
    const { powerLevel, onPowerChange, disabled = false } = props;
    const palette = getPalette(useColorScheme());

    const currentPower = POWER_LEVELS.find((p) => p.level === powerLevel) ?? POWER_LEVELS[2];

    return (
        <View style={styles.powerContainer}>
            <Text style={[styles.powerTitle, { color: palette.text }]}>Potencia</Text>

            <View style={styles.powerLevelsRow}>
                {POWER_LEVELS.map((level) => {
                    const isSelected = level.level === powerLevel;
                    return (
                        <Pressable
                            key={level.level}
                            style={[
                                styles.powerLevelButton,
                                {
                                    backgroundColor: isSelected ? palette.primary : `${palette.primary}15`,
                                    borderColor: isSelected ? palette.primary : `${palette.primary}30`,
                                },
                            ]}
                            onPress={() => onPowerChange(level.level)}
                            disabled={disabled}>
                            <Text
                                style={[
                                    styles.powerLevelNumber,
                                    { color: isSelected ? '#fff' : palette.primary },
                                ]}>
                                {level.level}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={[styles.powerInfoCard, { backgroundColor: `${palette.primary}10`, borderColor: `${palette.primary}20` }]}>
                <Text style={[styles.powerLabel, { color: palette.text }]}>{currentPower.label}</Text>
                <Text style={[styles.powerDescription, { color: palette.muted }]}>{currentPower.description}</Text>
            </View>
        </View>
    );
}

export const PowerControl = memo(PowerControlBase);

interface CueBallSelectorProps {
    cueBallId: 'white' | 'yellow';
    onCueBallChange: (ballId: 'white' | 'yellow') => void;
    disabled?: boolean;
}

function CueBallSelectorBase(props: Readonly<CueBallSelectorProps>) {
    const { cueBallId, onCueBallChange, disabled = false } = props;
    const palette = getPalette(useColorScheme());

    return (
        <View style={styles.cueBallContainer}>
            <Text style={[styles.cueBallTitle, { color: palette.text }]}>Bola de ataque</Text>

            <View style={styles.cueBallOptionsRow}>
                <Pressable
                    style={[
                        styles.cueBallOption,
                        {
                            backgroundColor: cueBallId === 'white' ? '#f8fafc' : `${palette.primary}15`,
                            borderColor: cueBallId === 'white' ? '#cbd5e1' : `${palette.primary}30`,
                        },
                    ]}
                    onPress={() => onCueBallChange('white')}
                    disabled={disabled}>
                    <Svg width={32} height={32} viewBox="0 0 32 32">
                        <Defs>
                            <RadialGradient id="cueWhite" cx="35%" cy="35%" r="65%">
                                <Stop offset="0%" stopColor="#ffffff" />
                                <Stop offset="70%" stopColor="#e8e8e8" />
                                <Stop offset="100%" stopColor="#c8c8c8" />
                            </RadialGradient>
                        </Defs>
                        <Circle cx={16} cy={16} r={14} fill="url(#cueWhite)" stroke="#cbd5e1" strokeWidth={1} />
                        <Circle cx={13} cy={13} r={4} fill="rgba(255,255,255,0.8)" />
                    </Svg>
                    <Text style={[styles.cueBallLabel, { color: cueBallId === 'white' ? '#1e293b' : palette.text }]}>
                        Blanca
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.cueBallOption,
                        {
                            backgroundColor: cueBallId === 'yellow' ? '#facc15' : `${palette.primary}15`,
                            borderColor: cueBallId === 'yellow' ? '#ca8a04' : `${palette.primary}30`,
                        },
                    ]}
                    onPress={() => onCueBallChange('yellow')}
                    disabled={disabled}>
                    <Svg width={32} height={32} viewBox="0 0 32 32">
                        <Defs>
                            <RadialGradient id="cueYellow" cx="35%" cy="35%" r="65%">
                                <Stop offset="0%" stopColor="#ffe066" />
                                <Stop offset="70%" stopColor="#facc15" />
                                <Stop offset="100%" stopColor="#ca8a04" />
                            </RadialGradient>
                        </Defs>
                        <Circle cx={16} cy={16} r={14} fill="url(#cueYellow)" stroke="#ca8a04" strokeWidth={1} />
                        <Circle cx={13} cy={13} r={4} fill="rgba(255,255,255,0.8)" />
                    </Svg>
                    <Text style={[styles.cueBallLabel, { color: cueBallId === 'yellow' ? '#713f12' : palette.text }]}>
                        Amarilla
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

export const CueBallSelector = memo(CueBallSelectorBase);

const styles = StyleSheet.create({
    spinContainer: {
        alignItems: 'center',
        gap: 8,
    },
    spinTitle: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    spinBallContainer: {
        borderRadius: 70,
        overflow: 'hidden',
    },
    spinLabel: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    spinMagnitude: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    resetButton: {
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    resetButtonText: {
        fontSize: 12,
        fontWeight: '800',
    },
    powerContainer: {
        gap: 10,
    },
    powerTitle: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    powerLevelsRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
    },
    powerLevelButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    powerLevelNumber: {
        fontSize: 16,
        fontWeight: '900',
    },
    powerInfoCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        gap: 4,
    },
    powerLabel: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    powerDescription: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    cueBallContainer: {
        gap: 10,
    },
    cueBallTitle: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    cueBallOptionsRow: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    cueBallOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    cueBallLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
});

export { SpinControlEnhanced } from './SpinControlEnhanced';
