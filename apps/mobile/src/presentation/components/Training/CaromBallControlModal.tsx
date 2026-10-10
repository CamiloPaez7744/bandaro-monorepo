import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    GestureResponderEvent,
} from 'react-native';

const TouchableOpacity = ({
    style,
    activeOpacity = 0.7,
    children,
    disabled,
    ...props
}: any) => (
    <Pressable
        {...props}
        disabled={disabled}
        style={({ pressed }) => [
            typeof style === 'function' ? style({ pressed }) : style,
            pressed && !disabled && { opacity: activeOpacity },
        ]}
    >
        {children}
    </Pressable>
);
import { useColorScheme } from '@/components/useColorScheme';
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    Path,
    RadialGradient,
    Stop,
    Text as SvgText,
} from 'react-native-svg';
import {
    Ball,
    BallId,
    SpinEffect,
    spinToClock,
    TrajectoryPrediction,
    Vec2,
    vec2,
    vec2Length,
    vec2Normalize,
    vec2Sub,
} from '@bandaro/core';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';
import {
    IconArrowLeft,
    IconArrowRight,
    IconCheck,
    IconRotateClockwise,
    IconX,
} from '@/src/presentation/components/icons';
import {
    TablePreferences,
    useTablePreferences,
} from './tablePreferences';
import {
    calculateTomeDeBola,
    COLLISION_DIAMETER_CM,
} from './CaromTomeDeBolaEclipse';

export interface CaromBallControlModalProps {
    visible: boolean;
    cueBallId: BallId;
    onCueBallChange?: (id: BallId) => void;
    spin: SpinEffect;
    onSpinChange: (spin: SpinEffect) => void;
    balls: Ball[];
    aimDirection: Vec2;
    onAimChange?: (newAim: Vec2) => void;
    trajectory: TrajectoryPrediction | null;
    tablePreferences?: TablePreferences;
    categoryColor?: string;
    onClose: () => void;
}

const REAL_BALL_DIAMETER_MM = 61.5;
const REAL_BALL_RADIUS_MM = REAL_BALL_DIAMETER_MM / 2; // 30.75 mm
const MAX_SAFE_RADIUS_RATIO = 0.76;

