import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

import { BallId, SpinEffect } from '@bandaro/core';

interface EffectBallSelectorProps {
    spin: SpinEffect;
    onSpinChange: (spin: SpinEffect) => void;
    disabled?: boolean;
    size?: number;
    style?: StyleProp<ViewStyle>;
    showGuideToggle?: boolean;
    initialGuidesVisible?: boolean;
    cueBallId?: BallId;
    onGuidesChange?: (visible: boolean) => void;
}

const BASE_SIZE = 340;
const BASE_RADIUS = 148;
const BASE_DOT_RADIUS = 10;
const MAX_DRAG_RATIO = 0.78;

function EffectBallSelectorBase(props: Readonly<EffectBallSelectorProps>) {
    const {
        spin,
        onSpinChange,
        disabled = false,
        size = BASE_SIZE,
        style,
        showGuideToggle = true,
        initialGuidesVisible = true,
        cueBallId = 'white',
        onGuidesChange,
    } = props;

    const [guidesVisible, setGuidesVisible] = useState(initialGuidesVisible);

    const ballCenter = size / 2;
    const sphereRadius = (BASE_RADIUS / BASE_SIZE) * size;
    const dotRadius = (BASE_DOT_RADIUS / BASE_SIZE) * size;
    const maxDrag = sphereRadius * MAX_DRAG_RATIO;
    const clipId = useMemo(() => `effectBallClip-${Math.random().toString(36).slice(2, 9)}`, []);
    const gradId = useMemo(() => `effGrad-${Math.random().toString(36).slice(2, 9)}`, []);
    const shineId = useMemo(() => `effShine-${Math.random().toString(36).slice(2, 9)}`, []);

    useEffect(() => {
        onGuidesChange?.(guidesVisible);
    }, [guidesVisible, onGuidesChange]);

    const applySpinAt = useCallback(
        (x: number, y: number) => {
            if (disabled) {
                return;
            }

            const dx = x - ballCenter;
            const dy = y - ballCenter;
            const distance = Math.hypot(dx, dy);
            const clampedDistance = Math.min(distance, maxDrag);
            const angle = Math.atan2(dy, dx);

            const clampedX = ballCenter + Math.cos(angle) * clampedDistance;
            const clampedY = ballCenter + Math.sin(angle) * clampedDistance;

            onSpinChange({
                x: (clampedX - ballCenter) / maxDrag,
                y: (ballCenter - clampedY) / maxDrag,
                magnitude: Math.min(1, clampedDistance / maxDrag),
            });
        },
        [ballCenter, disabled, maxDrag, onSpinChange]
    );

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !disabled,
                onMoveShouldSetPanResponder: () => !disabled,
                onPanResponderGrant: (event: GestureResponderEvent) => {
                    applySpinAt(event.nativeEvent.locationX, event.nativeEvent.locationY);
                },
                onPanResponderMove: (event: GestureResponderEvent) => {
                    applySpinAt(event.nativeEvent.locationX, event.nativeEvent.locationY);
                },
            }),
        [applySpinAt, disabled]
    );

    const indicatorX = ballCenter + spin.x * maxDrag;
    const indicatorY = ballCenter - spin.y * maxDrag;

    return (
        <View style={[styles.container, style]}>
            <View style={styles.canvasWrap}>
                <View style={styles.outerHalo} />
                <View style={[styles.canvasShell, { width: size, height: size }]}>
                    <View style={[styles.canvasHitArea, { width: size, height: size }]} {...panResponder.panHandlers}>
                        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                            <Defs>
                                <ClipPath id={clipId}>
                                    <Circle cx={ballCenter} cy={ballCenter} r={sphereRadius} />
                                </ClipPath>
                                <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                                    {cueBallId === 'yellow' ? [
                                        <Stop key="y0" offset="0%" stopColor="#fffbeb" />,
                                        <Stop key="y1" offset="30%" stopColor="#fef08a" />,
                                        <Stop key="y2" offset="70%" stopColor="#eab308" />,
                                        <Stop key="y3" offset="100%" stopColor="#854d0e" />,
                                    ] : [
                                        <Stop key="w0" offset="0%" stopColor="#ffffff" />,
                                        <Stop key="w1" offset="60%" stopColor="#f0ede0" />,
                                        <Stop key="w2" offset="100%" stopColor="#c8c4b2" />,
                                    ]}
                                </LinearGradient>
                                <RadialGradient id={shineId} cx="50%" cy="48%" r="68%">
                                    <Stop offset="0%" stopColor="rgba(255,255,255,0.50)" />
                                    <Stop offset="45%" stopColor="rgba(255,255,255,0.05)" />
                                    <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
                                </RadialGradient>
                            </Defs>

                            <G clipPath={`url(#${clipId})`}>
                                <Circle cx={ballCenter} cy={ballCenter} r={sphereRadius} fill={`url(#${gradId})`} />
                                <Circle cx={ballCenter} cy={ballCenter} r={sphereRadius} fill={`url(#${shineId})`} opacity={0.55} />
                                <Circle
                                    cx={ballCenter}
                                    cy={ballCenter}
                                    r={sphereRadius}
                                    fill="none"
                                    stroke="rgba(170,166,154,0.50)"
                                    strokeWidth={1}
                                />

                                {guidesVisible && (
                                    <>
                                        {/* Círculos Concéntricos de Casquillos (E1, E2, E3) en azul sutil */}
                                        {[0.25, 0.5, 0.75].map((ratio, idx) => (
                                            <Circle
                                                key={`guide-ring-${idx}`}
                                                cx={ballCenter}
                                                cy={ballCenter}
                                                r={maxDrag * ratio}
                                                fill="none"
                                                stroke="rgba(0, 210, 255, 0.30)"
                                                strokeWidth={1}
                                            />
                                        ))}

                                        {/* Zona Segura Punteada (E4 / Límite Máximo Reglamentario UMB) */}
                                        <Circle
                                            cx={ballCenter}
                                            cy={ballCenter}
                                            r={maxDrag}
                                            fill="none"
                                            stroke="#00d2ff"
                                            strokeWidth={1.3}
                                            strokeDasharray="4 3"
                                        />

                                        {/* Zona de Pifia Punteada (Límite Crítico de Deslizamiento del Taco) */}
                                        <Circle
                                            cx={ballCenter}
                                            cy={ballCenter}
                                            r={sphereRadius * 0.82}
                                            fill="none"
                                            stroke="#ef4444"
                                            strokeWidth={1.3}
                                            strokeDasharray="3 3"
                                        />
                                    </>
                                )}
                            </G>

                            {/* EJE X (Horizontal / Lateral) */}
                            <Line
                                x1={ballCenter - sphereRadius * 1.04}
                                y1={ballCenter}
                                x2={ballCenter + sphereRadius * 1.04}
                                y2={ballCenter}
                                stroke="rgba(0,210,255,0.98)"
                                strokeWidth={2}
                                strokeLinecap="round"
                            />

                            {/* EJE Y (Vertical / Corrido y Pique) */}
                            <Line
                                x1={ballCenter}
                                y1={ballCenter - sphereRadius * 1.04}
                                x2={ballCenter}
                                y2={ballCenter + sphereRadius * 1.04}
                                stroke="rgba(0,210,255,0.98)"
                                strokeWidth={2}
                                strokeLinecap="round"
                            />

                            <Circle cx={indicatorX} cy={indicatorY} r={dotRadius * 2.8} fill="rgba(0,230,110,0.40)" opacity={0.15} />
                            <Circle cx={indicatorX} cy={indicatorY} r={dotRadius * 1.8} fill="rgba(0,230,110,0.40)" opacity={0.25} />
                            <Circle cx={indicatorX} cy={indicatorY} r={dotRadius} fill="#00cc6e" stroke="#ffffff" strokeWidth={2.5} />
                            <Circle cx={indicatorX - 3} cy={indicatorY - 3} r={dotRadius * 0.35} fill="rgba(255,255,255,0.70)" />
                        </Svg>
                    </View>
                </View>
            </View>

            {showGuideToggle ? (
                <Pressable
                    onPress={() => setGuidesVisible((current) => !current)}
                    style={({ pressed }) => [
                        styles.guideButton,
                        guidesVisible && styles.guideButtonActive,
                        pressed && styles.guideButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Alternar guías"
                    accessibilityState={{ selected: guidesVisible }}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Circle cx={12} cy={12} r={3} />
                        <Line x1={3} y1={12} x2={6} y2={12} />
                        <Line x1={18} y1={12} x2={21} y2={12} />
                        <Line x1={12} y1={3} x2={12} y2={6} />
                        <Line x1={12} y1={18} x2={12} y2={21} />
                    </Svg>
                    <Text style={[styles.guideButtonText, guidesVisible && styles.guideButtonTextActive]}>Guías</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export const EffectBallSelector = memo(EffectBallSelectorBase);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: 16,
    },
    canvasWrap: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: BASE_SIZE,
        height: BASE_SIZE,
    },
    outerHalo: {
        position: 'absolute',
        left: -20,
        top: -20,
        right: -20,
        bottom: -20,
        borderRadius: BASE_SIZE,
        backgroundColor: 'rgba(36,38,46,0.85)',
    },
    canvasShell: {
        position: 'relative',
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: '#0e0f11',
    },
    canvasHitArea: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 5,
        fontSize: 11,
        letterSpacing: 0.06,
        color: 'rgba(180,178,170,0.75)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
    },
    guideButtonActive: {
        color: '#00d2ff',
        backgroundColor: 'rgba(0,210,255,0.08)',
        borderColor: 'rgba(0,210,255,0.35)',
    },
    guideButtonPressed: {
        opacity: 0.9,
    },
    guideButtonText: {
        fontSize: 11,
        color: 'rgba(180,178,170,0.75)',
        letterSpacing: 0.06,
    },
    guideButtonTextActive: {
        color: '#00d2ff',
    },
});
