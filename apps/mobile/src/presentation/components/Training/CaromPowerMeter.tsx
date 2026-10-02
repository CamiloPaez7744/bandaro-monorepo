import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    PanResponder,
    type GestureResponderEvent,
} from 'react-native';
import Svg, { Rect, Line, Defs, LinearGradient, Stop, G, Polygon } from 'react-native-svg';
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
 * Medidor vertical de potencia estilo 8 Ball Pool:
 * - Riel ancho biselado con bordes cuadrados técnicos.
 * - Canal cromático con barras diagonales sutiles y gradiente según la potencia.
 * - Taco Venom WS centrado en medio de la barra con su virola blanca y suela.
 * - Overflow estrictamente oculto (overflow: 'hidden').
 * - Flecha superior minimalista.
 * - Líneas de graduación horizontales (1 a 4 bandas).
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

    // Dimensiones proporcionales con riel ancho y taco centrado
    const trackWidth = compact ? 22 : 26;
    const trackHeight = compact ? 134 : 176;
    const cueWidth = compact ? 6.5 : 8;
    const maxTravel = trackHeight * 0.78;

    const containerHeightRef = useRef<number>(trackHeight);
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
    const railSpeed = powerLevel <= 0 ? 1 : Math.min(5, Math.max(1, Math.ceil(powerLevel / 20)));

    // Dynamic color based on power level
    const getFillColor = (pct: number) => {
        if (pct < 35) return '#10b981'; // Esmeralda vivo
        if (pct < 65) return '#f59e0b'; // Ámbar / Oro
        if (pct < 85) return '#f97316'; // Naranja
        return '#ef4444'; // Rojo fuego
    };

    const fillColor = getFillColor(powerLevel);
    const activeArrowColor = powerLevel > 0 ? fillColor : (isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.35)');

    // Desplazamiento del taco centrado: en 0% está cerca de la parte superior (3px)
    const cueTranslateY = 3 + (Math.min(100, Math.max(0, powerLevel)) / 100) * maxTravel;

    // Altura del canal de energía revelado por encima del taco
    const fillHeight = Math.max(0, cueTranslateY + 2);

    // Barras diagonales sutiles a 45 grados dentro del canal de potencia
    const stripeSpacing = compact ? 6 : 7;
    const stripeCount = Math.ceil((trackHeight + trackWidth) / stripeSpacing);

    const a11yLabel = language === 'en'
        ? `Power: ${powerLevel}%, Speed ${railSpeed}`
        : `Potencia: ${powerLevel}%, Velocidad ${railSpeed}`;
    const a11yHint = language === 'en'
        ? 'Drag down to charge power, release to shoot'
        : 'Desliza hacia abajo para cargar potencia, suelta para tirar';

    // Dimensiones de la puntera del taco
    const ferruleHeight = compact ? 3.5 : 4.5;
    const tipHeight = 2;
    const collarHeight = compact ? 12 : 14;
    const shaftLength = trackHeight;
    const cueLeft = (trackWidth - cueWidth) / 2;

    return (
        <View
            style={[styles.outerContainer, compact && styles.outerContainerCompact]}
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel={a11yLabel}
            accessibilityHint={a11yHint}>
            {/* 1. Flecha indicadora superior */}
            <View style={styles.arrowHeader} pointerEvents="none">
                <IconArrowUp
                    size={compact ? 12 : 14}
                    color={activeArrowColor}
                    strokeWidth={2.6}
                />
            </View>

            {/* 2. Riel ancho con bisel exterior y esquinas cuadradas (borderRadius: 4-5px) */}
            <View
                style={[
                    styles.meterTrackBezel,
                    {
                        width: trackWidth + 4,
                        height: trackHeight + 4,
                        borderColor: isDragging || powerLevel > 0
                            ? fillColor
                            : (isDark ? '#334155' : '#94a3b8'),
                        backgroundColor: isDark ? '#1e293b' : '#cbd5e1',
                    },
                    (isDragging || powerLevel > 0) && {
                        shadowColor: fillColor,
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                    },
                ]}
                onLayout={(e) => {
                    containerHeightRef.current = e.nativeEvent.layout.height;
                }}
                {...panResponder.panHandlers}>

                {/* Canal interior del medidor (overflow estrictamente oculto) */}
                <View
                    style={[
                        styles.trackInnerChannel,
                        {
                            width: trackWidth,
                            height: trackHeight,
                            backgroundColor: isDark ? '#080d1a' : '#f1f5f9',
                        },
                    ]}>

                    {/* CANAL DE POTENCIA: Gradiente continuo de arriba a abajo con micro-barras diagonales */}
                    <View
                        style={[
                            styles.powerFillLayer,
                            { height: fillHeight },
                        ]}
                        pointerEvents="none">
                        <Svg width={trackWidth} height={trackHeight} style={StyleSheet.absoluteFill}>
                            <Defs>
                                {/* Gradiente cromático (Amarillo -> Ámbar -> Naranja -> Rojo) */}
                                <LinearGradient id="powerChannelGrad" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0%" stopColor="#facc15" stopOpacity="0.95" />
                                    <Stop offset="30%" stopColor="#f59e0b" stopOpacity="0.95" />
                                    <Stop offset="65%" stopColor="#f97316" stopOpacity="0.95" />
                                    <Stop offset="100%" stopColor="#ef4444" stopOpacity="0.95" />
                                </LinearGradient>
                            </Defs>

                            {/* Relleno del gradiente cromático */}
                            <Rect x="0" y="0" width={trackWidth} height={trackHeight} fill="url(#powerChannelGrad)" />

                            {/* Trama de barras diagonales a 45 grados */}
                            {Array.from({ length: stripeCount }).map((_, i) => {
                                const y = i * stripeSpacing;
                                return (
                                    <Line
                                        key={i}
                                        x1={-2}
                                        y1={y}
                                        x2={trackWidth + 2}
                                        y2={y - trackWidth}
                                        stroke="rgba(0, 0, 0, 0.22)"
                                        strokeWidth={compact ? 2 : 2.4}
                                    />
                                );
                            })}
                        </Svg>
                    </View>

                    {/* LÍNEAS DE DIVISIÓN HORIZONTALES (Marcas 1, 2, 3, 4 bandas) */}
                    <View style={styles.ticksContainer} pointerEvents="none">
                        {[25, 50, 75].map((mark) => (
                            <View
                                key={mark}
                                style={[
                                    styles.horizontalDivider,
                                    {
                                        top: `${mark}%`,
                                        backgroundColor: powerLevel >= mark
                                            ? 'rgba(0, 0, 0, 0.65)'
                                            : (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)'),
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* TACO CENTRADO EN MEDIO (deslizable hacia abajo con overflow hidden) */}
                    <View
                        style={[
                            styles.cueStickCentered,
                            {
                                left: cueLeft,
                                width: cueWidth,
                                transform: [{ translateY: cueTranslateY }],
                            },
                        ]}
                        pointerEvents="none">
                        <Svg width={cueWidth} height={shaftLength + collarHeight + 4}>
                            <Defs>
                                {/* Gradiente cilíndrico realista de madera de arce */}
                                <LinearGradient id="cueWood3D" x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#966c3a" />
                                    <Stop offset="22%" stopColor="#cfa875" />
                                    <Stop offset="50%" stopColor="#fdf3e5" />
                                    <Stop offset="78%" stopColor="#cfa875" />
                                    <Stop offset="100%" stopColor="#875d2e" />
                                </LinearGradient>

                                {/* Gradiente virola blanca marfil */}
                                <LinearGradient id="cueFerruleWhite" x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#cbd5e1" />
                                    <Stop offset="50%" stopColor="#ffffff" />
                                    <Stop offset="100%" stopColor="#94a3b8" />
                                </LinearGradient>

                                {/* Suela de cuero con tiza */}
                                <LinearGradient id="cueTipLeather" x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#1e293b" />
                                    <Stop offset="50%" stopColor="#38bdf8" />
                                    <Stop offset="100%" stopColor="#0f172a" />
                                </LinearGradient>

                                {/* Collar Venom negro */}
                                <LinearGradient id="cueCollarBlack" x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#0f172a" />
                                    <Stop offset="50%" stopColor="#334155" />
                                    <Stop offset="100%" stopColor="#020617" />
                                </LinearGradient>
                            </Defs>

                            <G>
                                {/* 1. Suela de Cuero (Tip abovedado) */}
                                <Rect
                                    x={0.5}
                                    y={0}
                                    width={cueWidth - 1}
                                    height={tipHeight}
                                    rx={1}
                                    fill="url(#cueTipLeather)"
                                />

                                {/* 2. Virola Blanca (Ferrule marfil) */}
                                <Rect
                                    x={0}
                                    y={tipHeight}
                                    width={cueWidth}
                                    height={ferruleHeight}
                                    fill="url(#cueFerruleWhite)"
                                    stroke="rgba(0,0,0,0.2)"
                                    strokeWidth={0.5}
                                />

                                {/* 3. Flecha de Madera (Shaft de arce) */}
                                <Rect
                                    x={0}
                                    y={tipHeight + ferruleHeight}
                                    width={cueWidth}
                                    height={shaftLength}
                                    fill="url(#cueWood3D)"
                                />

                                {/* 4. Collar Venom WS en la base */}
                                <G y={shaftLength - 10}>
                                    <Rect x={0} y={0} width={cueWidth} height={1} fill="#ffffff" />
                                    <Rect x={0} y={1} width={cueWidth} height={collarHeight - 2} fill="url(#cueCollarBlack)" />
                                    <Line x1={0} y1={collarHeight / 2} x2={cueWidth} y2={collarHeight / 2} stroke="#94a3b8" strokeWidth={0.8} />
                                    <Rect x={0} y={collarHeight - 1} width={cueWidth} height={1} fill="#ffffff" />
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
        width: 32,
        alignItems: 'center',
        gap: 3,
        userSelect: 'none',
        overflow: 'hidden',
    },
    outerContainerCompact: {
        width: 28,
        gap: 2,
        overflow: 'hidden',
    },
    arrowHeader: {
        height: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    meterTrackBezel: {
        borderRadius: 4.5, // Bordes cuadrados técnicos con bisel suave
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // Overflow estrictamente contenido
        cursor: 'ns-resize' as any,
        elevation: 4,
    },
    trackInnerChannel: {
        borderRadius: 3,
        overflow: 'hidden', // Recorta el taco y gradiente dentro del riel
        position: 'relative',
    },
    powerFillLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    ticksContainer: {
        ...StyleSheet.absoluteFill,
        overflow: 'hidden',
        zIndex: 2,
    },
    horizontalDivider: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1.2,
    },
    cueStickCentered: {
        position: 'absolute',
        top: 0,
        overflow: 'hidden',
        zIndex: 3,
        shadowColor: '#000000',
        shadowOpacity: 0.6,
        shadowRadius: 2.5,
        shadowOffset: { width: 0, height: 1 },
        elevation: 3,
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
