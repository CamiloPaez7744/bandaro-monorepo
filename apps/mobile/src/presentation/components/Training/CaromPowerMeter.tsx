import React, { useRef, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    PanResponder,
    Platform,
    type GestureResponderEvent,
} from 'react-native';
import Svg, { Rect, Line, Defs, LinearGradient, Stop, G, Circle } from 'react-native-svg';
import { IconArrowUp } from '@/src/presentation/components/icons';
import { useI18n } from '@/components/useLanguage';

interface CaromPowerMeterProps {
    powerLevel: number; // 0..100
    onPowerChange: (power: number) => void;
    onShoot: (finalPower: number) => void;
    disabled?: boolean;
    compact?: boolean;
    isDark?: boolean;
}

/**
 * Medidor vertical de potencia estilo 8 Ball Pool (Venom WS):
 * - Riel con marco biselado y esquinas cuadradas técnicas.
 * - Barras diagonales más gruesas con gradiente cromático zonal (Cian -> Verde -> Ámbar -> Rojo).
 * - Números internos de potencia (1, 2, 3, 4) con ticks de color y marcas intermedias.
 * - Taco centrado que desciende hasta dejar ver únicamente la puntica (suela + virola con mira cian).
 * - Overflow estrictamente oculto (overflow: 'hidden').
 * - Flecha superior minimalista.
 * - Lectura inferior en una sola línea (V1..V5).
 */
