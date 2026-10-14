import { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
    IconBolt,
    IconGauge,
    IconRoute,
    IconTarget,
    IconPlus,
    IconEye,
    IconPlayerPlay,
    IconCircleDot,
    IconBookmark,
} from '@tabler/icons-react-native';

import { TrainingPlayTable } from '@/src/presentation/components/Training/TrainingPlayTable';
import { getPalette, theme } from '@/constants/theme';
import { useI18n } from '@/components/useLanguage';
import {
    CATEGORY_NAMES_ES,
    getLocalizedShot,
    type CatalogShot,
} from '@/src/infrastructure/catalog/shotAdapter';
import { AnimatedFlameBadge } from './AnimatedFlameBadge';
import { getThicknessInfo } from './BallThicknessDiagram';
import { resolveEnglish } from './CueBallEnglishDiagram';

export const CATEGORY_COLORS: Record<string, string> = {
    draw: '#3B82F6',
    side_spin: '#8B5CF6',
    follow: '#10B981',
    cut: '#F59E0B',
    big_spin: '#EF4444',
    standing: '#6366F1',
    double_cushion: '#EC4899',
    cross_table: '#14B8A6',
    reverse: '#F97316',
    come_back: '#06B6D4',
    bounce: '#84CC16',
    bank_shot: '#E11D48',
    basic: '#6B7280',
    rescue: '#A855F7',
    ball_choice: '#0EA5E9',
};

export const CATEGORY_NAMES: Record<string, string> = {
    draw: 'Cajón',
    side_spin: 'Rodada',
    follow: 'Corrido',
    cut: 'Corte Fino',
    big_spin: 'Doble Vta.',
    standing: 'Línea',
    double_cushion: 'Dos Bandas',
    cross_table: 'Zigzag',
    reverse: 'Renversé',
    come_back: 'Retorno',
    bounce: 'Curvón',
    bank_shot: 'Previa',
    basic: 'Fundamentos',
    rescue: 'Tiki / Truco',
    ball_choice: 'Selección',
};

export type ShotCatalogCardProps = {
    shot: CatalogShot;
    onPress: (shot: CatalogShot) => void;
    onTrain?: (shot: CatalogShot) => void;
    onToggleFavorite?: (shotId: number) => void;
    palette: ReturnType<typeof getPalette>;
    isPickerMode?: boolean;
};

