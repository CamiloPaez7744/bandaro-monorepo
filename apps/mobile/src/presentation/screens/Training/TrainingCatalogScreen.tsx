import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { TRAINING_SYSTEMS, type TrainingSystem } from '@/src/presentation/screens/Training/trainingData';

const difficultyColor = {
    basic: '#22c55e',
    intermediate: '#f59e0b',
    advanced: '#ef4444',
} as const;

export function TrainingCatalogScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);

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
                        style={styles.systemCard}
                        activeOpacity={0.9}
                        onPress={() => onOpenSystem(system)}>
                        <View style={styles.systemHeader}>
                            <Text style={styles.systemName}>{system.name}</Text>
                            <View style={[styles.badge, { backgroundColor: `${difficultyColor[system.difficulty]}22` }]}>
                                <Text style={[styles.badgeText, { color: difficultyColor[system.difficulty] }]}>
                                    {t(`training.difficulty.${system.difficulty}`)}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.systemSubtitle}>{system.subtitle}</Text>
                        <Text style={styles.systemFocus}>{system.focus}</Text>

                        <View style={styles.rulesWrap}>
                            {system.rules.map((rule) => (
                                <Text key={`${system.id}-${rule}`} style={styles.ruleText}>
                                    • {rule}
                                </Text>
                            ))}
                        </View>

                        <View style={styles.footerRow}>
                            <Text style={styles.footerHint}>{t('training.catalog.tapToStart')}</Text>
                            <Text style={styles.footerArrow}>→</Text>
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
        },
        systemCard: {
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.card,
            padding: theme.spacing.md,
            gap: 10,
        },
        systemHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
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
        rulesWrap: {
            gap: 4,
        },
        ruleText: {
            color: palette.muted,
            fontSize: 13,
        },
        footerRow: {
            marginTop: 6,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        footerHint: {
            color: palette.primary,
            fontSize: 12,
            fontWeight: '700',
        },
        footerArrow: {
            color: palette.primary,
            fontSize: 18,
            fontWeight: '900',
        },
    });
