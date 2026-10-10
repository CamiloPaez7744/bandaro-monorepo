import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    PanResponder,
    useWindowDimensions,
    type GestureResponderEvent,
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
import Svg, {
    Circle,
    Defs,
    Ellipse,
    G,
    Line,
    RadialGradient,
    Stop,
    Text as SvgText,
} from 'react-native-svg';
import { BallId, SpinEffect } from '@bandaro/core';
import { IconRefresh, IconX, IconCheck } from '@/src/presentation/components/icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';
import {
    useTablePreferences,
    type TablePreferences,
    BALL_SKIN_PRESETS,
} from './tablePreferences';

interface CaromProEffectModalProps {
    visible: boolean;
    spin: SpinEffect;
    cueBallId: BallId;
    tablePreferences?: TablePreferences;
    onSpinChange: (spin: SpinEffect) => void;
    onClose: () => void;
}

const REAL_BALL_DIAMETER_MM = 61.5;
const REAL_BALL_RADIUS_MM = REAL_BALL_DIAMETER_MM / 2; // 30.75 mm
const REAL_TIP_DIAMETER_MM = 12.0;
const REAL_TIP_RADIUS_MM = REAL_TIP_DIAMETER_MM / 2; // 6.0 mm
const MAX_SAFE_RADIUS_RATIO = 0.76; // ~23.4 mm del centro