export const CaromPowerMeter = React.memo(function CaromPowerMeter({
    powerLevel,
    onPowerChange,
    onShoot,
    disabled = false,
    compact = false,
    isDark = true,
}: CaromPowerMeterProps) {
    const { language } = useI18n();
    const [isDragging, setIsDragging] = useState(false);
    const meterUid = useMemo(() => 'cpm_' + Math.random().toString(36).slice(2, 8), []);

    // Dimensiones proporcionales para barras gruesas, taco centrado y números laterales
    const trackWidth = compact ? 30 : 36;
    const trackHeight = compact ? 150 : 192;
    const cueWidth = compact ? 6.5 : 8;

    const ferruleHeight = compact ? 4 : 5;
    const tipHeight = 2.2;
    const collarHeight = compact ? 12 : 15;
    const shaftLength = trackHeight;

    // Desplazamiento máximo: permite bajar hasta que solo se vea la puntica del taco en el fondo
    const maxTravel = trackHeight - ferruleHeight - tipHeight - 6;

    const containerHeightRef = useRef<number>(trackHeight);
    const powerLevelRef = useRef(powerLevel);
    powerLevelRef.current = powerLevel;

    const onShootRef = useRef(onShoot);
    onShootRef.current = onShoot;

    const onPowerChangeRef = useRef(onPowerChange);
    onPowerChangeRef.current = onPowerChange;

    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;

    const handlePowerStart = useCallback((locationY: number) => {
        if (disabledRef.current) return;
        setIsDragging(true);
        const h = containerHeightRef.current || 1;
        const pct = Math.min(100, Math.max(0, Math.round((locationY / h) * 100)));
        onPowerChangeRef.current(pct);
    }, []);

    const handlePowerMove = useCallback((locationY: number) => {
        if (disabledRef.current) return;
        const h = containerHeightRef.current || 1;
        const pct = Math.min(100, Math.max(0, Math.round((locationY / h) * 100)));
        onPowerChangeRef.current(pct);
    }, []);

    const handlePowerEnd = useCallback(() => {
        setIsDragging(false);
        const finalPower = powerLevelRef.current;
        if (finalPower > 5) {
            onShootRef.current(finalPower);
        }
        onPowerChangeRef.current(0);
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !disabledRef.current,
            onMoveShouldSetPanResponder: () => !disabledRef.current,
            onPanResponderGrant: (evt: GestureResponderEvent) => {
                handlePowerStart(evt.nativeEvent.locationY);
            },
            onPanResponderMove: (evt: GestureResponderEvent) => {
                handlePowerMove(evt.nativeEvent.locationY);
            },
            onPanResponderRelease: () => {
                handlePowerEnd();
            },
            onPanResponderTerminate: () => {
                handlePowerEnd();
            },
        })
    ).current;

    const meterGestureHandlers = useMemo(() => {
        if (Platform.OS === 'web') {
            return {
                onPointerDown: (e: any) => {
                    if (disabledRef.current) return;
                    const rect = e.currentTarget?.getBoundingClientRect?.();
                    const locationY = rect ? e.clientY - rect.top : (e.nativeEvent?.offsetY ?? 0);
                    handlePowerStart(locationY);
                },
                onPointerMove: (e: any) => {
                    if (disabledRef.current || !isDragging) return;
                    const rect = e.currentTarget?.getBoundingClientRect?.();
                    const locationY = rect ? e.clientY - rect.top : (e.nativeEvent?.offsetY ?? 0);
                    handlePowerMove(locationY);
                },
                onPointerUp: () => {
                    handlePowerEnd();
                },
                onPointerCancel: () => {
                    handlePowerEnd();
                },
            };
        }
        return panResponder.panHandlers;
    }, [handlePowerStart, handlePowerMove, handlePowerEnd, isDragging, panResponder]);

    // Convert power (0..100) to rail speed indicator (1..5)
    const railSpeed = powerLevel <= 0 ? 1 : Math.min(5, Math.max(1, Math.ceil(powerLevel / 20)));

    // Dynamic color based on power level (1..5)
    const getFillColor = (pct: number) => {
        if (pct < 25) return '#00d2ff'; // Cian neón (Vel 1)
        if (pct < 45) return '#10b981'; // Verde esmeralda (Vel 2)
        if (pct < 65) return '#f59e0b'; // Ámbar / Oro (Vel 3)
        if (pct < 85) return '#f97316'; // Naranja (Vel 4)
        return '#ef4444'; // Rojo fuego (Vel 5 / Máxima)
    };

    const fillColor = getFillColor(powerLevel);
    const activeArrowColor = powerLevel > 0 ? fillColor : (isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.35)');

    // Posición del taco: 0% = arriba en reposo (3px), 100% = sólo se ve la puntica en el fondo
    const cueTranslateY = 3 + (Math.min(100, Math.max(0, powerLevel)) / 100) * maxTravel;

    // Barras diagonales más gruesas
    const stripeSpacing = compact ? 8 : 9.5;
    const stripeStroke = compact ? 4 : 5;
    const stripeCount = Math.ceil((trackHeight + trackWidth) / stripeSpacing);

    // Color por altura Y para las barras diagonales:
    // Arriba (0% potencia / Vel 1 = Cian) -> Abajo (100% potencia / Vel 5 = Rojo)
    const getBarColorByY = (yPos: number) => {
        const ratio = yPos / trackHeight; // 0 arriba (cian), 1 abajo (rojo)
        if (ratio < 0.22) return '#00d2ff'; // Cian (Velocidad 1)
        if (ratio < 0.42) return '#10b981'; // Verde (Velocidad 2)
        if (ratio < 0.62) return '#f59e0b'; // Ámbar / Oro (Velocidad 3)
        if (ratio < 0.82) return '#f97316'; // Naranja (Velocidad 4)
        return '#ef4444'; // Rojo (Velocidad 5 / máxima potencia)
    };

    const a11yLabel = language === 'en'
        ? `Power: ${powerLevel}%, Speed ${railSpeed}`
        : `Potencia: ${powerLevel}%, Velocidad ${railSpeed}`;
    const a11yHint = language === 'en'
        ? 'Drag down to charge power, release to shoot'
        : 'Desliza hacia abajo para cargar potencia, suelta para tirar';

    // Posición del taco en el riel: centrado en la zona de las barras (dejando espacio para números a la derecha)
    const cueLeft = compact ? 8 : 10;

    return (
        <View
            style={[styles.outerContainer, compact && styles.outerContainerCompact]}
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel={a11yLabel}
            accessibilityHint={a11yHint}>
            {/* 1. Flecha indicadora superior */}
            <View style={[styles.arrowHeader, { pointerEvents: 'none' }]}>
                <IconArrowUp
                    size={compact ? 12 : 14}
                    color={activeArrowColor}
                    strokeWidth={2.6}
                />
            </View>

            {/* 2. Riel ancho con bisel exterior y esquinas cuadradas (borderRadius: 4.5px) */}
            <View
                style={[
                    styles.meterTrackBezel,
                    {
                        width: trackWidth + 4,
                        height: trackHeight + 4,
                        borderColor: isDragging || powerLevel > 0
                            ? fillColor
                            : (isDark ? '#334155' : '#94a3b8'),
                        backgroundColor: isDark ? '#0b1120' : '#cbd5e1',
                    },
                    (isDragging || powerLevel > 0) && (Platform.OS === 'web'
                        ? { boxShadow: `0 0 6px ${fillColor}` }
                        : {
                            shadowColor: fillColor,
                            shadowOpacity: 0.5,
                            shadowRadius: 6,
                        }),
                ]}
                onLayout={(e) => {
                    containerHeightRef.current = e.nativeEvent.layout.height;
                }}
                {...meterGestureHandlers}>

                {/* Canal interior del medidor (overflow estrictamente oculto) */}
                <View
                    style={[
                        styles.trackInnerChannel,
                        {
                            width: trackWidth,
                            height: trackHeight,
                            backgroundColor: isDark ? '#050914' : '#f1f5f9',
                        },
                    ]}>

                    {/* BARRAS DIAGONALES GRUESAS (fondo del canal) */}
                    <Svg width={trackWidth} height={trackHeight} style={StyleSheet.absoluteFill}>
                        <Defs>
                            <LinearGradient id={`${meterUid}_darkBgGlow`} x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0%" stopColor="#061826" stopOpacity={0.8} />
                                <Stop offset="50%" stopColor="#0b1720" stopOpacity={0.8} />
                                <Stop offset="100%" stopColor="#26060c" stopOpacity={0.8} />
                            </LinearGradient>
                        </Defs>
                        <Rect x="0" y="0" width={trackWidth} height={trackHeight} fill={isDark ? '#061826' : '#e2e8f0'} />
                        <Rect x="0" y="0" width={trackWidth} height={trackHeight} fill={`url(#${meterUid}_darkBgGlow)`} />

                        {/* Trama de barras diagonales gruesas a 35-40 grados */}
                        {Array.from({ length: stripeCount }).map((_, i) => {
                            const y = i * stripeSpacing;
                            const barColor = getBarColorByY(y);
                            // La barra se ilumina intensamente si el taco ya bajó más allá de ella
                            const isRevealed = y <= cueTranslateY + ferruleHeight + 4;
                            const opacity = isRevealed ? 0.95 : (isDark ? 0.22 : 0.35);

                            return (
                                <Line
                                    key={i}
                                    x1={-4}
                                    y1={y}
                                    x2={trackWidth - 10}
                                    y2={y - (trackWidth * 0.65)}
                                    stroke={barColor}
                                    strokeWidth={stripeStroke}
                                    strokeOpacity={opacity}
                                    strokeLinecap="round"
                                />
                            );
                        })}
                    </Svg>

                    {/* LÍNEAS DE GRADUACIÓN Y NÚMEROS INTERNOS (1 al 5) */}
                    <View style={[styles.ticksOverlay, { pointerEvents: 'none' }]}>
                        {[
                            { level: 1, topPct: 18, color: '#00d2ff' },
                            { level: 2, topPct: 36, color: '#10b981' },
                            { level: 3, topPct: 54, color: '#f59e0b' },
                            { level: 4, topPct: 72, color: '#f97316' },
                            { level: 5, topPct: 90, color: '#ef4444' },
                        ].map((item) => (
                            <View key={item.level} style={[styles.tickRowItem, { top: `${item.topPct}%` }]}>
                                {/* Tick line colored */}
                                <View style={[styles.mainTickLine, { backgroundColor: item.color }]} />
                                {/* Internal power number */}
                                <Text style={[styles.tickNumberText, { color: item.color }]}>
                                    {item.level}
                                </Text>
                            </View>
                        ))}

                        {/* Marcas intermedias sutiles */}
                        {[27, 45, 63, 81].map((pct) => (
                            <View
                                key={pct}
                                style={[
                                    styles.minorTickLine,
                                    {
                                        top: `${pct}%`,
                                        backgroundColor: isDark ? 'rgba(0, 210, 255, 0.35)' : 'rgba(0, 0, 0, 0.25)',
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* TACO CENTRADO (Desciende hasta dejar solo la puntica visible al 100%) */}
                    <View
                        style={[
                            styles.cueStickContainer,
                            {
                                left: cueLeft,
                                width: cueWidth,
                                transform: [{ translateY: cueTranslateY }],
                                pointerEvents: 'none',
                            },
                        ]}>
                        <Svg width={cueWidth} height={shaftLength + collarHeight + 8} style={{ overflow: 'hidden' }}>
                            <Defs>
                                {/* Gradiente 3D cilíndrico de la flecha de arce */}
                                <LinearGradient id={`${meterUid}_cueWood3DV2`} x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#966c3a" />
                                    <Stop offset="25%" stopColor="#cfa875" />
                                    <Stop offset="50%" stopColor="#fdf3e5" />
                                    <Stop offset="75%" stopColor="#cfa875" />
                                    <Stop offset="100%" stopColor="#875d2e" />
                                </LinearGradient>

                                {/* Virola blanca marfil */}
                                <LinearGradient id={`${meterUid}_cueFerruleWhiteV2`} x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#cbd5e1" />
                                    <Stop offset="50%" stopColor="#ffffff" />
                                    <Stop offset="100%" stopColor="#94a3b8" />
                                </LinearGradient>

                                {/* Suela de cuero con tiza azul */}
                                <LinearGradient id={`${meterUid}_cueTipLeatherV2`} x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#1e293b" />
                                    <Stop offset="50%" stopColor="#0ea5e9" />
                                    <Stop offset="100%" stopColor="#0f172a" />
                                </LinearGradient>

                                {/* Collar Venom negro */}
                                <LinearGradient id={`${meterUid}_cueCollarBlackV2`} x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#0f172a" />
                                    <Stop offset="50%" stopColor="#334155" />
                                    <Stop offset="100%" stopColor="#020617" />
                                </LinearGradient>
                            </Defs>

                            <G>
                                {/* 1. Suela de Cuero (Tip abovedado con respaldo sólido) */}
                                <Rect
                                    x={0.5}
                                    y={0}
                                    width={cueWidth - 1}
                                    height={tipHeight}
                                    rx={1}
                                    fill="#0ea5e9"
                                />
                                <Rect
                                    x={0.5}
                                    y={0}
                                    width={cueWidth - 1}
                                    height={tipHeight}
                                    rx={1}
                                    fill={`url(#${meterUid}_cueTipLeatherV2)`}
                                />

                                {/* Mira / Punto de contacto cian en la punta */}
                                <Circle
                                    cx={cueWidth / 2}
                                    cy={tipHeight / 2}
                                    r={1}
                                    fill="#00e5ff"
                                />

                                {/* 2. Virola Blanca (Ferrule con respaldo sólido) */}
                                <Rect
                                    x={0}
                                    y={tipHeight}
                                    width={cueWidth}
                                    height={ferruleHeight}
                                    fill="#e2e8f0"
                                />
                                <Rect
                                    x={0}
                                    y={tipHeight}
                                    width={cueWidth}
                                    height={ferruleHeight}
                                    fill={`url(#${meterUid}_cueFerruleWhiteV2)`}
                                    stroke="rgba(0,0,0,0.25)"
                                    strokeWidth={0.5}
                                />

                                {/* 3. Flecha de Madera (Shaft de arce con respaldo sólido) */}
                                <Rect
                                    x={0}
                                    y={tipHeight + ferruleHeight}
                                    width={cueWidth}
                                    height={shaftLength}
                                    fill="#cfa875"
                                />
                                <Rect
                                    x={0}
                                    y={tipHeight + ferruleHeight}
                                    width={cueWidth}
                                    height={shaftLength}
                                    fill={`url(#${meterUid}_cueWood3DV2)`}
                                />

                                {/* 4. Collar Venom WS en la base de la flecha */}
                                <G y={shaftLength - 12}>
                                    <Rect x={0} y={0} width={cueWidth} height={1.2} fill="#ffffff" />
                                    <Rect x={0} y={1.2} width={cueWidth} height={collarHeight - 2.4} fill="#0f172a" />
                                    <Rect x={0} y={1.2} width={cueWidth} height={collarHeight - 2.4} fill={`url(#${meterUid}_cueCollarBlackV2)`} />
                                    <Line x1={0} y1={collarHeight / 2} x2={cueWidth} y2={collarHeight / 2} stroke="#94a3b8" strokeWidth={0.8} />
                                    <Rect x={0} y={collarHeight - 1.2} width={cueWidth} height={1.2} fill="#ffffff" />
                                </G>
                            </G>
                        </Svg>
                    </View>
                </View>
            </View>

            {/* 3. Indicador de velocidad en una sola línea */}
            <View style={styles.footerContainer}>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.footerText,
                        compact && styles.footerTextCompact,
                        { color: powerLevel > 0 ? fillColor : (isDark ? '#94a3b8' : '#64748b') },
                    ]}>
                    {compact ? `V${railSpeed}` : `${language === 'en' ? 'SPD' : 'VEL'} ${railSpeed}`}
                </Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    outerContainer: {
        width: 42,
        alignItems: 'center',
        gap: 3,
        userSelect: 'none',
        overflow: 'hidden',
    },
    outerContainerCompact: {
        width: 36,
        gap: 2,
        overflow: 'hidden',
    },
    arrowHeader: {
        height: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    meterTrackBezel: {
        borderRadius: 4.5,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // Overflow estrictamente contenido
        cursor: 'ns-resize' as any,
        elevation: 4,
    },
    trackInnerChannel: {
        borderRadius: 3,
        overflow: 'hidden', // Recorta el taco y barras dentro del riel
        position: 'relative',
    },
    ticksOverlay: {
        ...StyleSheet.absoluteFill,
        overflow: 'hidden',
        zIndex: 2,
    },
    tickRowItem: {
        position: 'absolute',
        right: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: -5,
    },
    mainTickLine: {
        width: 5,
        height: 1.4,
        borderRadius: 0.5,
    },
    tickNumberText: {
        fontSize: 8.5,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    minorTickLine: {
        position: 'absolute',
        right: 8,
        width: 3,
        height: 1,
        borderRadius: 0.5,
        marginTop: -0.5,
    },
    cueStickContainer: {
        position: 'absolute',
        top: 0,
        overflow: 'hidden',
        zIndex: 3,
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.7)' }
            : {
                shadowColor: '#000000',
                shadowOpacity: 0.7,
                shadowRadius: 2.5,
                shadowOffset: { width: 0, height: 1 },
                elevation: 4,
            }),
    },
    footerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 12,
        marginTop: 2,
    },
    footerText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
    footerTextCompact: {
        fontSize: 8,
        fontWeight: '800',
    },
});
