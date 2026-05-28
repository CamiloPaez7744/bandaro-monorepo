import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { BilliardsTableThumbnail } from '@/src/presentation/components/Training/BilliardsTableThumbnail';
import { TRAINING_SYSTEMS, type TrainingSystem } from '@/src/presentation/screens/Training/trainingData';

const difficultyColor = {
    basic: '#22c55e',
    intermediate: '#f59e0b',
    advanced: '#ef4444',
} as const;

export function TrainingCatalogScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { t } = useI18n();
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);
    const isWideScreen = width >= 960;
    const cardWidth = isWideScreen ? 320 : '100%';

    const onOpenSystem = (system: TrainingSystem) => {
        router.push({ pathname: '/training/[systemId]', params: { systemId: system.id } });
    };

    return (
        <ScrollView
            contentContainerStyle={[
                styles.container,
                {
                    paddingTop: theme.spacing.md + insets.top,
                    paddingBottom: theme.spacing.lg + insets.bottom + 24,
                },
            ]}>
            <View style={styles.heroCard}>
                <Text style={styles.heroTag}>{t('training.catalog.tag')}</Text>
                <Text style={styles.title}>{t('training.catalog.title')}</Text>
                <Text style={styles.subtitle}>{t('training.catalog.subtitle')}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t('training.catalog.systems')}</Text>

            <View style={styles.grid}>
                {TRAINING_SYSTEMS.map((system) => (
                    <TouchableOpacity
                        key={system.id}
                        style={[styles.systemCard, { width: cardWidth }]}
                        activeOpacity={0.9}
                        onPress={() => onOpenSystem(system)}>
                        <View style={styles.cardTop}>
                            <BilliardsTableThumbnail
                                orientation="horizontal"
                                style={styles.preview}
                                balls={[
                                    { id: 'white', x: system.positions[0].white.x, y: system.positions[0].white.y, color: '#f8fafc', border: '#cbd5e1' },
                                    { id: 'yellow', x: system.positions[0].yellow.x, y: system.positions[0].yellow.y, color: '#facc15', border: '#ca8a04' },
                                    { id: 'red', x: system.positions[0].red.x, y: system.positions[0].red.y, color: '#dc2626', border: '#991b1b' },
                                ]}
                                path={system.positions[0].trajectory}
                            />
                            <View style={styles.previewBadge}>
                                <Text style={styles.previewBadgeText}>{t('training.catalog.tapToStart')}</Text>
                            </View>
                        </View>

                        <View style={styles.cardBody}>
                            <View style={styles.systemHeader}>
                                <View style={styles.headerCopy}>
                                    <Text style={styles.heroLabel}>{system.focus}</Text>
                                    <Text style={styles.systemName}>{system.name}</Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: `${difficultyColor[system.difficulty]}22` }]}>
                                    <Text style={[styles.badgeText, { color: difficultyColor[system.difficulty] }]}>
                                        {t(`training.difficulty.${system.difficulty}`)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.systemSubtitle}>{system.subtitle}</Text>

                            <Text style={styles.systemFocus}>{system.focus}</Text>

                            <View style={styles.metaRow}>
                                <View style={styles.metaChip}>
                                    <Text style={styles.metaLabel}>Tiro</Text>
                                    <Text style={styles.metaValue}>{system.recommendedPower}%</Text>
                                </View>
                                <View style={styles.metaChip}>
                                    <Text style={styles.metaLabel}>Posiciones</Text>
                                    <Text style={styles.metaValue}>{system.positions.length}</Text>
                                </View>
                            </View>

                            <View style={styles.rulesWrap}>
                                {system.rules.map((rule) => (
                                    <Text key={`${system.id}-${rule}`} style={styles.ruleText}>
                                        • {rule}
                                    </Text>
                                ))}
                            </View>

                            <View style={styles.actionButton}>
                                <Text style={styles.actionButtonText}>{t('training.catalog.tapToStart')}</Text>
                                <Text style={styles.footerArrow}>→</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
    StyleSheet.create({
        container: {
            backgroundColor: palette.background,
            paddingHorizontal: theme.spacing.md,
            gap: theme.spacing.md,
            minHeight: '100%',
        },
        heroCard: {
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: `${palette.primary}55`,
            padding: theme.spacing.md,
            backgroundColor: palette.card,
            gap: 8,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
            elevation: 5,
        },
        heroTag: {
            alignSelf: 'flex-start',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 4,
            backgroundColor: `${palette.primary}22`,
            color: palette.primary,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
        },
        title: {
            color: palette.text,
            fontSize: 28,
            fontWeight: '900',
        },
        subtitle: {
            color: palette.muted,
            fontSize: 14,
            lineHeight: 20,
        },
        sectionTitle: {
            color: palette.text,
            fontSize: 18,
            fontWeight: '800',
        },
        grid: {
            gap: theme.spacing.md,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'stretch',
        },
        systemCard: {
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.card,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.16,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 4,
        },
    cardTop: {
        borderRadius: 0,
        overflow: 'hidden',
    },
        cardBody: {
            padding: theme.spacing.md,
            gap: 10,
            overflow: 'hidden',
        },
    preview: {
        width: '100%',
    },
        previewBadge: {
            position: 'absolute',
            left: 12,
            top: 12,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
        },
        previewBadgeText: {
            color: '#f8fafc',
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        systemHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
        },
        headerCopy: {
            flex: 1,
            gap: 4,
        },
        heroLabel: {
            color: palette.primary,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        systemName: {
            color: palette.text,
            fontSize: 20,
            fontWeight: '800',
            flexShrink: 1,
        },
        badge: {
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        badgeText: {
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
        },
        systemSubtitle: {
            color: palette.muted,
            fontSize: 13,
            fontWeight: '600',
        },
        systemFocus: {
            color: palette.text,
            fontSize: 14,
            lineHeight: 20,
        },
        metaRow: {
            flexDirection: 'row',
            gap: 8,
        },
        metaChip: {
            flex: 1,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: `${palette.primary}10`,
            borderWidth: 1,
            borderColor: `${palette.primary}18`,
        },
        metaLabel: {
            color: palette.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
        },
        metaValue: {
            color: palette.text,
            fontSize: 13,
            fontWeight: '800',
            marginTop: 2,
        },
        rulesWrap: {
            gap: 4,
        },
        ruleText: {
            color: palette.muted,
            fontSize: 13,
        },
        actionButton: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            borderRadius: 999,
            paddingVertical: 12,
            backgroundColor: palette.primary,
            marginTop: 4,
        },
        actionButtonText: {
            color: '#fff',
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: 0.3,
        },
        footerArrow: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '900',
        },
    });
