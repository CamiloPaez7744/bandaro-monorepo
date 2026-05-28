import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { BilliardsTableThumbnail } from '@/src/presentation/components/Training/BilliardsTableThumbnail';
import {
    CONTACT_PRESETS,
    EFFECT_PRESETS,
    getTrainingSystemById,
    type Point2D,
    type ContactKey,
    type EffectKey,
} from '@/src/presentation/screens/Training/trainingData';

type Orientation = 'horizontal' | 'vertical';

export function TrainingSystemScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ systemId: string }>();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { t } = useI18n();
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);
    const defaultOrientation: Orientation = width >= 900 ? 'horizontal' : 'vertical';

    const system = useMemo(() => (params.systemId ? getTrainingSystemById(params.systemId) : null), [params.systemId]);

    const [positionIndex, setPositionIndex] = useState(0);
    const [showSolution, setShowSolution] = useState(false);
    const [selectedEffect, setSelectedEffect] = useState<EffectKey>(system?.recommendedEffect ?? 'center');
    const [selectedContact, setSelectedContact] = useState<ContactKey>('1/2');
    const [tableOrientation, setTableOrientation] = useState<Orientation>(defaultOrientation);

    useEffect(() => {
        setTableOrientation(defaultOrientation);
    }, [defaultOrientation]);

    if (!system) {
        return (
            <View style={[styles.notFound, { paddingTop: insets.top + theme.spacing.lg }]}>
                <Text style={styles.notFoundTitle}>{t('training.system.notFound')}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{t('training.system.back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const position = system.positions[positionIndex];
    const effect = EFFECT_PRESETS[selectedEffect];
    const contact = CONTACT_PRESETS[selectedContact];
    const suggestedPower = Math.round((effect.power + system.recommendedPower) / 2);
    const aimPoint = position.trajectory[1] ?? position.white;
    const pathEnd = position.trajectory.at(-1) ?? position.white;
    const halfWay = (from: Point2D, to: Point2D): Point2D => ({
        x: from.x + (to.x - from.x) * 0.5,
        y: from.y + (to.y - from.y) * 0.5,
    });
    const solutionPaths = [
        {
            id: `${position.id}-white`,
            points: position.trajectory,
            color: '#f8fafc',
            width: 2.4,
            dash: [8, 8],
        },
        {
            id: `${position.id}-yellow`,
            points: [position.yellow, halfWay(position.yellow, aimPoint), halfWay(position.yellow, pathEnd), pathEnd],
            color: '#facc15',
            width: 1.7,
            dash: [5, 7],
            opacity: 0.9,
        },
        {
            id: `${position.id}-red`,
            points: [position.red, halfWay(position.red, position.white), halfWay(position.red, aimPoint)],
            color: '#ef4444',
            width: 1.7,
            dash: [5, 7],
            opacity: 0.9,
        },
    ];
    const stageBalls = [
        { id: 'white', x: position.white.x, y: position.white.y, color: '#f8fafc', border: '#cbd5e1' },
        { id: 'yellow', x: position.yellow.x, y: position.yellow.y, color: '#facc15', border: '#ca8a04' },
        { id: 'red', x: position.red.x, y: position.red.y, color: '#dc2626', border: '#991b1b' },
    ] as const;

    return (
        <ScrollView
            contentContainerStyle={[
                styles.container,
                {
                    paddingTop: insets.top + theme.spacing.md,
                    paddingBottom: insets.bottom + theme.spacing.lg + 24,
                },
            ]}>
            <View style={styles.headerRow}>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>{system.name}</Text>
                    <Text style={styles.subtitle}>{system.subtitle}</Text>
                </View>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Text style={styles.headerButtonText}>{t('training.system.back')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.focusCard}>
                <Text style={styles.focusTitle}>{t('training.system.focus')}</Text>
                <Text style={styles.focusText}>{system.focus}</Text>
            </View>

            <View style={styles.tableCard}>
                <View style={styles.tableHeaderRow}>
                    <Text style={styles.cardTitle}>{t('training.system.table')}</Text>
                    <TouchableOpacity style={styles.orientationButton} onPress={() => setTableOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))}>
                        <Text style={styles.orientationButtonLabel}>Mesa</Text>
                        <Text style={styles.orientationButtonValue}>{tableOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tableWrap}>
                    <BilliardsTableThumbnail
                        orientation={tableOrientation}
                        style={styles.tableStage}
                        balls={stageBalls as unknown as Array<{ id: 'white' | 'yellow' | 'red'; x: number; y: number; color: string; border: string }>}
                        aim={{ from: position.white, to: aimPoint, color: '#fbbf24' }}
                        paths={showSolution ? solutionPaths : [{ id: `${position.id}-aim`, points: [position.white, aimPoint], color: '#fbbf24', width: 2.2, dash: [3, 7], opacity: 0.95 }]}
                        showZones
                    />
                </View>

                <View style={styles.legendRow}>
                    <View style={styles.legendChip}>
                        <Text style={styles.legendLabel}>Ruta</Text>
                        <Text style={styles.legendValue}>{position.trajectory.length - 1} tramos</Text>
                    </View>
                    <View style={styles.legendChip}>
                        <Text style={styles.legendLabel}>Solución</Text>
                        <Text style={styles.legendValue}>{showSolution ? 'Visible' : 'Oculta'}</Text>
                    </View>
                    <View style={styles.legendChip}>
                        <Text style={styles.legendLabel}>Bandas</Text>
                        <Text style={styles.legendValue}>3+ rebotes</Text>
                    </View>
                </View>

                <View style={styles.positionControls}>
                    <TouchableOpacity
                        style={[styles.smallButton, positionIndex === 0 && styles.smallButtonDisabled]}
                        disabled={positionIndex === 0}
                        onPress={() => setPositionIndex((prev) => Math.max(0, prev - 1))}>
                        <Text style={styles.smallButtonText}>{t('training.system.prev')}</Text>
                    </TouchableOpacity>

                    <Text style={styles.positionCounter}>
                        {t('training.system.position', { current: positionIndex + 1, total: system.positions.length })}
                    </Text>

                    <TouchableOpacity
                        style={[styles.smallButton, positionIndex >= system.positions.length - 1 && styles.smallButtonDisabled]}
                        disabled={positionIndex >= system.positions.length - 1}
                        onPress={() => setPositionIndex((prev) => Math.min(system.positions.length - 1, prev + 1))}>
                        <Text style={styles.smallButtonText}>{t('training.system.next')}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.solutionButton} onPress={() => setShowSolution((prev) => !prev)}>
                    <Text style={styles.solutionButtonText}>
                        {showSolution ? t('training.system.hideSolution') : t('training.system.showSolution')}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.dualSection}>
                <View style={styles.cardHalf}>
                    <Text style={styles.cardTitle}>{t('training.system.effect')}</Text>
                    <View style={styles.effectBoard}>
                        <View style={styles.effectBall} />
                        {(Object.keys(EFFECT_PRESETS) as EffectKey[]).map((key) => {
                            const preset = EFFECT_PRESETS[key];
                            const selected = selectedEffect === key;
                            return (
                                <Pressable
                                    key={key}
                                    style={[
                                        styles.effectPoint,
                                        {
                                            left: `${preset.x}%`,
                                            top: `${preset.y}%`,
                                            backgroundColor: selected ? '#fbbf24' : '#1d8fd8',
                                            borderColor: selected ? '#f59e0b' : '#93c5fd',
                                        },
                                    ]}
                                    onPress={() => setSelectedEffect(key)}
                                />
                            );
                        })}
                    </View>
                    <Text style={styles.selectorTitle}>{effect.label}</Text>
                    <Text style={styles.selectorSubtitle}>{effect.description}</Text>
                </View>

                <View style={styles.cardHalf}>
                    <Text style={styles.cardTitle}>{t('training.system.contact')}</Text>
                    <View style={styles.contactWrap}>
                        {(Object.keys(CONTACT_PRESETS) as ContactKey[]).map((key) => {
                            const selected = selectedContact === key;
                            return (
                                <Pressable
                                    key={key}
                                    style={[styles.contactButton, selected && styles.contactButtonSelected]}
                                    onPress={() => setSelectedContact(key)}>
                                    <Text style={[styles.contactButtonText, selected && styles.contactButtonTextSelected]}>{key}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <Text style={styles.selectorTitle}>{contact.label}</Text>
                    <Text style={styles.selectorSubtitle}>{contact.description}</Text>
                </View>
            </View>

            <View style={styles.recommendationCard}>
                <Text style={styles.cardTitle}>{t('training.system.recommendation')}</Text>
                <Text style={styles.recommendationText}>{t('training.system.recommendedPower', { power: suggestedPower })}</Text>
                <Text style={styles.recommendationSub}>{t('training.system.rules')}</Text>
                {system.rules.map((rule) => (
                    <Text key={`${system.id}-rule-${rule}`} style={styles.ruleText}>
                        • {rule}
                    </Text>
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
        notFound: {
            flex: 1,
            backgroundColor: palette.background,
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: theme.spacing.md,
        },
        notFoundTitle: {
            color: palette.text,
            fontSize: 20,
            fontWeight: '800',
        },
        backButton: {
            borderRadius: theme.radius.md,
            backgroundColor: palette.primary,
            paddingVertical: 10,
            paddingHorizontal: 16,
        },
        backButtonText: {
            color: '#fff',
            fontWeight: '800',
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
        },
        headerTextWrap: {
            flexShrink: 1,
        },
        title: {
            color: palette.text,
            fontSize: 26,
            fontWeight: '900',
        },
        subtitle: {
            marginTop: 2,
            color: palette.muted,
            fontSize: 13,
            lineHeight: 18,
        },
        headerButton: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: palette.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: palette.card,
        },
        headerButtonText: {
            color: palette.text,
            fontSize: 12,
            fontWeight: '700',
        },
        focusCard: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.md,
            gap: 4,
        },
        focusTitle: {
            color: palette.primary,
            fontSize: 12,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        focusText: {
            color: palette.text,
            fontSize: 15,
            fontWeight: '600',
        },
        tableCard: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.md,
            gap: 12,
        },
        tableHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        cardTitle: {
            color: palette.text,
            fontSize: 16,
            fontWeight: '800',
        },
        orientationButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: `${palette.primary}12`,
            borderWidth: 1,
            borderColor: `${palette.primary}22`,
        },
        orientationButtonLabel: {
            color: palette.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
        },
        orientationButtonValue: {
            color: palette.primary,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
        },
    tableWrap: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    tableStage: {
        width: '100%',
    },
        legendRow: {
            flexDirection: 'row',
            gap: 8,
        },
        legendChip: {
            flex: 1,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: `${palette.primary}10`,
            borderWidth: 1,
            borderColor: `${palette.primary}18`,
        },
        legendLabel: {
            color: palette.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
        },
        legendValue: {
            color: palette.text,
            fontSize: 13,
            fontWeight: '800',
            marginTop: 2,
        },
        positionControls: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
        },
        smallButton: {
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: `${palette.primary}22`,
        },
        smallButtonDisabled: {
            opacity: 0.4,
        },
        smallButtonText: {
            color: palette.primary,
            fontWeight: '800',
            fontSize: 12,
        },
        positionCounter: {
            color: palette.muted,
            fontSize: 12,
            fontWeight: '700',
        },
        solutionButton: {
            borderRadius: 12,
            backgroundColor: palette.primary,
            paddingVertical: 11,
            alignItems: 'center',
        },
        solutionButtonText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: '800',
        },
        dualSection: {
            gap: theme.spacing.md,
        },
        cardHalf: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.md,
            gap: 10,
        },
        effectBoard: {
            width: 170,
            height: 170,
            alignSelf: 'center',
            borderRadius: 85,
            borderWidth: 1,
            borderColor: '#cbd5e1',
            backgroundColor: '#f8fafc',
            position: 'relative',
            overflow: 'hidden',
        },
        effectBall: {
            position: 'absolute',
            left: 15,
            top: 15,
            right: 15,
            bottom: 15,
            borderRadius: 80,
            borderWidth: 1,
            borderColor: '#dbeafe',
        },
        effectPoint: {
            position: 'absolute',
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            transform: [{ translateX: -11 }, { translateY: -11 }],
        },
        selectorTitle: {
            color: palette.text,
            fontSize: 14,
            fontWeight: '700',
            textAlign: 'center',
        },
        selectorSubtitle: {
            color: palette.muted,
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 18,
        },
        contactWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        contactButton: {
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: palette.background,
        },
        contactButtonSelected: {
            borderColor: palette.primary,
            backgroundColor: `${palette.primary}22`,
        },
        contactButtonText: {
            color: palette.muted,
            fontSize: 12,
            fontWeight: '700',
        },
        contactButtonTextSelected: {
            color: palette.primary,
        },
        recommendationCard: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.md,
            gap: 8,
        },
        recommendationText: {
            color: palette.text,
            fontSize: 14,
            fontWeight: '700',
        },
        recommendationSub: {
            marginTop: 4,
            color: palette.primary,
            fontSize: 12,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        ruleText: {
            color: palette.muted,
            fontSize: 13,
            lineHeight: 18,
        },
    });
