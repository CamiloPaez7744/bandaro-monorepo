import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    IconArrowRight,
    IconCheck,
    IconCloudCheck,
    IconRotateClockwise,
    IconSparkles,
    IconTarget,
    IconTrophy,
    IconUserCheck,
    IconX,
} from '@/src/presentation/components/icons';
import { useRouter } from 'expo-router';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import {
    type CongratulationQuote,
    getLocalizedCongratulationQuote,
} from '@/src/presentation/screens/Training/congratulationQuotes';

export interface TrainingCelebrationSessionSummary {
    id: string;
    totalTarget: number;
    totalHits: number;
    accuracy: number;
    positionsCount: number;
    savedToBackend?: boolean;
    isGuest?: boolean;
    suggestLogin?: boolean;
    xpEarned?: number;
    strugglingPositionsCount?: number;
    positions: {
        id: string;
        name: string;
        category: string;
        target: number;
        hits: number;
        accuracy: number;
    }[];
}

export interface TrainingCelebrationModalProps {
    visible: boolean;
    session: TrainingCelebrationSessionSummary | null;
    quote: CongratulationQuote;
    onClose: () => void;
    onNewSession?: () => void;
}

export function TrainingCelebrationModal({
    visible,
    session,
    quote,
    onClose,
    onNewSession,
}: TrainingCelebrationModalProps) {
    const router = useRouter();
    const { t, language } = useI18n();
    const localizedQuote = getLocalizedCongratulationQuote(quote, language);
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);

    if (!session) return null;

    const accuracyColor =
        session.accuracy >= 75
            ? '#10B981'
            : session.accuracy >= 50
            ? '#F59E0B'
            : '#EF4444';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    {/* Top Glow & Close Button */}
                    <View style={styles.cardHeader}>
                        <View style={styles.cupGlowWrap}>
                            <View style={styles.cupRingGlow}>
                                <IconTrophy size={48} color="#F59E0B" strokeWidth={1.8} />
                            </View>
                            <View style={styles.sparkleTopLeft}>
                                <IconSparkles size={16} color="#FBBF24" />
                            </View>
                            <View style={styles.sparkleTopRight}>
                                <IconSparkles size={14} color="#F59E0B" />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            accessibilityLabel={t('common.close')}
                        >
                            <IconX size={18} color={palette.muted} />
                        </TouchableOpacity>
                    </View>

                    {/* Randomized Congratulatory Title & Message */}
                    <View style={styles.quoteSection}>
                        <View style={styles.highlightBadge}>
                            <IconSparkles size={13} color="#F59E0B" />
                            <Text style={styles.highlightText}>{localizedQuote.highlight}</Text>
                        </View>

                        <Text style={styles.titleText}>{localizedQuote.title}</Text>
                        <Text style={styles.messageText}>{localizedQuote.message}</Text>
                    </View>

                    {/* Stats Scorecard Grid */}
                    <View style={styles.statsCard}>
                        <View style={styles.statCol}>
                            <Text style={styles.statLabel}>{t('training.celebration.carambolas')}</Text>
                            <Text style={styles.statValue}>
                                {session.totalHits}
                                <Text style={styles.statSubValue}>/{session.totalTarget}</Text>
                            </Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statCol}>
                            <Text style={styles.statLabel}>{t('training.celebration.accuracy')}</Text>
                            <Text style={[styles.statValue, { color: accuracyColor }]}>
                                {session.accuracy}%
                            </Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statCol}>
                            <Text style={styles.statLabel}>{t('training.celebration.shots')}</Text>
                            <Text style={styles.statValue}>{session.positionsCount}</Text>
                        </View>
                    </View>

                    {/* Backend Cloud Status Chip */}
                    <View style={styles.syncRow}>
                        <IconCloudCheck size={16} color="#10B981" />
                        <Text style={styles.syncText}>
                            {t('training.celebration.synced')}
                        </Text>
                    </View>

                    {/* Detailed Breakdown of Positions */}
                    {session.positions && session.positions.length > 0 && (
                        <View style={styles.breakdownSection}>
                            <Text style={styles.breakdownTitle}>{t('training.celebration.breakdown')}</Text>
                            <ScrollView
                                style={styles.breakdownScroll}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
                            >
                                {session.positions.map((pos, idx) => (
                                    <View key={`${pos.id}-${idx}`} style={styles.breakdownItem}>
                                        <View style={styles.breakdownItemLeft}>
                                            <View style={styles.posIdxBadge}>
                                                <Text style={styles.posIdxText}>{idx + 1}</Text>
                                            </View>
                                            <View style={styles.posInfoCol}>
                                                <Text style={styles.posName} numberOfLines={1}>
                                                    {pos.name}
                                                </Text>
                                                <Text style={styles.posCat}>{pos.category}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.breakdownItemRight}>
                                            <Text style={styles.posHitsText}>
                                                {pos.hits}/{pos.target}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.posAccuracyBadge,
                                                    {
                                                        backgroundColor:
                                                            pos.accuracy >= 70
                                                                ? 'rgba(16, 185, 129, 0.15)'
                                                                : 'rgba(245, 158, 11, 0.15)',
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.posAccuracyText,
                                                        {
                                                            color:
                                                                pos.accuracy >= 70
                                                                    ? '#10B981'
                                                                    : '#F59E0B',
                                                        },
                                                    ]}
                                                >
                                                    {pos.accuracy}%
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Guest Retention Prompt (Propuesta 1) */}
                    {(session.suggestLogin || session.isGuest) && (
                        <View style={[styles.guestCallout, { backgroundColor: '#3B82F614', borderColor: '#3B82F644' }]}>
                            <View style={styles.guestCalloutHeader}>
                                <View style={[styles.guestCalloutIconWrap, { backgroundColor: '#3B82F625' }]}>
                                    <IconUserCheck size={18} color="#60A5FA" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.guestCalloutTitle, { color: palette.text }]}>
                                        {language === 'en' ? 'Protect Your Streak & Data' : '¡Conserva tu Racha y Datos!'}
                                    </Text>
                                    <Text style={[styles.guestCalloutText, { color: palette.muted }]}>
                                        {language === 'en'
                                            ? 'Create a free account to back up training history, claim your earned XP, and unlock smart Spaced Repetition!'
                                            : 'Crea una cuenta gratis para sincronizar tu historial, asegurar tu XP ganado y activar el repaso espaciado de carambolas débiles.'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.guestCalloutBtn, { backgroundColor: palette.primary }]}
                                activeOpacity={0.85}
                                onPress={() => {
                                    onClose();
                                    router.push('/auth/register');
                                }}>
                                <Text style={styles.guestCalloutBtnText}>
                                    {language === 'en' ? 'Create Free Account' : 'Crear Cuenta Gratis'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        {onNewSession ? (
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                activeOpacity={0.8}
                                onPress={onNewSession}
                            >
                                <IconRotateClockwise size={18} color={palette.text} />
                                <Text style={styles.secondaryBtnText}>{t('training.celebration.newRun')}</Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
                            activeOpacity={0.85}
                            onPress={onClose}
                        >
                            <Text style={styles.primaryBtnText}>{t('training.celebration.backMenu')}</Text>
                            <IconArrowRight size={18} color="#FFFFFF" strokeWidth={2.2} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
    StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.lg,
        },
        card: {
            width: '100%',
            maxWidth: 520,
            backgroundColor: palette.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.35)',
            padding: theme.spacing.lg,
            gap: 16,
            ...Platform.select({
                web: {
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.15)',
                },
                default: {
                    elevation: 10,
                },
            }),
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
        },
        cupGlowWrap: {
            alignSelf: 'center',
            position: 'relative',
            marginTop: 4,
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        cupRingGlow: {
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: 'rgba(245, 158, 11, 0.14)',
            borderWidth: 2,
            borderColor: 'rgba(245, 158, 11, 0.4)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        sparkleTopLeft: {
            position: 'absolute',
            top: -6,
            left: -6,
        },
        sparkleTopRight: {
            position: 'absolute',
            top: 2,
            right: -8,
        },
        closeBtn: {
            position: 'absolute',
            right: 0,
            top: 0,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: palette.surfaceLow,
            alignItems: 'center',
            justifyContent: 'center',
        },
        quoteSection: {
            alignItems: 'center',
            gap: 6,
            textAlign: 'center',
        },
        highlightBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: theme.radius.full,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
        },
        highlightText: {
            fontSize: 11,
            fontWeight: '800',
            color: '#F59E0B',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        titleText: {
            fontSize: 22,
            fontWeight: '800',
            color: palette.text,
            textAlign: 'center',
            marginTop: 4,
        },
        messageText: {
            fontSize: 13,
            color: palette.muted,
            textAlign: 'center',
            lineHeight: 19,
            paddingHorizontal: 12,
        },
        statsCard: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            backgroundColor: palette.surfaceLow,
            borderRadius: theme.radius.md,
            paddingVertical: 14,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: palette.border,
        },
        statCol: {
            alignItems: 'center',
            gap: 3,
            flex: 1,
        },
        statLabel: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.6,
            color: palette.muted,
            textTransform: 'uppercase',
        },
        statValue: {
            fontSize: 20,
            fontWeight: '800',
            color: palette.text,
        },
        statSubValue: {
            fontSize: 13,
            fontWeight: '600',
            color: palette.muted,
        },
        statDivider: {
            width: 1,
            height: 28,
            backgroundColor: palette.border,
        },
        syncRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 4,
        },
        syncText: {
            fontSize: 11,
            fontWeight: '600',
            color: '#10B981',
        },
        breakdownSection: {
            gap: 8,
            maxHeight: 150,
        },
        breakdownTitle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.6,
            color: palette.muted,
        },
        breakdownScroll: {
            maxHeight: 120,
        },
        breakdownItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: palette.surfaceLow,
            borderRadius: theme.radius.sm,
            marginBottom: 6,
            borderWidth: 1,
            borderColor: palette.border,
        },
        breakdownItemLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: 1,
        },
        posIdxBadge: {
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: `${palette.primary}20`,
            alignItems: 'center',
            justifyContent: 'center',
        },
        posIdxText: {
            fontSize: 10,
            fontWeight: '800',
            color: palette.primary,
        },
        posInfoCol: {
            flex: 1,
        },
        posName: {
            fontSize: 12,
            fontWeight: '700',
            color: palette.text,
        },
        posCat: {
            fontSize: 10,
            color: palette.muted,
        },
        breakdownItemRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        posHitsText: {
            fontSize: 12,
            fontWeight: '600',
            color: palette.text,
        },
        posAccuracyBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        posAccuracyText: {
            fontSize: 11,
            fontWeight: '800',
        },
        actionsRow: {
            flexDirection: 'row',
            gap: 10,
            marginTop: 4,
        },
        secondaryBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 44,
            borderRadius: theme.radius.md,
            backgroundColor: palette.surfaceLow,
            borderWidth: 1,
            borderColor: palette.border,
        },
        secondaryBtnText: {
            fontSize: 13,
            fontWeight: '700',
            color: palette.text,
        },
        primaryBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 44,
            borderRadius: theme.radius.md,
        },
        primaryBtnText: {
            fontSize: 13,
            fontWeight: '700',
            color: '#FFFFFF',
        },
        guestCallout: {
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            padding: 12,
            gap: 10,
        },
        guestCalloutHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
        },
        guestCalloutIconWrap: {
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        guestCalloutTitle: {
            fontSize: 13,
            fontWeight: '700',
        },
        guestCalloutText: {
            fontSize: 11.5,
            lineHeight: 16,
            marginTop: 2,
        },
        guestCalloutBtn: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            borderRadius: theme.radius.md,
        },
        guestCalloutBtnText: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '700',
        },
    });
