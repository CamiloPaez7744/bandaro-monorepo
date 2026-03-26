import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import {
    CONTACT_PRESETS,
    EFFECT_PRESETS,
    getTrainingSystemById,
    type ContactKey,
    type EffectKey,
    type Point2D,
} from '@/src/presentation/screens/Training/trainingData';

const TABLE_W = 284;
const TABLE_H = 142;
const VIEW_W = 360;
const VIEW_H = 220;
const FRAME_MARGIN = 8;
const RAIL_WIDTH = 18;
const CUSHION_WIDTH = 10;

const playableLimitW = VIEW_W - 2 * (FRAME_MARGIN + RAIL_WIDTH + CUSHION_WIDTH);
const playableLimitH = VIEW_H - 2 * (FRAME_MARGIN + RAIL_WIDTH + CUSHION_WIDTH);
const PLAY_W = Math.min(playableLimitW, playableLimitH * 2);
const PLAY_H = PLAY_W / 2;
const PLAY_X = (VIEW_W - PLAY_W) / 2;
const PLAY_Y = (VIEW_H - PLAY_H) / 2;

const CUSHION_X = PLAY_X - CUSHION_WIDTH;
const CUSHION_Y = PLAY_Y - CUSHION_WIDTH;
const CUSHION_W = PLAY_W + CUSHION_WIDTH * 2;
const CUSHION_H = PLAY_H + CUSHION_WIDTH * 2;

const RAIL_X = CUSHION_X - RAIL_WIDTH;
const RAIL_Y = CUSHION_Y - RAIL_WIDTH;
const RAIL_W = CUSHION_W + RAIL_WIDTH * 2;
const RAIL_H = CUSHION_H + RAIL_WIDTH * 2;

function mapToView(point: Point2D) {
    return {
        x: PLAY_X + (point.x / TABLE_W) * PLAY_W,
        y: PLAY_Y + (point.y / TABLE_H) * PLAY_H,
    };
}

const LONG_RAIL_DIAMONDS = Array.from({ length: 9 }, (_, idx) => idx / 8);
const SHORT_RAIL_DIAMONDS = Array.from({ length: 5 }, (_, idx) => idx / 4);

function ballColor(id: 'white' | 'yellow' | 'red') {
    if (id === 'white') return '#F8FAFC';
    if (id === 'yellow') return '#FBBF24';
    return '#E11D48';
}

export function TrainingSystemScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ systemId: string }>();
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);

    const system = useMemo(() => (params.systemId ? getTrainingSystemById(params.systemId) : null), [params.systemId]);

    const [positionIndex, setPositionIndex] = useState(0);
    const [showSolution, setShowSolution] = useState(false);
    const [selectedEffect, setSelectedEffect] = useState<EffectKey>(system?.recommendedEffect ?? 'center');
    const [selectedContact, setSelectedContact] = useState<ContactKey>('1/2');

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
                <Text style={styles.cardTitle}>{t('training.system.table')}</Text>
                <View style={styles.tableWrap}>
                    <Svg width="100%" height={220} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
                        <Defs>
                            <LinearGradient id="woodGradient" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0%" stopColor="#8a5a2b" />
                                <Stop offset="100%" stopColor="#5f3b1b" />
                            </LinearGradient>
                            <LinearGradient id="feltGradient" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0%" stopColor="#2f8f6b" />
                                <Stop offset="100%" stopColor="#246f54" />
                            </LinearGradient>
                            <LinearGradient id="cushionGradient" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0%" stopColor="#355c4b" />
                                <Stop offset="100%" stopColor="#1f3f34" />
                            </LinearGradient>
                        </Defs>

                        <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} rx={16} fill="#0d1117" />

                        <Rect x={RAIL_X} y={RAIL_Y} width={RAIL_W} height={RAIL_H} rx={14} fill="url(#woodGradient)" />

                        <Rect x={CUSHION_X} y={CUSHION_Y} width={CUSHION_W} height={CUSHION_H} rx={10} fill="url(#cushionGradient)" />

                        <Rect x={PLAY_X} y={PLAY_Y} width={PLAY_W} height={PLAY_H} rx={6} fill="url(#feltGradient)" />

                        {LONG_RAIL_DIAMONDS.map((ratio) => {
                            const x = PLAY_X + PLAY_W * ratio;
                            return (
                                <G key={`long-${ratio}`}>
                                    <Circle cx={x} cy={RAIL_Y + RAIL_WIDTH * 0.52} r={2.3} fill="#f8fafc" />
                                    <Circle cx={x} cy={RAIL_Y + RAIL_H - RAIL_WIDTH * 0.52} r={2.3} fill="#f8fafc" />
                                </G>
                            );
                        })}

                        {SHORT_RAIL_DIAMONDS.map((ratio) => {
                            const y = PLAY_Y + PLAY_H * ratio;
                            return (
                                <G key={`short-${ratio}`}>
                                    <Circle cx={RAIL_X + RAIL_WIDTH * 0.52} cy={y} r={2.3} fill="#f8fafc" />
                                    <Circle cx={RAIL_X + RAIL_W - RAIL_WIDTH * 0.52} cy={y} r={2.3} fill="#f8fafc" />
                                </G>
                            );
                        })}

                        {showSolution &&
                            position.trajectory.slice(1).map((next, idx) => {
                                const from = mapToView(position.trajectory[idx]);
                                const to = mapToView(next);
                                const isMiddle = idx > 0 && idx < position.trajectory.length - 2;
                                return (
                                    <Line
                                        key={`tr-${idx}`}
                                        x1={from.x}
                                        y1={from.y}
                                        x2={to.x}
                                        y2={to.y}
                                        stroke={isMiddle ? 'rgba(224, 231, 255, 0.45)' : 'rgba(251, 191, 36, 0.9)'}
                                        strokeWidth={isMiddle ? 1.5 : 2.1}
                                        strokeDasharray={isMiddle ? '6 6' : undefined}
                                    />
                                );
                            })}

                        {(['white', 'yellow', 'red'] as const).map((ballId) => {
                            const pos = mapToView(position[ballId]);
                            return (
                                <Circle key={ballId} cx={pos.x} cy={pos.y} r={6} fill={ballColor(ballId)} stroke="rgba(0,0,0,0.45)" strokeWidth={1.2} />
                            );
                        })}
                    </Svg>
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
        cardTitle: {
            color: palette.text,
            fontSize: 16,
            fontWeight: '800',
        },
        tableWrap: {
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#0f172a',
            backgroundColor: '#0f172a',
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
