import React, { memo } from 'react';
import { View, Text, StyleSheet, type ViewStyle, Platform } from 'react-native';
import type { CatalogLanguage } from '@/src/infrastructure/catalog/shotAdapter';

export interface RailSpeedGaugeProps {
    /** Rail speed count (0 to 5) */
    speed: number;
    /** Current language */
    lang?: CatalogLanguage;
    /** Compact mode */
    compact?: boolean;
    /** Show labels */
    showLabels?: boolean;
    /** Dark or light theme */
    isDark?: boolean;
    /** Additional style */
    style?: ViewStyle;
}

const SEGMENT_COLORS = [
    '#38BDF8', // 1: Ice Cyan (Suave)
    '#10B981', // 2: Emerald Green (Medio-suave)
    '#F59E0B', // 3: Golden Amber (Medio-fuerte)
    '#F97316', // 4: Vibrant Orange (Fuerte)
    '#EF4444', // 5: Crimson Flame (Máxima aceleración)
];

const SPEED_LABELS: Record<CatalogLanguage, Record<number, string>> = {
    es: {
        0: 'Toque Mínimo',
        1: 'Suave (1 Banda)',
        2: 'Medio-Suave (2 Bandas)',
        3: 'Medio (3 Bandas)',
        4: 'Fuerte (4 Bandas)',
        5: 'Máxima Potencia (5+)',
    },
    en: {
        0: 'Soft Touch',
        1: 'Gentle (1 Rail)',
        2: 'Medium-Soft (2 Rails)',
        3: 'Medium (3 Rails)',
        4: 'Strong (4 Rails)',
        5: 'Maximum Power (5+)',
    },
    ko: {
        0: '소프트 터치',
        1: '부드럽게 (1쿠션)',
        2: '중약 (2쿠션)',
        3: '보통 (3쿠션)',
        4: '강하게 (4쿠션)',
        5: '풀 파워 (5쿠션+)',
    },
};

export const RailSpeedGauge = memo(function RailSpeedGauge({
    speed,
    lang = 'es',
    compact = false,
    showLabels = true,
    isDark = true,
    style,
}: RailSpeedGaugeProps) {
    const clampedSpeed = Math.max(0, Math.min(5, Math.round(speed * 2) / 2));
    const wholeSpeed = Math.min(5, Math.max(0, Math.round(clampedSpeed)));
    const activeColor = SEGMENT_COLORS[Math.max(0, Math.min(4, wholeSpeed - 1))] ?? '#38BDF8';

    const unitText = lang === 'en' ? 'Rails' : lang === 'ko' ? '레일' : 'Bandas';
    const titleText = lang === 'en' ? 'RAIL SPEED' : lang === 'ko' ? '레일 스피드' : 'VELOCIDAD / BANDAS';
    const speedLabel = SPEED_LABELS[lang][wholeSpeed] ?? `${clampedSpeed} ${unitText}`;

    return (
        <View
            style={[
                styles.card,
                compact && styles.cardCompact,
                !isDark ? { backgroundColor: '#ffffff', borderColor: 'rgba(0, 0, 0, 0.1)' } : null,
                style,
            ]}
        >
            {showLabels && (
                <View style={styles.header}>
                    <Text style={[styles.labelTitle, !isDark ? { color: '#64748B' } : null]}>{titleText}</Text>
                    <View style={[styles.speedPill, { borderColor: `${activeColor}60`, backgroundColor: `${activeColor}1A` }]}>
                        <Text style={[styles.speedPillText, { color: activeColor }]}>
                            {clampedSpeed} {unitText}
                        </Text>
                    </View>
                </View>
            )}

            {/* Segmented LED Power Bar */}
            <View style={styles.barContainer}>
                {[1, 2, 3, 4, 5].map((level) => {
                    const isFilled = clampedSpeed >= level;
                    const isHalf = !isFilled && clampedSpeed >= level - 0.5;
                    const segColor = SEGMENT_COLORS[level - 1];

                    return (
                        <View
                            key={level}
                            style={[
                                styles.segmentTrack,
                                !isDark ? { backgroundColor: 'rgba(0, 0, 0, 0.06)', borderColor: 'rgba(0, 0, 0, 0.08)' } : null,
                            ]}
                        >
                            {isFilled && (
                                <View
                                    style={[
                                        styles.segmentFill,
                                        {
                                            backgroundColor: segColor,
                                            ...(Platform.OS === 'web'
                                                ? { boxShadow: `0 0 6px ${segColor}80` }
                                                : {
                                                    shadowColor: segColor,
                                                    shadowOpacity: 0.5,
                                                    shadowRadius: 4,
                                                }),
                                        },
                                    ]}
                                />
                            )}
                            {isHalf && (
                                <View
                                    style={[
                                        styles.segmentHalf,
                                        {
                                            backgroundColor: segColor,
                                            ...(Platform.OS === 'web'
                                                ? { boxShadow: `0 0 4px ${segColor}60` }
                                                : {
                                                    shadowColor: segColor,
                                                    shadowOpacity: 0.35,
                                                    shadowRadius: 3,
                                                }),
                                        },
                                    ]}
                                />
                            )}
                        </View>
                    );
                })}
            </View>

            {/* Tick numbers under segments */}
            <View style={styles.numbersRow}>
                {[1, 2, 3, 4, 5].map((num) => (
                    <Text
                        key={num}
                        style={[
                            styles.numText,
                            num <= wholeSpeed && { color: SEGMENT_COLORS[num - 1], fontWeight: '700' },
                        ]}
                    >
                        {num}
                    </Text>
                ))}
            </View>

            {showLabels && (
                <View style={[styles.footer, !isDark ? { borderTopColor: 'rgba(0, 0, 0, 0.08)' } : null]}>
                    <Text style={[styles.footerText, !isDark ? { color: '#0F172A' } : null]}>{speedLabel}</Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    cardCompact: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    labelTitle: {
        color: '#94A3B8',
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    speedPill: {
        borderWidth: 1,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
    },
    speedPillText: {
        fontSize: 11,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    barContainer: {
        flexDirection: 'row',
        gap: 5,
        height: 14,
        width: '100%',
        alignItems: 'center',
    },
    segmentTrack: {
        flex: 1,
        height: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 3,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    segmentFill: {
        width: '100%',
        height: '100%',
        borderRadius: 2,
    },
    segmentHalf: {
        width: '50%',
        height: '100%',
        borderRadius: 2,
    },
    numbersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
        marginTop: 4,
    },
    numText: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '500',
        fontVariant: ['tabular-nums'],
    },
    footer: {
        marginTop: 6,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
    },
    footerText: {
        color: '#CBD5E1',
        fontSize: 11,
        fontWeight: '600',
    },
});

export default RailSpeedGauge;
