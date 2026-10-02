import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Line } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { SpinEffect } from '@bandaro/core';
import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';

interface SpinControlEnhancedProps {
    spin: SpinEffect;
    onSpinChange: (spin: SpinEffect) => void;
    disabled?: boolean;
    showPresets?: boolean;
    showImpactBar?: boolean;
    size?: number;
}

function SpinControlEnhancedBase(props: Readonly<SpinControlEnhancedProps>) {
    const { 
        spin, 
        onSpinChange, 
        disabled = false,
        showPresets = true,
        showImpactBar = true,
        size = 180,
    } = props;
    const { language } = useI18n();
    const palette = getPalette(useColorScheme());

    const ballRadius = size / 2;
    const indicatorRadius = 12;

    const handleSpinGesture = useCallback(() => {
        return Gesture.Pan()
            .onUpdate((event) => {
                if (disabled) return;

                const x = (event.x - ballRadius) / ballRadius;
                const y = (event.y - ballRadius) / ballRadius;

                const magnitude = Math.sqrt(x * x + y * y);
                let clampedX = x;
                let clampedY = y;

                if (magnitude > 1) {
                    clampedX = x / magnitude;
                    clampedY = y / magnitude;
                }

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

    const handlePreset = useCallback((presetX: number, presetY: number) => {
        const magnitude = Math.sqrt(presetX * presetX + presetY * presetY);
        onSpinChange({
            x: presetX,
            y: presetY,
            magnitude: Math.min(1, magnitude),
        });
    }, [onSpinChange]);

    const indicatorX = ballRadius + spin.x * (ballRadius - indicatorRadius - 5);
    const indicatorY = ballRadius - spin.y * (ballRadius - indicatorRadius - 5);

    const getImpactLevel = (): { label: string; color: string; percentage: number } => {
        const percentage = spin.magnitude * 100;
        
        if (spin.magnitude < 0.1) {
            return { label: 'Neutral', color: palette.primary, percentage: 0 };
        } else if (spin.magnitude < 0.4) {
            return { label: language === 'en' ? 'Low' : 'Bajo', color: palette.primary, percentage };
        } else if (spin.magnitude < 0.75) {
            return { label: language === 'en' ? 'Medium' : 'Medio', color: palette.primary, percentage };
        } else {
            return { label: language === 'en' ? 'Extreme' : 'Extremo', color: '#ef4444', percentage };
        }
    };

    const impact = getImpactLevel();
    const mmX = (spin.x * 28.5).toFixed(1);
    const mmY = (spin.y * 28.5).toFixed(1);

    return (
        <View style={styles.container}>
            <View style={styles.mainSection}>
                <GestureDetector gesture={handleSpinGesture()}>
                    <View style={[styles.ballContainer, { width: size, height: size }]}>
                        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                            <Defs>
                                <RadialGradient id="spinBallGradientEnhanced" cx="35%" cy="35%" r="65%">
                                    <Stop offset="0%" stopColor="#ffffff" />
                                    <Stop offset="70%" stopColor="#e8e8e8" />
                                    <Stop offset="100%" stopColor="#c8c8c8" />
                                </RadialGradient>
                            </Defs>
                            
                            {/* Main ball */}
                            <Circle
                                cx={ballRadius}
                                cy={ballRadius}
                                r={ballRadius - 2}
                                fill="url(#spinBallGradientEnhanced)"
                                stroke="#cbd5e1"
                                strokeWidth={1.5}
                            />
                            
                            {/* Crosshair lines with neon blue glow */}
                            <Line
                                x1={ballRadius}
                                y1={ballRadius - 40}
                                x2={ballRadius}
                                y2={ballRadius + 40}
                                stroke="rgba(59, 130, 246, 0.15)"
                                strokeWidth={3}
                            />
                            <Line
                                x1={ballRadius}
                                y1={ballRadius - 40}
                                x2={ballRadius}
                                y2={ballRadius + 40}
                                stroke="rgba(59, 130, 246, 0.6)"
                                strokeWidth={0.5}
                            />
                            <Line
                                x1={ballRadius - 40}
                                y1={ballRadius}
                                x2={ballRadius + 40}
                                y2={ballRadius}
                                stroke="rgba(59, 130, 246, 0.15)"
                                strokeWidth={3}
                            />
                            <Line
                                x1={ballRadius - 40}
                                y1={ballRadius}
                                x2={ballRadius + 40}
                                y2={ballRadius}
                                stroke="rgba(59, 130, 246, 0.6)"
                                strokeWidth={0.5}
                            />
                            
                            {/* Center dot */}
                            <Circle cx={ballRadius} cy={ballRadius} r={3} fill="rgba(0,0,0,0.3)" />
                            
                            {/* Contact point indicator with green glow */}
                            <Circle
                                cx={indicatorX}
                                cy={indicatorY}
                                r={indicatorRadius + 8}
                                fill="#10b981"
                                opacity={0.15}
                            />
                            <Circle
                                cx={indicatorX}
                                cy={indicatorY}
                                r={indicatorRadius + 5}
                                fill="#10b981"
                                opacity={0.25}
                            />
                            <Circle
                                cx={indicatorX}
                                cy={indicatorY}
                                r={indicatorRadius + 2}
                                fill="#10b981"
                                opacity={0.4}
                            />
                            <Circle
                                cx={indicatorX}
                                cy={indicatorY}
                                r={indicatorRadius}
                                fill="#10b981"
                                stroke="#ffffff"
                                strokeWidth={2.5}
                            />
                            <Circle 
                                cx={indicatorX - 3} 
                                cy={indicatorY - 3} 
                                r={3.5} 
                                fill="rgba(255,255,255,0.7)" 
                            />
                        </Svg>
                    </View>
                </GestureDetector>

                <View style={styles.infoGrid}>
                    <View style={[styles.infoCard, { backgroundColor: palette.card, borderLeftColor: palette.primary }]}>
                        <Text style={[styles.infoLabel, { color: palette.muted }]}>{language === 'en' ? 'X Axis' : 'Eje X'}</Text>
                        <View style={styles.infoValueRow}>
                            <Text style={[styles.infoValue, { color: palette.primary }]}>{mmX}</Text>
                            <Text style={[styles.infoUnit, { color: palette.muted }]}>mm</Text>
                        </View>
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: palette.card, borderLeftColor: palette.primary }]}>
                        <Text style={[styles.infoLabel, { color: palette.muted }]}>{language === 'en' ? 'Y Axis' : 'Eje Y'}</Text>
                        <View style={styles.infoValueRow}>
                            <Text style={[styles.infoValue, { color: palette.primary }]}>{mmY}</Text>
                            <Text style={[styles.infoUnit, { color: palette.muted }]}>mm</Text>
                        </View>
                    </View>

                    {showImpactBar && (
                        <View style={[styles.impactCard, { backgroundColor: palette.card }]}>
                            <View style={styles.impactHeader}>
                                <Text style={[styles.infoLabel, { color: palette.muted }]}>{language === 'en' ? 'Impact Level' : 'Nivel de Impacto'}</Text>
                                <Text style={[styles.impactValue, { color: impact.color }]}>{impact.label}</Text>
                            </View>
                            <View style={[styles.impactBarBg, { backgroundColor: `${palette.primary}20` }]}>
                                <View 
                                     style={[
                                         styles.impactBarFill, 
                                         { 
                                             width: `${impact.percentage}%`,
                                             backgroundColor: impact.color,
                                         }
                                     ]} 
                                />
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {showPresets && (
                <View style={styles.presetsSection}>
                    <Text style={[styles.presetsTitle, { color: palette.muted }]}>{language === 'en' ? 'Quick Presets' : 'Presets Rápidos'}</Text>
                    <View style={styles.presetsRow}>
                        <Pressable
                            style={[styles.presetButton, { backgroundColor: palette.card, borderColor: `${palette.primary}20` }]}
                            onPress={() => handlePreset(0, 0.7)}
                            disabled={disabled}>
                            <Text style={[styles.presetButtonText, { color: palette.text }]}>Follow</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.presetButton, { backgroundColor: palette.card, borderColor: `${palette.primary}20` }]}
                            onPress={() => handlePreset(0, -0.7)}
                            disabled={disabled}>
                            <Text style={[styles.presetButtonText, { color: palette.text }]}>Draw</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.presetButton, { backgroundColor: palette.card, borderColor: `${palette.primary}20` }]}
                            onPress={() => handlePreset(0.6, 0)}
                            disabled={disabled}>
                            <Text style={[styles.presetButtonText, { color: palette.text }]}>English R</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.presetButton, { backgroundColor: palette.card, borderColor: `${palette.primary}20` }]}
                            onPress={() => handlePreset(-0.6, 0)}
                            disabled={disabled}>
                            <Text style={[styles.presetButtonText, { color: palette.text }]}>English L</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.presetButton, styles.presetButtonActive, { backgroundColor: palette.primary }]}
                            onPress={handleReset}
                            disabled={disabled}>
                            <Text style={[styles.presetButtonText, { color: '#ffffff' }]}>Reset</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            <View style={[styles.tipCard, { backgroundColor: `${palette.primary}15`, borderColor: `${palette.primary}30` }]}>
                <Text style={[styles.tipTitle, { color: palette.primary }]}>💡 Coach Tip</Text>
                <Text style={[styles.tipText, { color: palette.text }]}>
                    {language === 'en'
                        ? 'Keep your cue level for consistent reactions on follow shots. Avoid unintentional curves by checking your bridge height.'
                        : 'Mantén el taco nivelado para reacciones consistentes en tiros de Follow. Evita curvas no intencionales verificando la altura de tu puente.'}
                </Text>
            </View>
        </View>
    );
}

export const SpinControlEnhanced = memo(SpinControlEnhancedBase);

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    mainSection: {
        gap: 16,
    },
    ballContainer: {
        alignSelf: 'center',
        borderRadius: 999,
        overflow: 'hidden',
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    infoCard: {
        flex: 1,
        minWidth: 100,
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    infoValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    infoValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    infoUnit: {
        fontSize: 12,
        fontWeight: '500',
    },
    impactCard: {
        width: '100%',
        padding: 12,
        borderRadius: 12,
    },
    impactHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    impactValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    impactBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    impactBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    presetsSection: {
        gap: 8,
    },
    presetsTitle: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    presetsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    presetButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    presetButtonActive: {
        borderColor: 'transparent',
    },
    presetButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    tipCard: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    tipTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tipText: {
        fontSize: 13,
        lineHeight: 18,
    },
});