export const CaromBallControlModal = memo(function CaromBallControlModal({
    visible,
    cueBallId,
    onCueBallChange,
    spin,
    onSpinChange,
    balls,
    aimDirection,
    onAimChange,
    trajectory,
    tablePreferences: propsTablePreferences,
    categoryColor,
    onClose,
}: CaromBallControlModalProps) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isLandscape = windowWidth > windowHeight;
    const isMobile = windowWidth < 768;
    const { t, language } = useI18n();
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const isDark = colorScheme === 'dark';
    const activeColor = categoryColor || '#00d2ff';
    const activeGlow = categoryColor ? `${categoryColor}40` : 'rgba(0, 210, 255, 0.35)';

    const { preferences: prefs } = useTablePreferences(propsTablePreferences);
    const modalUid = useMemo(() => `cbc_${Math.random().toString(36).slice(2, 8)}`, []);
    const isYellow = cueBallId === 'yellow';

    // SPHERE DIMENSIONS (EFFECT)
    const sphereSize = isLandscape ? Math.min(130, Math.floor(windowHeight * 0.35)) : Math.min(210, windowWidth - 60);
    const sphereCenter = sphereSize / 2;
    const sphereRadius = sphereSize * 0.38;
    const maxDragRadius = sphereRadius * MAX_SAFE_RADIUS_RATIO;

    const centerRef = useRef(sphereCenter);
    centerRef.current = sphereCenter;
    const maxDragRadiusRef = useRef(maxDragRadius);
    maxDragRadiusRef.current = maxDragRadius;
    const sphereRadiusRef = useRef(sphereRadius);
    sphereRadiusRef.current = sphereRadius;
    const onSpinChangeRef = useRef(onSpinChange);
    onSpinChangeRef.current = onSpinChange;

    const tipX = sphereCenter + spin.x * maxDragRadius;
    const tipY = sphereCenter - spin.y * maxDragRadius;

    // PanResponder for interactive spin dragging
    const updateSpinFromCoords = useCallback((svgX: number, svgY: number) => {
        const curCenter = centerRef.current;
        const curMaxDrag = maxDragRadiusRef.current;
        const curSphereRadius = sphereRadiusRef.current;
        const dx = svgX - curCenter;
        const dy = svgY - curCenter;
        const dist = Math.hypot(dx, dy);

        const clampedDist = Math.min(dist, curSphereRadius * 0.88);
        const angle = Math.atan2(dy, dx);

        const normX = clampedDist === 0 ? 0 : (Math.cos(angle) * clampedDist) / curMaxDrag;
        const normY = clampedDist === 0 ? 0 : -(Math.sin(angle) * clampedDist) / curMaxDrag;
        const magnitude = Math.min(1.15, clampedDist / curMaxDrag);

        onSpinChangeRef.current({
            x: Math.max(-1.15, Math.min(1.15, Number(normX.toFixed(3)))),
            y: Math.max(-1.15, Math.min(1.15, Number(normY.toFixed(3)))),
            magnitude: Math.min(1, magnitude),
        });
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt: GestureResponderEvent) => {
                updateSpinFromCoords(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            },
            onPanResponderMove: (evt: GestureResponderEvent) => {
                updateSpinFromCoords(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            },
        })
    ).current;

    const handleWebPointer = useCallback(
        (e: any) => {
            const rect = e.currentTarget?.getBoundingClientRect?.();
            if (rect) {
                updateSpinFromCoords(e.clientX - rect.left, e.clientY - rect.top);
            }
        },
        [updateSpinFromCoords]
    );

    const gestureHandlers = Platform.OS === 'web' ? {
        onPointerDown: (e: any) => {
            e.currentTarget?.setPointerCapture?.(e.pointerId);
            handleWebPointer(e);
        },
        onPointerMove: (e: any) => {
            if (e.buttons === 1) handleWebPointer(e);
        },
        onPointerUp: (e: any) => {
            try { e.currentTarget?.releasePointerCapture?.(e.pointerId); } catch {}
        },
    } : panResponder.panHandlers;

    const setSpinPreset = useCallback((x: number, y: number) => {
        const mag = Math.hypot(x, y);
        onSpinChange({
            x,
            y,
            magnitude: Math.min(1, mag),
        });
    }, [onSpinChange]);

    // TOME DE BOLA (ECLIPSE)
    const tome = useMemo(
        () => calculateTomeDeBola(balls, cueBallId, aimDirection, trajectory, language),
        [balls, cueBallId, aimDirection, trajectory, language]
    );

    const eclipseSize = sphereSize;
    const eclipseCenter = eclipseSize / 2;
    const eclipseSphereRadius = sphereRadius;

    const cueBall = balls.find((b) => b.id === cueBallId);
    const targetBall = tome?.targetBall;

    const overlapFrac = tome ? tome.fraction : 0;
    const maxOffset = eclipseSphereRadius * 1.95;
    const eclipseOffset = (1 - overlapFrac) * maxOffset;

    let cueBallX = eclipseCenter;
    if (tome?.side === 'right') {
        cueBallX = eclipseCenter + eclipseOffset;
    } else if (tome?.side === 'left') {
        cueBallX = eclipseCenter - eclipseOffset;
    } else if (tome?.side === 'miss') {
        cueBallX = eclipseCenter + eclipseSphereRadius * 1.6;
    }

    const snapToFraction = useCallback(
        (desiredFrac: number) => {
            if (!cueBall || !targetBall || !onAimChange) return;

            const toTarget = vec2Sub(targetBall.pos, cueBall.pos);
            const dist = vec2Length(toTarget);
            if (dist === 0) return;

            const h = (1 - desiredFrac) * COLLISION_DIAMETER_CM;
            const angleOffset = Math.asin(Math.max(-1, Math.min(1, h / dist)));

            const baseAngle = Math.atan2(toTarget.y, toTarget.x);
            const sign = tome?.side === 'left' ? -1 : 1;
            const newAngle = baseAngle + sign * angleOffset;

            onAimChange(vec2(Math.cos(newAngle), Math.sin(newAngle)));
        },
        [cueBall, targetBall, onAimChange, tome?.side]
    );

    const nudgeAim = useCallback((deltaDeg: number) => {
        if (!onAimChange) return;
        const curAngle = Math.atan2(aimDirection.y, aimDirection.x);
        const rad = (deltaDeg * Math.PI) / 180;
        const newAngle = curAngle + rad;
        onAimChange(vec2(Math.cos(newAngle), Math.sin(newAngle)));
    }, [aimDirection, onAimChange]);

    const effectLevel = useMemo(() => {
        if (spin.magnitude < 0.12) return 0;
        return Math.min(4, Math.max(1, Math.round(spin.magnitude / 0.23)));
    }, [spin.magnitude]);

    const clockInfo = useMemo(() => {
        if (spin.magnitude < 0.05) return null;
        const clock = spinToClock(spin);
        const wholeH = Math.floor(clock.hour);
        const frac = clock.hour - wholeH;
        let mins = '00';
        let displayH = wholeH;
        if (frac >= 0.25 && frac <= 0.75) {
            mins = '30';
        } else if (frac > 0.75) {
            displayH = wholeH + 1;
        }
        if (displayH === 0) displayH = 12;
        return `${displayH}:${mins} • ${clock.tips.toFixed(1)}T`;
    }, [spin]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={[
                    styles.modalCard,
                    isLandscape ? styles.modalCardLandscape : styles.modalCardPortrait,
                    {
                        backgroundColor: isDark ? '#0a0f1d' : palette.card,
                        borderColor: isDark ? `${activeColor}55` : palette.border,
                    },
                ]}>
                    {/* HEADER */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerLeftCol}>
                            <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                {language === 'en' ? 'BALL CONTROL' : 'CONTROL DE BOLA'}
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {language === 'en' ? 'Spin (Effect) & Fullness (Tome)' : 'Efecto (Spin) y Tome de Bola'}
                            </Text>
                        </View>

                        {/* SELECTOR DE BOLA BLANCA / AMARILLA */}
                        {onCueBallChange && (
                            <View style={[
                                styles.cueBallSelectorPill,
                                !isDark && { backgroundColor: '#f1f5f9', borderColor: palette.border },
                            ]}>
                                <TouchableOpacity
                                    style={[
                                        styles.ballOptionBtn,
                                        !isYellow && styles.ballOptionBtnActive,
                                    ]}
                                    onPress={() => onCueBallChange('white')}>
                                    <View style={styles.whiteBallMiniIcon} />
                                    <Text style={[styles.ballOptionText, !isYellow && styles.ballOptionTextActive]}>
                                        {language === 'en' ? 'White' : 'Blanca'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.ballOptionBtn,
                                        isYellow && styles.ballOptionBtnActive,
                                    ]}
                                    onPress={() => onCueBallChange('yellow')}>
                                    <View style={styles.yellowBallMiniIcon} />
                                    <Text style={[styles.ballOptionText, isYellow && styles.ballOptionTextActive]}>
                                        {language === 'en' ? 'Yellow' : 'Amarilla'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel={t('common.close')}>
                            <IconX size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* BODY CON AMBOS CONTROLES SIMULTÁNEOS */}
                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={[
                            styles.scrollContent,
                            isLandscape && styles.scrollContentLandscape,
                        ]}
                        showsVerticalScrollIndicator={false}>

                        {/* 1. SECCIÓN DE EFECTO (SPIN) */}
                        <View style={[
                            styles.panelCard,
                            isLandscape && styles.panelCardSide,
                            !isDark && { backgroundColor: '#f8fafc', borderColor: palette.border },
                        ]}>
                            <View style={styles.panelHeader}>
                                <Text style={[styles.panelTitle, { color: activeColor }]}>
                                    {language === 'en' ? '1. SPIN (EFFECT)' : '1. EFECTO (SPIN)'}
                                </Text>
                                <View style={[styles.levelBadge, { backgroundColor: `${activeColor}22`, borderColor: `${activeColor}55` }]}>
                                    <Text style={[styles.levelBadgeText, { color: activeColor }]}>
                                        {clockInfo ?? (effectLevel === 0 ? (language === 'en' ? 'E0 Center' : 'E0 Centro') : `E${effectLevel}`)}
                                    </Text>
                                </View>
                            </View>

                            {/* Esfera 3D Interactiva */}
                            <View style={styles.stageWrap}>
                                <View
                                    style={[styles.svgBox, { width: sphereSize, height: sphereSize }]}
                                    {...gestureHandlers}>
                                    <Svg width={sphereSize} height={sphereSize} viewBox={`0 0 ${sphereSize} ${sphereSize}`}>
                                        <Defs>
                                            <RadialGradient id={`${modalUid}_gradYellow`} cx="38%" cy="32%" r="68%">
                                                <Stop offset="0%" stopColor="#fffbeb" />
                                                <Stop offset="30%" stopColor="#fef08a" />
                                                <Stop offset="75%" stopColor="#eab308" />
                                                <Stop offset="100%" stopColor="#713f12" />
                                            </RadialGradient>
                                            <RadialGradient id={`${modalUid}_gradWhite`} cx="38%" cy="32%" r="68%">
                                                <Stop offset="0%" stopColor="#ffffff" />
                                                <Stop offset="35%" stopColor="#f8fafc" />
                                                <Stop offset="75%" stopColor="#cbd5e1" />
                                                <Stop offset="100%" stopColor="#475569" />
                                            </RadialGradient>
                                        </Defs>

                                        {/* Sombra de la esfera */}
                                        <Circle cx={sphereCenter} cy={sphereCenter + 3} r={sphereRadius} fill="rgba(0,0,0,0.5)" />

                                        {/* Bola 3D */}
                                        <Circle
                                            cx={sphereCenter}
                                            cy={sphereCenter}
                                            r={sphereRadius}
                                            fill={isYellow ? `url(#${modalUid}_gradYellow)` : `url(#${modalUid}_gradWhite)`}
                                            stroke={isYellow ? 'rgba(234, 179, 8, 0.45)' : 'rgba(255, 255, 255, 0.4)'}
                                            strokeWidth={1.5}
                                        />

                                        {/* Marcajes oficiales / Punto central */}
                                        {prefs.showBallDots !== false && (
                                            <Circle
                                                cx={sphereCenter}
                                                cy={sphereCenter}
                                                r={sphereRadius * 0.16}
                                                fill={prefs.ballSkin === 'cosmo_helix_pba' ? (isYellow ? '#1e3a8a' : '#00e5ff') : '#dc2626'}
                                                opacity={0.88}
                                            />
                                        )}

                                        {/* Ejes y Retícula de Guía */}
                                        <Line
                                            x1={sphereCenter - sphereRadius + 4}
                                            y1={sphereCenter}
                                            x2={sphereCenter + sphereRadius - 4}
                                            y2={sphereCenter}
                                            stroke={activeColor}
                                            strokeWidth={1}
                                            opacity={0.65}
                                        />
                                        <Line
                                            x1={sphereCenter}
                                            y1={sphereCenter - sphereRadius + 4}
                                            x2={sphereCenter}
                                            y2={sphereCenter + sphereRadius - 4}
                                            stroke={activeColor}
                                            strokeWidth={1}
                                            opacity={0.65}
                                        />

                                        {/* Anillos de tolerancia concéntricos */}
                                        <Circle cx={sphereCenter} cy={sphereCenter} r={maxDragRadius * 0.5} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} strokeDasharray="2 2" />
                                        <Circle cx={sphereCenter} cy={sphereCenter} r={maxDragRadius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />

                                        {/* Resplandor y Punto de Impacto de la Suela */}
                                        <Circle cx={tipX} cy={tipY} r={10} fill={activeGlow} />
                                        <Circle cx={tipX} cy={tipY} r={5.5} fill={activeColor} stroke="#ffffff" strokeWidth={1.5} />
                                    </Svg>
                                </View>
                            </View>

                            {/* Presets Rápidos de Efecto */}
                            <View style={styles.presetButtonsRow}>
                                <TouchableOpacity style={styles.presetBtn} onPress={() => setSpinPreset(0, 0)}>
                                    <Text style={styles.presetBtnText}>E0 {language === 'en' ? 'Center' : 'Centro'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.presetBtn} onPress={() => setSpinPreset(0, 0.65)}>
                                    <Text style={styles.presetBtnText}>12h {language === 'en' ? 'Follow' : 'Corrido'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.presetBtn} onPress={() => setSpinPreset(0, -0.65)}>
                                    <Text style={styles.presetBtnText}>6h {language === 'en' ? 'Draw' : 'Retroceso'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.presetBtn} onPress={() => setSpinPreset(-0.65, 0)}>
                                    <Text style={styles.presetBtnText}>9h {language === 'en' ? 'Left' : 'Izq'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.presetBtn} onPress={() => setSpinPreset(0.65, 0)}>
                                    <Text style={styles.presetBtnText}>3h {language === 'en' ? 'Right' : 'Der'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* 2. SECCIÓN DE TOME DE BOLA (ECLIPSE) */}
                        <View style={[
                            styles.panelCard,
                            isLandscape && styles.panelCardSide,
                            !isDark && { backgroundColor: '#f8fafc', borderColor: palette.border },
                        ]}>
                            <View style={styles.panelHeader}>
                                <Text style={[styles.panelTitle, { color: activeColor }]}>
                                    {language === 'en' ? '2. FULLNESS (TOME)' : '2. TOME DE BOLA'}
                                </Text>
                                <View style={[styles.levelBadge, { backgroundColor: `${activeColor}22`, borderColor: `${activeColor}55` }]}>
                                    <Text style={[styles.levelBadgeText, { color: activeColor }]}>
                                        {tome?.fractionLabel ?? (language === 'en' ? 'Contact' : 'Tome')} • {tome?.directContact ? `${tome.percentage}%` : '--'}
                                    </Text>
                                </View>
                            </View>

                            {/* Visualizador Eclipse 3D */}
                            <View style={styles.stageWrap}>
                                <View style={[styles.svgBox, { width: eclipseSize, height: eclipseSize }]}>
                                    <Svg width={eclipseSize} height={eclipseSize} viewBox={`0 0 ${eclipseSize} ${eclipseSize}`}>
                                        <Defs>
                                            <RadialGradient id={`${modalUid}_gradRed_ec`} cx="35%" cy="30%" r="70%">
                                                <Stop offset="0%" stopColor="#fca5a5" />
                                                <Stop offset="30%" stopColor="#ef4444" />
                                                <Stop offset="70%" stopColor="#b91c1c" />
                                                <Stop offset="100%" stopColor="#7f1d1d" />
                                            </RadialGradient>
                                            <RadialGradient id={`${modalUid}_gradYellow_ec`} cx="35%" cy="30%" r="70%">
                                                <Stop offset="0%" stopColor="#fffbeb" />
                                                <Stop offset="30%" stopColor="#fef08a" />
                                                <Stop offset="70%" stopColor="#eab308" />
                                                <Stop offset="100%" stopColor="#854d0e" />
                                            </RadialGradient>
                                            <RadialGradient id={`${modalUid}_gradWhite_ec`} cx="35%" cy="30%" r="70%">
                                                <Stop offset="0%" stopColor="#ffffff" />
                                                <Stop offset="40%" stopColor="#f8fafc" />
                                                <Stop offset="75%" stopColor="#cbd5e1" />
                                                <Stop offset="100%" stopColor="#64748b" />
                                            </RadialGradient>
                                        </Defs>

                                        {/* 1. Bola Objetivo (Fija en el centro) */}
                                        <G>
                                            <Circle cx={eclipseCenter} cy={eclipseCenter + 3} r={eclipseSphereRadius} fill="rgba(0,0,0,0.45)" />
                                            <Circle
                                                cx={eclipseCenter}
                                                cy={eclipseCenter}
                                                r={eclipseSphereRadius}
                                                fill={`url(#${targetBall?.id === 'yellow' ? `${modalUid}_gradYellow_ec` : targetBall?.id === 'white' ? `${modalUid}_gradWhite_ec` : `${modalUid}_gradRed_ec`})`}
                                                stroke="rgba(255, 255, 255, 0.4)"
                                                strokeWidth={1.2}
                                            />
                                            {/* Línea de eje central de la bola 2 */}
                                            <Line
                                                x1={eclipseCenter}
                                                y1={eclipseCenter - eclipseSphereRadius + 3}
                                                x2={eclipseCenter}
                                                y2={eclipseCenter + eclipseSphereRadius - 3}
                                                stroke={activeColor}
                                                strokeWidth={1}
                                                strokeDasharray="2 2"
                                                opacity={0.65}
                                            />
                                        </G>

                                        {/* 2. Bola Atacadora (Desplazada según toma de bola real) */}
                                        <G opacity={0.92}>
                                            <Circle
                                                cx={cueBallX}
                                                cy={eclipseCenter}
                                                r={eclipseSphereRadius}
                                                fill={`url(#${isYellow ? `${modalUid}_gradYellow_ec` : `${modalUid}_gradWhite_ec`})`}
                                                stroke={activeColor}
                                                strokeWidth={1.5}
                                            />
                                            <Circle
                                                cx={cueBallX - eclipseSphereRadius * 0.3}
                                                cy={eclipseCenter - eclipseSphereRadius * 0.3}
                                                r={eclipseSphereRadius * 0.22}
                                                fill="#ffffff"
                                                opacity={0.65}
                                            />
                                        </G>
                                    </Svg>
                                </View>
                            </View>

                            {/* Métricas de Ángulos (α y β) */}
                            <View style={styles.metricsRow}>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>
                                        {language === 'en' ? 'Cue Deflection (α)' : 'Desvío Tiradora (α)'}
                                    </Text>
                                    <Text style={[styles.metricValue, { color: activeColor }]}>
                                        {tome?.directContact ? `${tome.cueDeflectionAlphaDeg}°` : '--'}
                                    </Text>
                                </View>
                                <View style={styles.metricDivider} />
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>
                                        {language === 'en' ? 'Target Exit (β)' : 'Salida Bola 2 (β)'}
                                    </Text>
                                    <Text style={[styles.metricValue, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {tome?.directContact ? `${tome.targetExitBetaDeg}°` : '--'}
                                    </Text>
                                </View>
                            </View>

                            {/* Presets Rápidos de Fracciones de Tome */}
                            <View style={styles.presetButtonsRow}>
                                {[
                                    { frac: 0.125, label: '1/8' },
                                    { frac: 0.25, label: '1/4' },
                                    { frac: 0.375, label: '3/8' },
                                    { frac: 0.5, label: '1/2' },
                                    { frac: 0.75, label: '3/4' },
                                    { frac: 1.0, label: language === 'en' ? 'Full' : '1/1' },
                                ].map((preset) => {
                                    const isSelected = tome && Math.abs(tome.fraction - preset.frac) < 0.05;
                                    return (
                                        <TouchableOpacity
                                            key={preset.label}
                                            style={[
                                                styles.presetBtn,
                                                isSelected && { backgroundColor: `${activeColor}33`, borderColor: activeColor },
                                            ]}
                                            onPress={() => snapToFraction(preset.frac)}>
                                            <Text style={[styles.presetBtnText, isSelected && { color: activeColor, fontWeight: '800' }]}>
                                                {preset.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Micro-Ajuste Fino de Puntería */}
                            {onAimChange && (
                                <View style={styles.microAimRow}>
                                    <TouchableOpacity style={styles.microAimBtn} onPress={() => nudgeAim(-0.5)}>
                                        <IconArrowLeft size={14} color="#94a3b8" />
                                        <Text style={styles.microAimText}>-0.5°</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.microAimLabel}>
                                        {language === 'en' ? 'NUDGE AIM' : 'AJUSTE FINO'}
                                    </Text>
                                    <TouchableOpacity style={styles.microAimBtn} onPress={() => nudgeAim(0.5)}>
                                        <Text style={styles.microAimText}>+0.5°</Text>
                                        <IconArrowRight size={14} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* BOTÓN CERRAR / LISTO */}
                    <View style={styles.footerRow}>
                        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: activeColor }]} onPress={onClose}>
                            <IconCheck size={16} color="#ffffff" strokeWidth={2.5} />
                            <Text style={styles.doneBtnText}>
                                {language === 'en' ? 'APPLY & CLOSE' : 'APLICAR Y CERRAR'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    modalCard: {
        backgroundColor: '#0a0f1d',
        borderRadius: 20,
        borderWidth: 1.5,
        overflow: 'hidden',
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)' }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
            }),
        elevation: 12,
    },
    modalCardLandscape: {
        width: '92%',
        maxWidth: 780,
        maxHeight: '94%',
    },
    modalCardPortrait: {
        width: '96%',
        maxWidth: 420,
        maxHeight: '92%',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        gap: 8,
    },
    headerLeftCol: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    headerSubtitle: {
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 1,
    },
    cueBallSelectorPill: {
        flexDirection: 'row',
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        gap: 2,
    },
    ballOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 9,
        gap: 5,
    },
    ballOptionBtnActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.5)',
    },
    whiteBallMiniIcon: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#94a3b8',
    },
    yellowBallMiniIcon: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#eab308',
        borderWidth: 1,
        borderColor: '#ca8a04',
    },
    ballOptionText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94a3b8',
    },
    ballOptionTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollArea: {
        flexGrow: 0,
        flexShrink: 1,
    },
    scrollContent: {
        padding: 12,
        gap: 12,
    },
    scrollContentLandscape: {
        flexDirection: 'row',
        alignItems: 'stretch',
        padding: 8,
        gap: 8,
    },
    panelCard: {
        flex: 1,
        backgroundColor: '#070b14',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.07)',
        alignItems: 'center',
    },
    panelCardSide: {
        minWidth: 240,
        padding: 8,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 8,
    },
    panelTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
    },
    levelBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    stageWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    svgBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetButtonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        width: '100%',
    },
    presetBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    presetBtnText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#e2e8f0',
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        width: '100%',
        marginTop: 6,
    },
    metricItem: {
        alignItems: 'center',
    },
    metricDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    metricLabel: {
        fontSize: 9,
        color: '#94a3b8',
    },
    metricValue: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 1,
    },
    microAimRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
        paddingHorizontal: 8,
    },
    microAimBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    microAimText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#cbd5e1',
    },
    microAimLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 0.5,
    },
    footerRow: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
    },
    doneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 6,
        width: '100%',
        maxWidth: 240,
    },
    doneBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
});
