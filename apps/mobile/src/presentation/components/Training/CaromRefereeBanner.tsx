import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import {
    IconTrophy,
    IconAlertTriangle,
    IconCheck,
    IconInfoCircle,
    IconChevronDown,
    IconChevronUp,
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
 * Muestra el conteo de bandas en tiempo real durante la jugada y el veredicto final.
 */
export const CaromRefereeBanner = React.memo(function CaromRefereeBanner({
    validation,
    isSimulating,
    cushionCountLive = 0,
    ballHitsLive = { first: false, second: false },
    onDismiss,
}: CaromRefereeBannerProps) {
    const [showDetails, setShowDetails] = useState(false);

    // Estado durante la simulación en vivo
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

    return (
        <View style={[styles.container, isValid ? styles.validContainer : styles.foulContainer]}>
            <View style={styles.mainRow}>
                <View style={styles.iconBadge}>
                    {isValid ? (
                        <IconTrophy size={18} color="#22c55e" />
                    ) : (
                        <IconAlertTriangle size={18} color="#ef4444" />
                    )}
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.verdictTitle, { color: isValid ? '#4ade80' : '#f87171' }]}>
                        {isValid ? '¡CARAMBOLA VÁLIDA! (+1)' : 'TIRO NO VÁLIDO'}
                    </Text>
                    <Text style={styles.classificationLabel} numberOfLines={1}>
                        {validation.classificationLabel}
                    </Text>
                </View>

                {validation.scoringDetails?.eventTimeline?.length > 0 && (
                    <TouchableOpacity
                        style={styles.detailsToggleBtn}
                        onPress={() => setShowDetails((prev) => !prev)}
                        activeOpacity={0.7}>
                        {showDetails ? (
                            <IconChevronUp size={16} color="#94a3b8" />
                        ) : (
                            <IconChevronDown size={16} color="#94a3b8" />
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Desglose cronológico de eventos si está expandido */}
            {showDetails && validation.scoringDetails?.eventTimeline && (
                <View style={styles.detailsBox}>
                    <Text style={styles.detailsTitle}>Cronología Oficial de Contactos:</Text>
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
                    <Text style={styles.reasonText}>{validation.reason}</Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 500,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1.5,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    simulatingContainer: {
        borderColor: 'rgba(56, 189, 248, 0.4)',
    },
    validContainer: {
        borderColor: 'rgba(34, 197, 94, 0.6)',
        backgroundColor: 'rgba(5, 46, 22, 0.88)',
    },
    foulContainer: {
        borderColor: 'rgba(239, 68, 68, 0.6)',
        backgroundColor: 'rgba(69, 10, 10, 0.88)',
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
    verdictTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    classificationLabel: {
        fontSize: 11,
        color: '#cbd5e1',
        fontWeight: '500',
        marginTop: 1,
    },
    detailsToggleBtn: {
        padding: 6,
    },
    detailsBox: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        gap: 4,
    },
    detailsTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 2,
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