export const CaromProEffectModal = memo(function CaromProEffectModal({
    visible,
    spin,
    cueBallId,
    tablePreferences: propsTablePreferences,
    onSpinChange,
    onClose,
}: CaromProEffectModalProps) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isMobile = windowWidth < 768;
    const { t, language } = useI18n();
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const isDark = colorScheme === 'dark';
    const styles = getStyles(palette, isDark);

    const { preferences: prefs } = useTablePreferences(propsTablePreferences);
    const modalUid = useMemo(() => `cpe_${Math.random().toString(36).slice(2, 8)}`, []);
    const ballSkin = prefs.ballSkin ?? 'aramith_pro_cup';
    const showDots = prefs.showBallDots !== false;

    // Responsive size of the sphere stage for mobile
    const size = isMobile ? Math.min(230, windowWidth - 50) : 280;
    const center = size / 2;
    const sphereRadius = size * 0.36;
    const tipRadius = sphereRadius * (REAL_TIP_RADIUS_MM / REAL_BALL_RADIUS_MM);
    const maxDragRadius = sphereRadius * MAX_SAFE_RADIUS_RATIO;

    const centerRef = useRef(center);
    centerRef.current = center;
    const maxDragRadiusRef = useRef(maxDragRadius);
    maxDragRadiusRef.current = maxDragRadius;
    const sphereRadiusRef = useRef(sphereRadius);
    sphereRadiusRef.current = sphereRadius;
    const onSpinChangeRef = useRef(onSpinChange);
    onSpinChangeRef.current = onSpinChange;

    const isYellow = cueBallId === 'yellow';

    const tipX = center + spin.x * maxDragRadius;
    const tipY = center - spin.y * maxDragRadius;

    const offsetX_mm = spin.x * (REAL_BALL_RADIUS_MM * MAX_SAFE_RADIUS_RATIO);
    const offsetY_mm = spin.y * (REAL_BALL_RADIUS_MM * MAX_SAFE_RADIUS_RATIO);
    const distFromCenter_mm = Math.hypot(offsetX_mm, offsetY_mm);
    const isMiscueZone = distFromCenter_mm > 23.0;

    const effectLevel = useMemo(() => {
        if (spin.magnitude < 0.12) return 0;
        return Math.min(4, Math.max(1, Math.round(spin.magnitude / 0.23)));
    }, [spin.magnitude]);

    const updateFromCoords = useCallback(
        (svgX: number, svgY: number) => {
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
        },
        []
    );

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt: GestureResponderEvent) => {
                updateFromCoords(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            },
            onPanResponderMove: (evt: GestureResponderEvent) => {
                updateFromCoords(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            },
        })
    ).current;

    const handleWebPointer = useCallback(
        (e: any) => {
            const rect = e.currentTarget?.getBoundingClientRect?.();
            if (rect) {
                updateFromCoords(e.clientX - rect.left, e.clientY - rect.top);
            }
        },
        [updateFromCoords]
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

    const setPreset = useCallback(
        (x: number, y: number) => {
            const mag = Math.hypot(x, y);
            onSpinChange({
                x,
                y,
                magnitude: Math.min(1, mag),
            });
        },
        [onSpinChange]
    );

    const setPresetLevel = useCallback(
        (level: number) => {
            if (level === 0) {
                setPreset(0, 0);
                return;
            }
            const signX = spin.x < -0.05 ? -1 : 1;
            setPreset(signX * level * 0.25, 0);
        },
        [setPreset, spin.x]
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.headerSubtitle}>
                                    {prefs.breakFormat === 'umb' ? '🌍 UMB 3-CUSHION' : '🇰🇷 PBA TOUR'}
                                </Text>
                                <View style={{
                                    backgroundColor: isYellow ? '#eab308' : '#f8fafc',
                                    paddingHorizontal: 6,
                                    paddingVertical: 1,
                                    borderRadius: 4,
                                }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: isYellow ? '#713f12' : '#0f172a' }}>
                                        {isYellow ? (language === 'en' ? 'YELLOW BALL' : 'BOLA AMARILLA') : (language === 'en' ? 'WHITE BALL' : 'BOLA BLANCA')}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.headerTitle, isMobile && { fontSize: 13 }]}>
                                {t('training.effect.title')} • {BALL_SKIN_PRESETS.find((s) => s.id === ballSkin)?.name.split(' (')[0] ?? 'PRO'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel={t('common.close')}>
                            <IconX size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable Container so it NEVER cuts off on any mobile device */}
                    <ScrollView
                        style={styles.modalScroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}>
                        {/* Stage central del Efecto */}
                        <View style={styles.stageWrap}>
                            <View
                                style={[styles.svgContainer, { width: size, height: size }]}
                                {...gestureHandlers}>
                                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                    <Defs>
                                        <RadialGradient id={`${modalUid}_sphereShadeYellow`} cx="42%" cy="38%" r="65%">
                                            <Stop offset="0%" stopColor="#fffbeb" />
                                            <Stop offset="30%" stopColor="#fef08a" />
                                            <Stop offset="75%" stopColor="#eab308" />
                                            <Stop offset="100%" stopColor="#713f12" />
                                        </RadialGradient>
                                        <RadialGradient id={`${modalUid}_sphereShadeWhite`} cx="42%" cy="38%" r="65%">
                                            <Stop offset="0%" stopColor="#ffffff" />
                                            <Stop offset="35%" stopColor="#f8fafc" />
                                            <Stop offset="75%" stopColor="#cbd5e1" />
                                            <Stop offset="100%" stopColor="#475569" />
                                        </RadialGradient>

                                        <RadialGradient id={`${modalUid}_neonTipGlow`} cx="50%" cy="50%" r="50%">
                                            <Stop offset="0%" stopColor="#00d2ff" stopOpacity="0.9" />
                                            <Stop offset="50%" stopColor="#00d2ff" stopOpacity="0.4" />
                                            <Stop offset="100%" stopColor="#00d2ff" stopOpacity="0" />
                                        </RadialGradient>
                                    </Defs>

                                    {/* Sombra esférica exterior */}
                                    <Circle
                                        cx={center}
                                        cy={center}
                                        r={sphereRadius + 10}
                                        fill="rgba(0, 210, 255, 0.05)"
                                    />

                                    {/* Esfera de la bola con luz volumétrica */}
                                    <Circle
                                        cx={center}
                                        cy={center}
                                        r={sphereRadius}
                                        fill={isYellow ? `url(#${modalUid}_sphereShadeYellow)` : `url(#${modalUid}_sphereShadeWhite)`}
                                        stroke={isYellow ? 'rgba(234, 179, 8, 0.45)' : 'rgba(255, 255, 255, 0.4)'}
                                        strokeWidth={1.5}
                                    />

                                    {/* Puntos y marcajes oficiales según set de bolas activo */}
                                    {showDots && (() => {
                                        if (ballSkin === 'aramith_pro_cup') {
                                            const dotR = sphereRadius * 0.085;
                                            const dOffset = sphereRadius * 0.44;
                                            return (
                                                <G style={{ pointerEvents: 'none' }} opacity={0.88}>
                                                    <Circle cx={center} cy={center} r={dotR} fill="#dc2626" />
                                                    <Circle cx={center - dOffset} cy={center - dOffset * 0.5} r={dotR} fill="#dc2626" />
                                                    <Circle cx={center + dOffset} cy={center - dOffset * 0.5} r={dotR} fill="#dc2626" />
                                                    <Circle cx={center - dOffset} cy={center + dOffset * 0.5} r={dotR} fill="#dc2626" />
                                                    <Circle cx={center + dOffset} cy={center + dOffset * 0.5} r={dotR} fill="#dc2626" />
                                                    <Circle cx={center} cy={center - dOffset * 0.85} r={dotR} fill="#dc2626" />
                                                </G>
                                            );
                                        }
                                        if (ballSkin === 'cosmo_helix_pba') {
                                            const dotColor = isYellow ? '#0284c7' : '#00e5ff';
                                            const ringColor = isYellow ? 'rgba(2, 132, 199, 0.45)' : 'rgba(0, 229, 255, 0.45)';
                                            const dotR = sphereRadius * 0.085;
                                            const dOffset = sphereRadius * 0.44;
                                            return (
                                                <G style={{ pointerEvents: 'none' }}>
                                                    <Circle cx={center} cy={center} r={sphereRadius * 0.55} fill="none" stroke={ringColor} strokeWidth={1.2} strokeDasharray="3 2" />
                                                    <Circle cx={center} cy={center} r={sphereRadius * 0.82} fill="none" stroke={ringColor} strokeWidth={1} strokeDasharray="2 3" />
                                                    <Circle cx={center} cy={center} r={dotR} fill={dotColor} />
                                                    <Circle cx={center - dOffset} cy={center - dOffset * 0.5} r={dotR} fill={dotColor} />
                                                    <Circle cx={center + dOffset} cy={center - dOffset * 0.5} r={dotR} fill={dotColor} />
                                                    <Circle cx={center - dOffset} cy={center + dOffset * 0.5} r={dotR} fill={dotColor} />
                                                    <Circle cx={center + dOffset} cy={center + dOffset * 0.5} r={dotR} fill={dotColor} />
                                                </G>
                                            );
                                        }
                                        if (ballSkin === 'dynaspheres') {
                                            const dotColor = isYellow ? '#1d4ed8' : '#475569';
                                            const ringColor = isYellow ? 'rgba(29, 78, 216, 0.4)' : 'rgba(71, 85, 105, 0.4)';
                                            const dotR = sphereRadius * 0.075;
                                            const dOffset = sphereRadius * 0.42;
                                            return (
                                                <G style={{ pointerEvents: 'none' }}>
                                                    <Circle cx={center} cy={center} r={sphereRadius * 0.58} fill="none" stroke={ringColor} strokeWidth={1.3} />
                                                    <Circle cx={center} cy={center} r={dotR} fill={dotColor} />
                                                    <Circle cx={center - dOffset} cy={center} r={dotR} fill={dotColor} />
                                                    <Circle cx={center + dOffset} cy={center} r={dotR} fill={dotColor} />
                                                    <Circle cx={center} cy={center - dOffset} r={dotR} fill={dotColor} />
                                                    <Circle cx={center} cy={center + dOffset} r={dotR} fill={dotColor} />
                                                </G>
                                            );
                                        }
                                        if (ballSkin === 'classic_solid') {
                                            const dotColor = isYellow ? '#dc2626' : '#0f172a';
                                            return (
                                                <G style={{ pointerEvents: 'none' }}>
                                                    <Circle cx={center} cy={center} r={sphereRadius * 0.075} fill={dotColor} opacity={0.8} />
                                                </G>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* 1. Círculos Concéntricos de Casquillos (E1, E2, E3) en azul sutil */}
                                    {[0.25, 0.5, 0.75].map((ratio, idx) => {
                                        const r = maxDragRadius * ratio;
                                        return (
                                            <Circle
                                                key={`ring-e${idx + 1}`}
                                                cx={center}
                                                cy={center}
                                                r={r}
                                                fill="none"
                                                stroke="rgba(0, 210, 255, 0.30)"
                                                strokeWidth={0.9}
                                            />
                                        );
                                    })}

                                    {/* 2. Zona Segura Punteada (Casquillo E4 / Límite Máximo Reglamentario UMB) */}
                                    <Circle
                                        cx={center}
                                        cy={center}
                                        r={maxDragRadius}
                                        fill="rgba(0, 210, 255, 0.02)"
                                        stroke="#00d2ff"
                                        strokeWidth={1.3}
                                        strokeDasharray="4 3"
                                    />

                                    {/* 3. Zona de Pifia Punteada (Límite Crítico de Deslizamiento del Taco) */}
                                    <Circle
                                        cx={center}
                                        cy={center}
                                        r={sphereRadius * 0.82}
                                        fill="rgba(239, 68, 68, 0.03)"
                                        stroke="#ef4444"
                                        strokeWidth={1.3}
                                        strokeDasharray="3 3"
                                    />

                                    {/* 4. EJE X (Horizontal / Lateral - 9h Izq a 3h Der) */}
                                    <Line
                                        x1={center - sphereRadius - 6}
                                        y1={center}
                                        x2={center + sphereRadius + 6}
                                        y2={center}
                                        stroke="#00d2ff"
                                        strokeWidth={1.5}
                                        strokeLinecap="round"
                                    />

                                    {/* Calibración milimétrica de casquillos sobre Eje X */}
                                    {[-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1].map((r) => (
                                        <Line
                                            key={`tick-x-${r}`}
                                            x1={center + maxDragRadius * r}
                                            y1={center - (Math.abs(r) === 1 ? 3.5 : 2.2)}
                                            x2={center + maxDragRadius * r}
                                            y2={center + (Math.abs(r) === 1 ? 3.5 : 2.2)}
                                            stroke="#00d2ff"
                                            strokeWidth={1}
                                            strokeLinecap="round"
                                        />
                                    ))}

                                    {/* 5. EJE Y (Vertical / Corrido 12h y Pique 6h) */}
                                    <Line
                                        x1={center}
                                        y1={center - sphereRadius - 6}
                                        x2={center}
                                        y2={center + sphereRadius + 6}
                                        stroke="#00d2ff"
                                        strokeWidth={1.5}
                                        strokeLinecap="round"
                                    />

                                    {/* Calibración milimétrica de casquillos sobre Eje Y */}
                                    {[-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1].map((r) => (
                                        <Line
                                            key={`tick-y-${r}`}
                                            x1={center - (Math.abs(r) === 1 ? 3.5 : 2.2)}
                                            y1={center + maxDragRadius * r}
                                            x2={center + (Math.abs(r) === 1 ? 3.5 : 2.2)}
                                            y2={center + maxDragRadius * r}
                                            stroke="#00d2ff"
                                            strokeWidth={1}
                                            strokeLinecap="round"
                                        />
                                    ))}

                                    {/* Centro E0 */}
                                    <Circle cx={center} cy={center} r={2} fill="#00d2ff" />

                                    {/* Etiquetas en los extremos de los ejes */}
                                    <SvgText
                                        x={center + sphereRadius + 10}
                                        y={center + 3}
                                        fill="#00d2ff"
                                        fontSize="8"
                                        fontWeight="bold"
                                        textAnchor="start">
                                        3h
                                    </SvgText>
                                    <SvgText
                                        x={center - sphereRadius - 10}
                                        y={center + 3}
                                        fill="#00d2ff"
                                        fontSize="8"
                                        fontWeight="bold"
                                        textAnchor="end">
                                        9h
                                    </SvgText>
                                    <SvgText
                                        x={center}
                                        y={center - sphereRadius - 9}
                                        fill="#00d2ff"
                                        fontSize="8"
                                        fontWeight="bold"
                                        textAnchor="middle">
                                        12h
                                    </SvgText>
                                    <SvgText
                                        x={center}
                                        y={center + sphereRadius + 15}
                                        fill="#00d2ff"
                                        fontSize="8"
                                        fontWeight="bold"
                                        textAnchor="middle">
                                        6h
                                    </SvgText>

                                    {/* Indicadores de dirección sobre las líneas interiores */}
                                    <SvgText
                                        x={center + maxDragRadius * 0.86}
                                        y={center - 4}
                                        fill="rgba(0, 210, 255, 0.7)"
                                        fontSize="6"
                                        fontWeight="bold"
                                        textAnchor="middle">
                                        {language === 'en' ? 'R' : 'Der'}
                                    </SvgText>
                                    <SvgText
                                        x={center - maxDragRadius * 0.86}
                                        y={center - 4}
                                        fill="rgba(0, 210, 255, 0.7)"
                                        fontSize="6"
                                        fontWeight="bold"
                                        textAnchor="middle">
                                        {language === 'en' ? 'L' : 'Izq'}
                                    </SvgText>
                                    <SvgText
                                        x={center + 4}
                                        y={center - maxDragRadius * 0.86 + 2}
                                        fill="rgba(0, 210, 255, 0.7)"
                                        fontSize="6"
                                        fontWeight="bold"
                                        textAnchor="start">
                                        {language === 'en' ? 'Top' : 'Corr'}
                                    </SvgText>
                                    <SvgText
                                        x={center + 4}
                                        y={center + maxDragRadius * 0.86 + 2}
                                        fill="rgba(0, 210, 255, 0.7)"
                                        fontSize="6"
                                        fontWeight="bold"
                                        textAnchor="start">
                                        {language === 'en' ? 'Draw' : 'Piq'}
                                    </SvgText>

                                    {/* Halo exterior y Casquillo del taco */}
                                    <Circle
                                        cx={tipX}
                                        cy={tipY}
                                        r={tipRadius * 1.5}
                                        fill={`url(#${modalUid}_neonTipGlow)`}
                                    />
                                    <Circle
                                        cx={tipX}
                                        cy={tipY}
                                        r={tipRadius}
                                        fill={isMiscueZone ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 210, 255, 0.25)'}
                                        stroke={isMiscueZone ? '#ef4444' : '#00d2ff'}
                                        strokeWidth={1.5}
                                    />
                                    <Circle
                                        cx={tipX}
                                        cy={tipY}
                                        r={3.8}
                                        fill={isMiscueZone ? '#ef4444' : '#10b981'}
                                        stroke="#ffffff"
                                        strokeWidth={1.2}
                                    />
                                </Svg>
                            </View>

                            {/* Leyenda de Referencia de Zonas */}
                            <View style={styles.legendRow}>
                                <View style={styles.legendItem}>
                                    <View style={styles.legendDashSafe} />
                                    <Text style={styles.legendText}>{t('training.effect.safeZone')}</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={styles.legendDashMiscue} />
                                    <Text style={[styles.legendText, { color: '#f87171' }]}>{t('training.effect.miscueZone')}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Ficha de Información Física y Efecto */}
                        <View style={styles.metricsCard}>
                            <View style={styles.metricCol}>
                                <Text style={styles.metricLabel}>{t('training.system.effect').toUpperCase()}</Text>
                                <Text style={[styles.metricValue, { color: '#00d2ff' }]}>
                                    {effectLevel === 0 ? (language === 'en' ? 'E0 Center' : 'E0 Centro') : `E${effectLevel}`}
                                </Text>
                            </View>
                            <View style={styles.metricDivider} />
                            <View style={styles.metricCol}>
                                <Text style={styles.metricLabel}>{t('training.effect.offset')}</Text>
                                <Text style={styles.metricValue}>
                                    {offsetX_mm > 0 ? `+${offsetX_mm.toFixed(1)}` : offsetX_mm.toFixed(1)} / {offsetY_mm > 0 ? `+${offsetY_mm.toFixed(1)}` : offsetY_mm.toFixed(1)} mm
                                </Text>
                            </View>
                            <View style={styles.metricDivider} />
                            <View style={styles.metricCol}>
                                <Text style={styles.metricLabel}>{t('training.effect.deflection')}</Text>
                                <Text style={[styles.metricValue, { color: isMiscueZone ? '#ef4444' : '#f59e0b' }]}>
                                    {isMiscueZone ? `⚠️ ${t('training.effect.miscue')}` : `+${effectLevel} Diam`}
                                </Text>
                            </View>
                        </View>

                        {/* Selector Rápido de Efecto Discreto */}
                        <View style={styles.presetSection}>
                            <Text style={styles.sectionTitle}>{t('training.effect.tipLevels')}</Text>
                            <View style={styles.pillRow}>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 0 && styles.pillBtnActive]}
                                    onPress={() => setPresetLevel(0)}>
                                    <Text style={[styles.pillText, effectLevel === 0 && styles.pillTextActive]}>
                                        E0
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 1 && styles.pillBtnActive]}
                                    onPress={() => setPresetLevel(1)}>
                                    <Text style={[styles.pillText, effectLevel === 1 && styles.pillTextActive]}>
                                        E1
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 2 && styles.pillBtnActive]}
                                    onPress={() => setPresetLevel(2)}>
                                    <Text style={[styles.pillText, effectLevel === 2 && styles.pillTextActive]}>
                                        E2
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 3 && styles.pillBtnActive]}
                                    onPress={() => setPresetLevel(3)}>
                                    <Text style={[styles.pillText, effectLevel === 3 && styles.pillTextActive]}>
                                        E3
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 4 && styles.pillBtnActive]}
                                    onPress={() => setPresetLevel(4)}>
                                    <Text style={[styles.pillText, effectLevel === 4 && styles.pillTextActive]}>
                                        E4
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Selector de Horas de Reloj */}
                        <View style={styles.presetSection}>
                            <Text style={styles.sectionTitle}>{t('training.effect.clockDirection')}</Text>
                            <View style={styles.pillRowWrap}>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0, 0.75)}>
                                    <Text style={styles.clockPillText}>{language === 'en' ? '12h Follow' : '12h Corrido'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0.53, 0.53)}>
                                    <Text style={styles.clockPillText}>1:30h</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0.75, 0)}>
                                    <Text style={styles.clockPillText}>{language === 'en' ? '3h Right' : '3h Lateral'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0.53, -0.53)}>
                                    <Text style={styles.clockPillText}>4:30h</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0, -0.75)}>
                                    <Text style={styles.clockPillText}>{language === 'en' ? '6h Draw' : '6h Pique'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(-0.53, -0.53)}>
                                    <Text style={styles.clockPillText}>7:30h</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(-0.75, 0)}>
                                    <Text style={styles.clockPillText}>{language === 'en' ? '9h Left' : '9h Lateral'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(-0.53, 0.53)}>
                                    <Text style={styles.clockPillText}>10:30h</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={() => setPreset(0, 0)}>
                            <IconRefresh size={15} color="#94a3b8" />
                            <Text style={styles.resetBtnText}>{t('common.center')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
                            <IconCheck size={16} color="#ffffff" strokeWidth={2.5} />
                            <Text style={styles.confirmBtnText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const getStyles = (palette: ReturnType<typeof getPalette>, isDark: boolean) => StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.88)' : 'rgba(15, 23, 42, 0.60)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '92%',
        backgroundColor: palette.card,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(0, 210, 255, 0.25)' : palette.border,
        padding: 16,
        gap: 10,
        ...(Platform.OS === 'web'
            ? { boxShadow: isDark ? '0 8px 24px rgba(0, 210, 255, 0.25)' : '0 8px 24px rgba(0, 0, 0, 0.12)' }
            : {
                shadowColor: isDark ? '#00d2ff' : '#000000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.25 : 0.12,
                shadowRadius: 24,
            }),
        elevation: 12,
    },
    modalCardMobile: {
        width: '96%',
        padding: 12,
        borderRadius: 18,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
    },
    headerSubtitle: {
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#00d2ff',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: palette.text,
        letterSpacing: 0.4,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : palette.surfaceLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalScroll: {
        flexShrink: 1,
    },
    scrollContent: {
        gap: 10,
        paddingVertical: 4,
    },
    stageWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 2,
        gap: 6,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingTop: 2,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDashSafe: {
        width: 14,
        height: 0,
        borderWidth: 1,
        borderColor: '#00d2ff',
        borderStyle: 'dashed',
    },
    legendDashMiscue: {
        width: 14,
        height: 0,
        borderWidth: 1,
        borderColor: '#ef4444',
        borderStyle: 'dashed',
    },
    legendText: {
        fontSize: 9,
        fontWeight: '700',
        color: palette.muted,
        letterSpacing: 0.2,
    },
    svgContainer: {
        cursor: 'crosshair' as any,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricsCard: {
        flexDirection: 'row',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : palette.surfaceLow,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    metricCol: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    metricDivider: {
        width: 1,
        height: 20,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : palette.border,
    },
    metricLabel: {
        fontSize: 7.5,
        fontWeight: '800',
        color: palette.muted,
        letterSpacing: 0.6,
    },
    metricValue: {
        fontSize: 10.5,
        fontWeight: '800',
        color: palette.text,
        fontVariant: ['tabular-nums'],
    },
    presetSection: {
        gap: 5,
    },
    sectionTitle: {
        fontSize: 8,
        fontWeight: '800',
        color: palette.muted,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    pillRow: {
        flexDirection: 'row',
        gap: 5,
    },
    pillBtn: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : palette.surfaceLow,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : palette.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillBtnActive: {
        backgroundColor: isDark ? 'rgba(0, 210, 255, 0.18)' : 'rgba(0, 210, 255, 0.12)',
        borderColor: '#00d2ff',
    },
    pillText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: palette.muted,
    },
    pillTextActive: {
        color: '#00d2ff',
        fontWeight: '800',
    },
    pillRowWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
    },
    clockPill: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : palette.surfaceLow,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
    },
    clockPillText: {
        fontSize: 9,
        fontWeight: '600',
        color: palette.text,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : palette.surfaceLow,
    },
    resetBtnText: {
        color: palette.muted,
        fontSize: 11,
        fontWeight: '700',
    },
    confirmBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: '#0d5e2f',
    },
    confirmBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
});
