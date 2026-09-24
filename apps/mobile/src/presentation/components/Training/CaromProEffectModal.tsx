import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    PanResponder,
    useWindowDimensions,
    type GestureResponderEvent,
} from 'react-native';
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

interface CaromProEffectModalProps {
    visible: boolean;
    spin: SpinEffect;
    cueBallId: BallId;
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
    onSpinChange,
    onClose,
}: CaromProEffectModalProps) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isMobile = windowWidth < 768;

    // Responsive size of the sphere stage for mobile
    const size = isMobile ? Math.min(200, windowWidth - 70) : 270;
    const center = size / 2;
    const sphereRadius = size * 0.40;
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
                            <Text style={styles.headerSubtitle}>UMB CAROM 3-CUSHION</Text>
                            <Text style={[styles.headerTitle, isMobile && { fontSize: 13 }]}>
                                SELECTOR DE EFECTO
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
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
                                {...panResponder.panHandlers}>
                                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                    <Defs>
                                        <RadialGradient id="modalSphereShadeYellow" cx="42%" cy="38%" r="65%">
                                            <Stop offset="0%" stopColor="#fffbeb" />
                                            <Stop offset="30%" stopColor="#fef08a" />
                                            <Stop offset="75%" stopColor="#eab308" />
                                            <Stop offset="100%" stopColor="#713f12" />
                                        </RadialGradient>
                                        <RadialGradient id="modalSphereShadeWhite" cx="42%" cy="38%" r="65%">
                                            <Stop offset="0%" stopColor="#ffffff" />
                                            <Stop offset="35%" stopColor="#f8fafc" />
                                            <Stop offset="75%" stopColor="#cbd5e1" />
                                            <Stop offset="100%" stopColor="#475569" />
                                        </RadialGradient>

                                        <RadialGradient id="neonTipGlow" cx="50%" cy="50%" r="50%">
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
                                        fill={isYellow ? 'url(#modalSphereShadeYellow)' : 'url(#modalSphereShadeWhite)'}
                                        stroke="rgba(255, 255, 255, 0.3)"
                                        strokeWidth={1.5}
                                    />

                                    {/* Malla esférica 3D */}
                                    <G opacity={0.28}>
                                        {[-0.75, -0.5, -0.25, 0.25, 0.5, 0.75].map((factor) => {
                                            const yOffset = sphereRadius * factor;
                                            const rAtY = Math.sqrt(Math.max(0, sphereRadius * sphereRadius - yOffset * yOffset));
                                            return (
                                                <Ellipse
                                                    key={`lat-${factor}`}
                                                    cx={center}
                                                    cy={center + yOffset}
                                                    rx={rAtY}
                                                    ry={rAtY * 0.35}
                                                    fill="none"
                                                    stroke={isYellow ? '#713f12' : '#334155'}
                                                    strokeWidth={0.8}
                                                />
                                            );
                                        })}

                                        {[-0.75, -0.5, -0.25, 0.25, 0.5, 0.75].map((factor) => {
                                            const xOffset = sphereRadius * factor;
                                            const rAtX = Math.sqrt(Math.max(0, sphereRadius * sphereRadius - xOffset * xOffset));
                                            return (
                                                <Ellipse
                                                    key={`long-${factor}`}
                                                    cx={center + xOffset}
                                                    cy={center}
                                                    rx={rAtX * 0.35}
                                                    ry={rAtX}
                                                    fill="none"
                                                    stroke={isYellow ? '#713f12' : '#334155'}
                                                    strokeWidth={0.8}
                                                />
                                            );
                                        })}
                                    </G>

                                    {/* 4 Círculos Concéntricos de Casquillos Reales */}
                                    {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                                        const r = maxDragRadius * ratio;
                                        return (
                                            <Circle
                                                key={`ring-e${idx + 1}`}
                                                cx={center}
                                                cy={center}
                                                r={r}
                                                fill="none"
                                                stroke="rgba(0, 210, 255, 0.25)"
                                                strokeWidth={0.9}
                                                strokeDasharray={idx === 3 ? '4 3' : undefined}
                                            />
                                        );
                                    })}

                                    {/* Límite de Pifia */}
                                    <Circle
                                        cx={center}
                                        cy={center}
                                        r={sphereRadius * 0.82}
                                        fill="none"
                                        stroke="rgba(239, 68, 68, 0.35)"
                                        strokeWidth={1}
                                        strokeDasharray="2 4"
                                    />

                                    {/* EJE Y */}
                                    <Line
                                        x1={center}
                                        y1={center - sphereRadius - 10}
                                        x2={center}
                                        y2={center + sphereRadius + 10}
                                        stroke="#00d2ff"
                                        strokeWidth={1.8}
                                        strokeLinecap="round"
                                    />

                                    {/* EJE X */}
                                    <Line
                                        x1={center - sphereRadius - 10}
                                        y1={center}
                                        x2={center + sphereRadius + 10}
                                        stroke="#00d2ff"
                                        strokeWidth={1.8}
                                        strokeLinecap="round"
                                    />

                                    {/* Etiquetas de ejes */}
                                    <SvgText
                                        x={center + sphereRadius + 12}
                                        y={center + 3}
                                        fill="#00d2ff"
                                        fontSize="7"
                                        fontWeight="bold">
                                        X
                                    </SvgText>
                                    <SvgText
                                        x={center}
                                        y={center - sphereRadius - 12}
                                        fill="#00d2ff"
                                        fontSize="7"
                                        fontWeight="bold"
                                        textAnchor="middle">
                                        Y
                                    </SvgText>

                                    {/* Halo exterior y Casquillo del taco */}
                                    <Circle
                                        cx={tipX}
                                        cy={tipY}
                                        r={tipRadius * 1.5}
                                        fill="url(#neonTipGlow)"
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
                        </View>

                        {/* Ficha de Información Física y Efecto */}
                        <View style={styles.metricsCard}>
                            <View style={styles.metricCol}>
                                <Text style={styles.metricLabel}>EFECTO</Text>
                                <Text style={[styles.metricValue, { color: '#00d2ff' }]}>
                                    {effectLevel === 0 ? 'E0 Centro' : `E${effectLevel}`}
                                </Text>
                            </View>
                            <View style={styles.metricDivider} />
                            <View style={styles.metricCol}>
                                <Text style={styles.metricLabel}>DESVÍO X / Y</Text>
                                <Text style={styles.metricValue}>
                                    {offsetX_mm > 0 ? `+${offsetX_mm.toFixed(1)}` : offsetX_mm.toFixed(1)} / {offsetY_mm > 0 ? `+${offsetY_mm.toFixed(1)}` : offsetY_mm.toFixed(1)} mm
                                </Text>
                            </View>
                            <View style={styles.metricDivider} />
                            <View style={styles.metricCol}>
                                <Text style={styles.metricLabel}>INCIDENCIA</Text>
                                <Text style={[styles.metricValue, { color: isMiscueZone ? '#ef4444' : '#f59e0b' }]}>
                                    {isMiscueZone ? '⚠️ Pifia' : `+${effectLevel} Diam`}
                                </Text>
                            </View>
                        </View>

                        {/* Selector Rápido de Efecto Discreto */}
                        <View style={styles.presetSection}>
                            <Text style={styles.sectionTitle}>NIVELES DE CASQUILLO (12 MM)</Text>
                            <View style={styles.pillRow}>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 0 && styles.pillBtnActive]}
                                    onPress={() => setPreset(0, 0)}>
                                    <Text style={[styles.pillText, effectLevel === 0 && styles.pillTextActive]}>
                                        E0
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 1 && spin.x > 0 && styles.pillBtnActive]}
                                    onPress={() => setPreset(0.25, 0)}>
                                    <Text style={[styles.pillText, effectLevel === 1 && spin.x > 0 && styles.pillTextActive]}>
                                        E1
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 2 && spin.x > 0 && styles.pillBtnActive]}
                                    onPress={() => setPreset(0.5, 0)}>
                                    <Text style={[styles.pillText, effectLevel === 2 && spin.x > 0 && styles.pillTextActive]}>
                                        E2
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 3 && spin.x > 0 && styles.pillBtnActive]}
                                    onPress={() => setPreset(0.75, 0)}>
                                    <Text style={[styles.pillText, effectLevel === 3 && spin.x > 0 && styles.pillTextActive]}>
                                        E3
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pillBtn, effectLevel === 4 && spin.x > 0 && styles.pillBtnActive]}
                                    onPress={() => setPreset(1.0, 0)}>
                                    <Text style={[styles.pillText, effectLevel === 4 && spin.x > 0 && styles.pillTextActive]}>
                                        E4
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Selector de Horas de Reloj */}
                        <View style={styles.presetSection}>
                            <Text style={styles.sectionTitle}>DIRECCIÓN DEL GOLPE (RELOJ)</Text>
                            <View style={styles.pillRowWrap}>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0, 0.75)}>
                                    <Text style={styles.clockPillText}>12h Corrido</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0.53, 0.53)}>
                                    <Text style={styles.clockPillText}>1:30h</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0.75, 0)}>
                                    <Text style={styles.clockPillText}>3h Lateral</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0.53, -0.53)}>
                                    <Text style={styles.clockPillText}>4:30h</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(0, -0.75)}>
                                    <Text style={styles.clockPillText}>6h Pique</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(-0.53, -0.53)}>
                                    <Text style={styles.clockPillText}>7:30h</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clockPill}
                                    onPress={() => setPreset(-0.75, 0)}>
                                    <Text style={styles.clockPillText}>9h Lateral</Text>
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
                            <Text style={styles.resetBtnText}>Centrar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
                            <IconCheck size={16} color="#ffffff" strokeWidth={2.5} />
                            <Text style={styles.confirmBtnText}>Listo</Text>
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
        backgroundColor: 'rgba(2, 6, 23, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '92%',
        backgroundColor: '#0b131a',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 255, 0.25)',
        padding: 16,
        gap: 10,
        shadowColor: '#00d2ff',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
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
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
        color: '#f8fafc',
        letterSpacing: 0.4,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    },
    svgContainer: {
        cursor: 'crosshair' as any,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricsCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    metricLabel: {
        fontSize: 7.5,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: 0.6,
    },
    metricValue: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#f8fafc',
        fontVariant: ['tabular-nums'],
    },
    presetSection: {
        gap: 5,
    },
    sectionTitle: {
        fontSize: 8,
        fontWeight: '800',
        color: '#94a3b8',
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillBtnActive: {
        backgroundColor: 'rgba(0, 210, 255, 0.18)',
        borderColor: '#00d2ff',
    },
    pillText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#94a3b8',
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
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    clockPillText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#cbd5e1',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    resetBtnText: {
        color: '#94a3b8',
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