export const ShotCatalogCard = memo(function ShotCatalogCard({
    shot,
    onPress,
    onTrain,
    onToggleFavorite,
    palette,
    isPickerMode = false,
}: ShotCatalogCardProps) {
    const { language, t } = useI18n();
    const localized = getLocalizedShot(shot, language === 'en' ? 'en' : 'es');
    const color = CATEGORY_COLORS[shot.category] ?? '#6B7280';
    const langCode = (language as string) === 'en' ? 'en' : (language as string) === 'ko' ? 'ko' : 'es';
    const thicknessInfo = getThicknessInfo(shot.ballThickness, langCode);
    const englishInfo = resolveEnglish(
        {
            hour: shot.spinHour,
            tips: shot.spinTips,
            effectX: shot.effectX,
            effectY: shot.effectY,
        },
        10,
        langCode
    );
    const [isHovered, setIsHovered] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);

    return (
        <View
            style={[
                styles.cardContainer,
                {
                    backgroundColor: palette.card,
                    borderColor: isHovered ? color : `${color}25`,
                    ...(Platform.OS === 'web'
                        ? {
                              boxShadow: isHovered
                                  ? `0 8px 24px ${color}45`
                                  : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          }
                        : {
                              shadowColor: isHovered ? color : '#000',
                              shadowOpacity: isHovered ? 0.35 : 0.08,
                              shadowRadius: isHovered ? 14 : 8,
                          }),
                },
            ]}
            {...(Platform.OS === 'web'
                ? {
                      onMouseEnter: () => setIsHovered(true),
                      onMouseLeave: () => setIsHovered(false),
                  }
                : {})}>
            {/* Top Bar: Shot ID, Favorite button & Category Badge */}
            <View style={styles.topBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.idBadge, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                        <Text style={[styles.idText, { color: palette.muted }]}>#{shot.id}</Text>
                    </View>
                    {onToggleFavorite ? (
                        <Pressable
                            hitSlop={8}
                            onPress={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(shot.id);
                            }}
                            style={[
                                styles.cardFavBtn,
                                shot.isFavorite
                                    ? { backgroundColor: '#F59E0B20', borderColor: '#F59E0B60' }
                                    : { backgroundColor: palette.surfaceLow, borderColor: palette.border },
                            ]}>
                            <IconBookmark
                                size={12}
                                color={shot.isFavorite ? '#F59E0B' : palette.muted}
                                fill={shot.isFavorite ? '#F59E0B' : 'transparent'}
                            />
                        </Pressable>
                    ) : null}
                </View>

                <View style={styles.topRightBadges}>
                    {shot.isDifficult && (
                        <AnimatedFlameBadge size={14} />
                    )}
                    <View style={[styles.categoryBadge, { backgroundColor: `${color}20`, borderColor: `${color}60` }]}>
                        <View style={[styles.categoryDot, { backgroundColor: color }]} />
                        <Text style={[styles.categoryText, { color }]}>
                            {localized.name}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Canonical 2:1 Carom Billiard Table with White Ball Trajectory in Category Color */}
            <View style={styles.tableWrap}>
                <Pressable
                    onPress={() => onPress(shot)}
                    style={styles.tablePressable}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'en' ? `View shot ${shot.id}` : `Ver jugada ${shot.id}`}>
                    <TrainingPlayTable
                        whiteBall={shot.white}
                        yellowBall={shot.yellow}
                        redBall={shot.red}
                        trajectory={shot.cueBallTrajectory}
                        trajectoryColor={color}
                        isSimulating={isSimulating}
                        onSimulationEnd={() => setIsSimulating(false)}
                        showGrid={false}
                        showDiamondNumbers={false}
                        style={styles.tableThumbnail}
                    />
                </Pressable>

                {/* Floating Preview Simulation Button */}
                <Pressable
                    style={[
                        styles.cardSimulateBtn,
                        {
                            backgroundColor: isSimulating ? `${color}E6` : 'rgba(10, 16, 13, 0.78)',
                            borderColor: isSimulating ? '#FFFFFF' : `${color}55`,
                        },
                    ]}
                    onPress={() => {
                        setIsSimulating(false);
                        setTimeout(() => setIsSimulating(true), 50);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'en' ? 'Simulate trajectory' : 'Simular trayectoria'}>
                    <IconPlayerPlay size={11} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.cardSimulateBtnText}>
                        {isSimulating ? '...' : (language === 'en' ? 'Sim' : 'Simular')}
                    </Text>
                </Pressable>
            </View>

            {/* Tactical Specs Bar (Tome de Bola, Efecto/Hora, Bandas) */}
            <View style={[styles.specsRow, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                <View style={styles.specItem}>
                    <IconTarget size={13} color={color} strokeWidth={2} />
                    <Text style={[styles.specLabel, { color: palette.muted }]}>
                        {t('catalog.card.thick')}
                    </Text>
                    <Text style={[styles.specValue, { color: palette.text }]}>{thicknessInfo.fraction}</Text>
                </View>
                <View style={[styles.specDivider, { backgroundColor: palette.border }]} />
                <View style={styles.specItem}>
                    <IconCircleDot size={13} color={color} strokeWidth={2} />
                    <Text style={[styles.specLabel, { color: palette.muted }]}>
                        {t('catalog.card.spin')}
                    </Text>
                    <Text style={[styles.specValue, { color: palette.text }]}>
                        {englishInfo.tips > 0 ? englishInfo.clockFormatted : t('catalog.card.center')}
                    </Text>
                </View>
                <View style={[styles.specDivider, { backgroundColor: palette.border }]} />
                <View style={styles.specItem}>
                    <IconRoute size={13} color={color} strokeWidth={2} />
                    <Text style={[styles.specLabel, { color: palette.muted }]}>
                        {t('catalog.card.rails')}
                    </Text>
                    <Text style={[styles.specValue, { color: palette.text }]}>{shot.railSpeed}</Text>
                </View>
            </View>

            {/* Description / Hint if present */}
            {localized.description ? (
                <Text
                    style={[styles.description, { color: palette.muted }]}
                    numberOfLines={2}>
                    {localized.description}
                </Text>
            ) : null}

            {/* Actions Bar */}
            <View style={styles.actionsBar}>
                {onTrain ? (
                    <Pressable
                        style={[styles.trainBtn, { backgroundColor: palette.primary }]}
                        onPress={() => onTrain(shot)}
                        accessibilityRole="button">
                        {isPickerMode ? (
                            <>
                                <IconPlus size={16} color="#FFFFFF" strokeWidth={2.2} />
                                <Text style={styles.trainBtnText}>{t('catalog.card.addToSession')}</Text>
                            </>
                        ) : (
                            <>
                                <IconTarget size={16} color="#FFFFFF" strokeWidth={2.2} />
                                <Text style={styles.trainBtnText}>{t('catalog.card.trainShot')}</Text>
                            </>
                        )}
                    </Pressable>
                ) : null}

                <Pressable
                    style={[styles.detailBtn, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}
                    onPress={() => onPress(shot)}
                    accessibilityRole="button">
                    <IconEye size={16} color={palette.text} strokeWidth={1.8} />
                    <Text style={[styles.detailBtnText, { color: palette.text }]}>{t('catalog.card.detail')}</Text>
                </Pressable>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 14,
        borderWidth: 1.5,
        padding: 12,
        gap: 10,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    idBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    cardFavBtn: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    idText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    topRightBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tagBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 6,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
    },
    categoryDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    categoryText: {
        fontSize: 10.5,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    tableWrap: {
        width: '100%',
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#0a100d',
        position: 'relative',
    },
    tablePressable: {
        width: '100%',
    },
    tableThumbnail: {
        width: '100%',
        aspectRatio: 316 / 174,
    },
    cardSimulateBtn: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3.5,
        borderRadius: 12,
        borderWidth: 1,
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 2px 6px rgba(0, 0, 0, 0.35)' }
            : {
                shadowColor: '#000',
                shadowOpacity: 0.35,
                shadowRadius: 3,
                elevation: 3,
            }),
    },
    cardSimulateBtnText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    specsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderRadius: 8,
        borderWidth: 1,
        paddingVertical: 7,
        paddingHorizontal: 6,
    },
    specItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    specDivider: {
        width: 1,
        height: 14,
    },
    specLabel: {
        fontSize: 10,
        fontWeight: '500',
    },
    specValue: {
        fontSize: 11,
        fontWeight: '700',
    },
    description: {
        fontSize: 12,
        lineHeight: 16,
    },
    actionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    trainBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: theme.radius.md,
    },
    trainBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    detailBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: theme.radius.md,
        borderWidth: 1,
    },
    detailBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default ShotCatalogCard;
