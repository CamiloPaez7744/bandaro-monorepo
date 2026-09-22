import { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconBolt, IconGauge, IconRoute, IconTarget, IconPlus, IconEye } from '@tabler/icons-react-native';

import { BilliardsTableThumbnail } from '@/src/presentation/components/Training/BilliardsTableThumbnail';
import { getPalette, theme } from '@/constants/theme';
import type { CatalogShot } from '@/src/infrastructure/catalog/shotAdapter';

const CATEGORY_COLORS: Record<string, string> = {
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

const CATEGORY_NAMES: Record<string, string> = {
    draw: 'Retro',
    side_spin: 'Lateral',
    follow: 'Seguimiento',
    cut: 'Corte',
    big_spin: 'Gran Rot.',
    standing: 'Vertical',
    double_cushion: 'Doble Banda',
    cross_table: 'Travesía',
    reverse: 'Reversa',
    come_back: 'Regreso',
    bounce: 'Rebote',
    bank_shot: 'Banco',
    basic: 'Básico',
    rescue: 'Rescate',
    ball_choice: 'Selección',
};

export type ShotCatalogCardProps = {
    shot: CatalogShot;
    onPress: (shot: CatalogShot) => void;
    onTrain?: (shot: CatalogShot) => void;
    palette: ReturnType<typeof getPalette>;
    isPickerMode?: boolean;
};

export const ShotCatalogCard = memo(function ShotCatalogCard({
    shot,
    onPress,
    onTrain,
    palette,
    isPickerMode = false,
}: ShotCatalogCardProps) {
    const color = CATEGORY_COLORS[shot.category] ?? '#6B7280';
    const [isHovered, setIsHovered] = useState(false);

    return (
        <View
            style={[
                styles.cardContainer,
                {
                    backgroundColor: palette.card,
                    borderColor: isHovered ? color : palette.border,
                    shadowColor: isHovered ? color : '#000',
                    shadowOpacity: isHovered ? 0.25 : 0.08,
                },
            ]}
            {...(Platform.OS === 'web'
                ? {
                      onMouseEnter: () => setIsHovered(true),
                      onMouseLeave: () => setIsHovered(false),
                  }
                : {})}>
            {/* Top Bar: Shot ID & Category Badge */}
            <View style={styles.topBar}>
                <View style={[styles.idBadge, { backgroundColor: palette.surfaceLow }]}>
                    <Text style={[styles.idText, { color: palette.muted }]}>#{shot.id}</Text>
                </View>

                <View style={styles.topRightBadges}>
                    {shot.isDifficult && (
                        <View style={[styles.tagBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                            <Text style={[styles.tagText, { color: '#EF4444' }]}>Difícil</Text>
                        </View>
                    )}
                    <View style={[styles.categoryBadge, { backgroundColor: color }]}>
                        <Text style={styles.categoryText}>
                            {CATEGORY_NAMES[shot.category] ?? shot.category}
                        </Text>
                    </View>
                </View>
            </View>

            {/* 2:1 Carom Billiard Table Thumbnail */}
            <Pressable
                onPress={() => onPress(shot)}
                style={styles.tableWrap}
                accessibilityRole="button"
                accessibilityLabel={`Ver jugada ${shot.id}`}>
                <BilliardsTableThumbnail
                    balls={[
                        { id: 'white', x: shot.white.x, y: shot.white.y, color: '#FFFFFF', border: '#CCCCCC' },
                        { id: 'yellow', x: shot.yellow.x, y: shot.yellow.y, color: '#FBBF24', border: '#D97706' },
                        { id: 'red', x: shot.red.x, y: shot.red.y, color: '#EF4444', border: '#B91C1C' },
                    ]}
                    paths={[
                        { id: 'cue', points: shot.cueBallTrajectory, color, width: 2.2, opacity: 0.95 },
                        { id: 'obj1', points: shot.objectBall1Trajectory, color: '#FBBF24', width: 1.25, dash: [4, 3], opacity: 0.6 },
                        { id: 'obj2', points: shot.objectBall2Trajectory, color: '#EF4444', width: 1.25, dash: [4, 3], opacity: 0.6 },
                    ]}
                    showPath
                    style={styles.tableThumbnail}
                />
            </Pressable>

            {/* Ballistic Specs Bar */}
            <View style={[styles.specsRow, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                <View style={styles.specItem}>
                    <IconBolt size={13} color={palette.muted} strokeWidth={2} />
                    <Text style={[styles.specLabel, { color: palette.muted }]}>Potencia</Text>
                    <Text style={[styles.specValue, { color: palette.text }]}>{shot.powerLevel.toFixed(1)}</Text>
                </View>
                <View style={[styles.specDivider, { backgroundColor: palette.border }]} />
                <View style={styles.specItem}>
                    <IconGauge size={13} color={palette.muted} strokeWidth={2} />
                    <Text style={[styles.specLabel, { color: palette.muted }]}>Velocidad</Text>
                    <Text style={[styles.specValue, { color: palette.text }]}>{(shot.powerLevel * 0.7).toFixed(1)} m/s</Text>
                </View>
                <View style={[styles.specDivider, { backgroundColor: palette.border }]} />
                <View style={styles.specItem}>
                    <IconRoute size={13} color={palette.muted} strokeWidth={2} />
                    <Text style={[styles.specLabel, { color: palette.muted }]}>Rieles</Text>
                    <Text style={[styles.specValue, { color: palette.text }]}>{shot.railSpeed}</Text>
                </View>
            </View>

            {/* Description / Hint if present */}
            {shot.description ? (
                <Text
                    style={[styles.description, { color: palette.muted }]}
                    numberOfLines={2}>
                    {shot.description}
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
                                <Text style={styles.trainBtnText}>Añadir a Sesión</Text>
                            </>
                        ) : (
                            <>
                                <IconTarget size={16} color="#FFFFFF" strokeWidth={2.2} />
                                <Text style={styles.trainBtnText}>Entrenar Jugada</Text>
                            </>
                        )}
                    </Pressable>
                ) : null}

                <Pressable
                    style={[styles.detailBtn, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}
                    onPress={() => onPress(shot)}
                    accessibilityRole="button">
                    <IconEye size={16} color={palette.text} strokeWidth={1.8} />
                    <Text style={[styles.detailBtnText, { color: palette.text }]}>Detalle</Text>
                </Pressable>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        padding: 12,
        gap: 10,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 10,
        elevation: 3,
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
    },
    idText: {
        fontSize: 11,
        fontWeight: '700',
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
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    tableWrap: {
        width: '100%',
        borderRadius: theme.radius.md,
        overflow: 'hidden',
    },
    tableThumbnail: {
        width: '100%',
        aspectRatio: 2 / 1,
    },
    specsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    specItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
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
