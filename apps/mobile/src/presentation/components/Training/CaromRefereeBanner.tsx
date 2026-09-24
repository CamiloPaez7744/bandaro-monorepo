import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import {
    IconTrophy,
    IconAlertTriangle,
    IconChevronDown,
    IconChevronUp,
    IconX,
} from '@/src/presentation/components/icons';
import { ShotValidation } from '@bandaro/core';

interface CaromRefereeBannerProps {
    validation: ShotValidation | null;
    isSimulating: boolean;
    cushionCountLive?: number;
    ballHitsLive?: { first: boolean; second: boolean };
    onDismiss?: () => void;
}

/**
 * HUD y Banner Oficial del Árbitro UMB de Tres Bandas.
 * - En vivo: Muestra el conteo de bandas y bolas impactadas en tiempo real.
 * - Al detenerse las bolas: Presenta el veredicto oficial. Si el usuario no interactúa,
 *   se desvanece suavemente tras ~1 segundo.
 * - Si el usuario interactúa (toca el banner o expande detalles), cancela el auto-desvanecido
 *   y permanece visible hasta que el usuario lo cierre manualmente.
 */
export const CaromRefereeBanner = React.memo(function CaromRefereeBanner({
    validation,
    isSimulating,
    cushionCountLive = 0,
    ballHitsLive = { first: false, second: false },
    onDismiss,
}: CaromRefereeBannerProps) {
    const [showDetails, setShowDetails] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasInteractedRef = useRef(false);
    const showDetailsRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        hasInteractedRef.current = hasInteracted;
    }, [hasInteracted]);

    useEffect(() => {
        showDetailsRef.current = showDetails;
    }, [showDetails]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    // Temporizador de desvanecido automático cuando aparece el veredicto
    useEffect(() => {
        // Limpiar temporizador previo
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (isSimulating || !validation) {
            // Durante la jugada o sin validación: restaurar opacidad y resetear interacciones
            fadeAnim.setValue(1);
            setShowDetails(false);
            setHasInteracted(false);
            hasInteractedRef.current = false;
            showDetailsRef.current = false;
            return;
        }

        // Nueva validación recibida
        fadeAnim.setValue(1);
        setShowDetails(false);
        setHasInteracted(false);
        hasInteractedRef.current = false;
        showDetailsRef.current = false;

        // Auto-desvanecido: ~1.2 segundos tras detenerse las bolas (1200ms para tiro inválido, 2200ms para carambola válida)
        const delay = validation.isValid ? 2200 : 1200;

        timerRef.current = setTimeout(() => {
            // Solo desvanecer si el usuario no ha interactuado ni abierto detalles
            if (!hasInteractedRef.current && !showDetailsRef.current) {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start(({ finished }) => {
                    if (finished && isMountedRef.current) {
                        onDismiss?.();
                    }
                });
            }
        }, delay);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [validation, isSimulating, fadeAnim, onDismiss]);

    // Detiene el temporizador y ancla el banner en pantalla cuando el usuario interactúa
    const cancelAutoDismissAndHold = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        fadeAnim.stopAnimation();
        fadeAnim.setValue(1);
        setHasInteracted(true);
        hasInteractedRef.current = true;
    }, [fadeAnim]);

    const handleBannerPress = useCallback(() => {
        cancelAutoDismissAndHold();
        setShowDetails((prev) => !prev);
    }, [cancelAutoDismissAndHold]);

    const handleToggleDetails = useCallback((e?: any) => {
        e?.stopPropagation?.();
        cancelAutoDismissAndHold();
        setShowDetails((prev) => !prev);
    }, [cancelAutoDismissAndHold]);

    const handleManualDismiss = useCallback((e?: any) => {
        e?.stopPropagation?.();
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished && isMountedRef.current) {
                onDismiss?.();
            }
        });
    }, [fadeAnim, onDismiss]);

    // Estado durante la simulación en vivo (HUD de conteo de bandas)
    if (isSimulating) {
        const isThirdReached = cushionCountLive >= 3;
        return (
            <View style={[styles.container, styles.simulatingContainer]}>
                <View style={styles.liveContent}>
                    {/* Contador de bandas animado */}
                    <View style={styles.cushionsLiveRow}>
                        {[1, 2, 3].map((num) => {
                            const isPassed = cushionCountLive >= num;
                            return (
                                <View
                                    key={num}
                                    style={[
                                        styles.cushionCircle,
                                        isPassed && styles.cushionCircleActive,
                                        num === 3 && isPassed && styles.cushionCircleGoal,
                                    ]}>
                                    <Text
                                        style={[
                                            styles.cushionCircleText,
                                            isPassed && styles.cushionCircleTextActive,
                                        ]}>
                                        {num}ª
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    <Text style={styles.liveLabel}>
                        {isThirdReached
                            ? '¡3 BANDAS TOCADAS! 🎯'
                            : `Esperando bandas (${cushionCountLive}/3)`}
                    </Text>

                    {/* Indicador de bolas tocadas */}
                    <View style={styles.ballsHitRow}>
                        <View
                            style={[
                                styles.ballHitDot,
                                ballHitsLive.first && styles.ballHitDotActive,
                            ]}
                        />
                        <Text style={styles.ballHitText}>Bola 1</Text>
                        <View
                            style={[
                                styles.ballHitDot,
                                ballHitsLive.second && styles.ballHitDotActive,
                            ]}
                        />
                        <Text style={styles.ballHitText}>Bola 2</Text>
                    </View>
                </View>
            </View>
        );
    }

    // Si no hay validación, no se muestra nada
    if (!validation) return null;

    const isValid = validation.isValid;
    const hasTimeline = Boolean(validation.scoringDetails?.eventTimeline?.length);

    return (
        <Animated.View
            style={[
                styles.container,
                isValid ? styles.validContainer : styles.foulContainer,
                { opacity: fadeAnim },
            ]}>
            <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleBannerPress}
                style={styles.touchableWrapper}>
                <View style={styles.mainRow}>
                    <View style={styles.iconBadge}>
                        {isValid ? (
                            <IconTrophy size={18} color="#22c55e" />
                        ) : (
                            <IconAlertTriangle size={18} color="#ef4444" />
                        )}
                    </View>

                    <View style={styles.textContainer}>
                        <View style={styles.verdictHeaderRow}>
                            <Text
                                style={[
                                    styles.verdictTitle,
                                    { color: isValid ? '#4ade80' : '#f87171' },
                                ]}>
                                {isValid ? '¡CARAMBOLA VÁLIDA! (+1)' : 'TIRO NO VÁLIDO'}
                            </Text>
                            {!hasInteracted && (
                                <Text style={styles.autoDismissHint}>
                                    • Toca para ver detalles
                                </Text>
                            )}
                        </View>
                        <Text
                            style={styles.classificationLabel}
                            numberOfLines={showDetails ? undefined : 1}>
                            {validation.classificationLabel}
                        </Text>
                    </View>

                    <View style={styles.actionButtonsRow}>
                        {hasTimeline && (
                            <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={handleToggleDetails}
                                activeOpacity={0.7}
                                accessibilityLabel={showDetails ? 'Ocultar detalles' : 'Ver detalles'}>
                                {showDetails ? (
                                    <IconChevronUp size={16} color="#94a3b8" />
                                ) : (
                                    <IconChevronDown size={16} color="#94a3b8" />
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={handleManualDismiss}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Cerrar veredicto">
                            <IconX size={15} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Desglose cronológico de eventos si está expandido */}
            {showDetails && validation.scoringDetails?.eventTimeline && (
                <View style={styles.detailsBox}>
                    <View style={styles.detailsHeader}>
                        <Text style={styles.detailsTitle}>Cronología Oficial de Contactos:</Text>
                        <TouchableOpacity
                            style={styles.closeDetailsPill}
                            onPress={handleManualDismiss}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <IconX size={12} color="#94a3b8" />
                            <Text style={styles.closeDetailsPillText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                    {validation.scoringDetails.eventTimeline.map((item, idx) => (
                        <View key={idx} style={styles.timelineItem}>
                            <View
                                style={[
                                    styles.timelineDot,
                                    item.type === 'cushion'
                                        ? styles.timelineDotCushion
                                        : styles.timelineDotBall,
                                ]}
                            />
                            <Text style={styles.timelineText}>{item.description}</Text>
                        </View>
                    ))}
                    {Boolean(validation.reason) && (
                        <Text style={styles.reasonText}>{validation.reason}</Text>
                    )}
                </View>
            )}
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 520,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1.5,
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 8,
    },
    simulatingContainer: {
        borderColor: 'rgba(56, 189, 248, 0.4)',
    },
    validContainer: {
        borderColor: 'rgba(34, 197, 94, 0.65)',
        backgroundColor: 'rgba(5, 46, 22, 0.92)',
    },
    foulContainer: {
        borderColor: 'rgba(239, 68, 68, 0.65)',
        backgroundColor: 'rgba(69, 10, 10, 0.92)',
    },
    touchableWrapper: {
        width: '100%',
    },
    liveContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    cushionsLiveRow: {
        flexDirection: 'row',
        gap: 4,
    },
    cushionCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cushionCircleActive: {
        backgroundColor: '#0284c7',
        borderColor: '#38bdf8',
    },
    cushionCircleGoal: {
        backgroundColor: '#16a34a',
        borderColor: '#4ade80',
    },
    cushionCircleText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
    },
    cushionCircleTextActive: {
        color: '#ffffff',
    },
    liveLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#f8fafc',
    },
    ballsHitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ballHitDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    ballHitDotActive: {
        backgroundColor: '#facc15',
    },
    ballHitText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#94a3b8',
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    verdictHeaderRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: 6,
    },
    verdictTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    autoDismissHint: {
        fontSize: 10,
        color: 'rgba(203, 213, 225, 0.75)',
        fontStyle: 'italic',
    },
    classificationLabel: {
        fontSize: 11,
        color: '#cbd5e1',
        fontWeight: '500',
        marginTop: 1,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
    },
    detailsBox: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        gap: 4,
    },
    detailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    detailsTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    closeDetailsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    closeDetailsPillText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#cbd5e1',
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timelineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    timelineDotCushion: {
        backgroundColor: '#38bdf8',
    },
    timelineDotBall: {
        backgroundColor: '#facc15',
    },
    timelineText: {
        fontSize: 11,
        color: '#e2e8f0',
    },
    reasonText: {
        fontSize: 10,
        color: '#94a3b8',
        fontStyle: 'italic',
        marginTop: 4,
    },
});
