import React, { memo } from 'react';
import { View, Text, StyleSheet, type ViewStyle, useWindowDimensions, Platform } from 'react-native';
import type { CatalogLanguage } from '@/src/infrastructure/catalog/shotAdapter';
import { BallThicknessDiagram } from './BallThicknessDiagram';
import { RailSpeedGauge } from './RailSpeedGauge';
import { AnimatedFlameBadge } from './AnimatedFlameBadge';

export interface BallTacticsVisualizerProps {
    ballThickness: number;
    effectX?: number;
    effectY?: number;
    hour?: number;
    tips?: number;
    railSpeed: number;
    categoryColor?: string;
    isDifficult?: boolean;
    isPosition?: boolean;
    isDefense?: boolean;
    lang?: CatalogLanguage;
    compact?: boolean;
    isDark?: boolean;
    style?: ViewStyle;
}

const UI_TITLES: Record<CatalogLanguage, {
    title: string;
    subtitle: string;
    position: string;
    defense: string;
    difficult: string;
}> = {
    es: {
        title: 'PARÁMETROS TÉCNICOS',
        subtitle: 'Mapeo unificado de Tome, Efecto y Potencia',
        position: 'Posición',
        defense: 'Defensa',
        difficult: 'Tiro Difícil',
    },
    en: {
        title: 'TACTICAL PARAMETERS',
        subtitle: 'Unified Ball Thickness, English & Rail Speed Mapping',
        position: 'Position',
        defense: 'Defense',
        difficult: 'Difficult Shot',
    },
    ko: {
        title: '핵심 타구 정보',
        subtitle: '두께, 당점 및 레일 스피드 통합 매핑',
        position: '포지션',
        defense: '수비',
        difficult: '난구 (어려움)',
    },
};

export const BallTacticsVisualizer = memo(function BallTacticsVisualizer({
    ballThickness,
    effectX = 0,
    effectY = 0,
    hour,
    tips,
    railSpeed,
    categoryColor = '#38BDF8',
    isDifficult = false,
    isPosition = false,
    isDefense = false,
    lang = 'es',
    compact = false,
    isDark = true,
    style,
}: BallTacticsVisualizerProps) {
    const { width } = useWindowDimensions();
    const isWide = width >= 640;
    const labels = UI_TITLES[lang] ?? UI_TITLES.es;

    return (
        <View
            style={[
                styles.container,
                compact && styles.containerCompact,
                !isDark ? { backgroundColor: '#ffffff', borderColor: categoryColor ? `${categoryColor}35` : 'rgba(0, 0, 0, 0.1)' } : null,
                categoryColor ? { borderColor: `${categoryColor}40` } : null,
                style,
            ]}
        >
            {/* Studio Header with Tactical Title and Trait Badges */}
            <View style={styles.header}>
                <View style={styles.headerTitleCol}>
                    <View style={styles.badgeRow}>
                        <View style={[styles.accentDot, { backgroundColor: categoryColor }]} />
                        <Text style={[styles.titleText, !isDark ? { color: '#0F172A' } : null]}>{labels.title}</Text>
                    </View>
                    {!compact && (
                        <Text style={[styles.subtitleText, !isDark ? { color: '#64748B' } : null]}>{labels.subtitle}</Text>
                    )}
                </View>

                {/* Trait Badges (Difficult flame, Position, Defense) */}
                <View style={styles.traitBadgesRow}>
                    {isDifficult && (
                        <AnimatedFlameBadge showLabel label={labels.difficult} size={13} />
                    )}
                    {isPosition && (
                        <View style={[styles.traitTag, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3B82F6' }]}>
                            <Text style={[styles.traitText, { color: '#60A5FA' }]}>{labels.position}</Text>
                        </View>
                    )}
                    {isDefense && (
                        <View style={[styles.traitTag, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}>
                            <Text style={[styles.traitText, { color: '#34D399' }]}>{labels.defense}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Unified Tactical Diagram: Ball Thickness + Cue Ball English in ONE View */}
            <View style={styles.diagramWrapper}>
                <BallThicknessDiagram
                    thickness={ballThickness}
                    hour={hour}
                    tips={tips}
                    effectX={effectX}
                    effectY={effectY}
                    diameter={isWide ? 66 : compact ? 52 : 62}
                    cueBallType="white"
                    objectBallType="yellow"
                    lang={lang}
                    compact={compact}
                    showLabels={true}
                    categoryColor={categoryColor}
                    isDark={isDark}
                />
            </View>

            {/* Rail Speed / Power Gauge Bar */}
            <View style={styles.speedSection}>
                <RailSpeedGauge
                    speed={railSpeed}
                    lang={lang}
                    compact={compact}
                    showLabels={true}
                    isDark={isDark}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        padding: 12,
        marginVertical: 8,
        gap: 10,
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' }
            : {
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 3,
            }),
    },
    containerCompact: {
        padding: 8,
        borderRadius: 11,
        gap: 6,
        marginVertical: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    headerTitleCol: {
        gap: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    accentDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    titleText: {
        color: '#F8FAFC',
        fontSize: 11.5,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    subtitleText: {
        color: '#64748B',
        fontSize: 10.5,
        fontWeight: '500',
    },
    traitBadgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    traitTag: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    traitText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    diagramWrapper: {
        width: '100%',
    },
    speedSection: {
        width: '100%',
    },
});

export default BallTacticsVisualizer;
