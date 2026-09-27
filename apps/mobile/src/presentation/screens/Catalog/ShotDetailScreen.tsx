import { useEffect, useState, useRef, useCallback } from 'react';
import {
    Platform, Pressable, ScrollView, Text, View,
    useWindowDimensions, Modal, StyleSheet, type ViewStyle, type TextStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { IconX, IconPlayerPlay, IconBookmark, IconTarget } from '@tabler/icons-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/useAuth';
import { getPalette } from '@/constants/theme';
import { useSidebarWidth } from '@/components/LayoutContext';
import { useI18n } from '@/components/useLanguage';
import { TrainingPlayTable } from '@/src/presentation/components/Training/TrainingPlayTable';
import { fetchShotDetail, toggleFavoriteShot, type CatalogShotRaw } from '@/src/infrastructure/catalog/catalogApi';
import {
    adaptCatalogShot,
    getLocalizedShot,
    type CatalogShot,
    type CatalogLanguage,
} from '@/src/infrastructure/catalog/shotAdapter';
import { AnimatedFlameBadge } from '@/src/presentation/components/Catalog/AnimatedFlameBadge';
import { BallTacticsVisualizer } from '@/src/presentation/components/Catalog/BallTacticsVisualizer';

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

const UI_LABELS: Record<CatalogLanguage, {
    loading: string;
    notFound: string;
    close: string;
    save: string;
    saved: string;
    thickness: string;
    speed: string;
    effectX: string;
    effectY: string;
    rails: string;
    difficult: string;
    position: string;
    defense: string;
    description: string;
    tips: string;
    youtube: string;
    train: string;
    simulate: string;
    simulating: string;
    originalNotice: string;
}> = {
    es: {
        loading: 'Cargando tiro...',
        notFound: 'Tiro no encontrado',
        close: 'Cerrar',
        save: 'Guardar',
        saved: 'Guardada',
        thickness: 'Grosor',
        speed: 'Velocidad',
        effectX: 'Efecto X',
        effectY: 'Efecto Y',
        rails: 'rieles',
        difficult: 'Difícil',
        position: 'Posición',
        defense: 'Defensa',
        description: 'Descripción',
        tips: 'Consejos de Ejecución',
        youtube: 'Ver en YouTube',
        train: 'Entrenar',
        simulate: 'Ver en simulador',
        simulating: 'Cargando simulador...',
        originalNotice: 'Traducción adaptada al billar carambola',
    },
    en: {
        loading: 'Loading shot...',
        notFound: 'Shot not found',
        close: 'Close',
        save: 'Save',
        saved: 'Saved',
        thickness: 'Thickness',
        speed: 'Speed',
        effectX: 'Spin X',
        effectY: 'Spin Y',
        rails: 'rails',
        difficult: 'Difficult',
        position: 'Position',
        defense: 'Defense',
        description: 'Description',
        tips: 'Execution Tips',
        youtube: 'Watch on YouTube',
        train: 'Practice',
        simulate: 'View in Simulator',
        simulating: 'Loading simulator...',
        originalNotice: 'English carom billiard technical translation',
    },
    ko: {
        loading: '로딩 중...',
        notFound: '샷을 찾을 수 없습니다',
        close: '닫기',
        save: '저장',
        saved: '저장됨',
        thickness: '두께',
        speed: '당점속도',
        effectX: '회전 X',
        effectY: '당점 Y',
        rails: '쿠션',
        difficult: '난구',
        position: '포지션',
        defense: '수비',
        description: '배치 설명',
        tips: '공략 팁',
        youtube: 'YouTube에서 보기',
        train: '연습하기',
        simulate: '시뮬레이터에서 보기',
        simulating: '시뮬레이터 로딩 중...',
        originalNotice: 'Billiard Bible 원문 텍스트 (한국어)',
    },
};

interface ShotDetailScreenProps {
    shotId?: number;
    onClose?: () => void;
    onSimulate?: (shot: CatalogShot) => void;
}

export function ShotDetailScreen({ shotId: propShotId, onClose, onSimulate }: ShotDetailScreenProps) {
    const params = useLocalSearchParams<{ shotId?: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const isDark = colorScheme === 'dark';
    const { width: windowWidth } = useWindowDimensions();
    const sidebarWidth = useSidebarWidth();
    const { language } = useI18n();
    const { user } = useAuth();
    const userId = user?.id || 'guest';

    const shotId = propShotId ?? (params.shotId ? parseInt(params.shotId, 10) : undefined);
    const [shot, setShot] = useState<CatalogShot | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [modalVisible, setModalVisible] = useState(true);
    const [selectedLang, setSelectedLang] = useState<CatalogLanguage>(language === 'en' ? 'en' : 'es');

    useEffect(() => {
        setSelectedLang(language === 'en' ? 'en' : 'es');
    }, [language]);

    const scrollViewRef = useRef<ScrollView>(null);

    const handleTriggerSimulation = useCallback(() => {
        setIsSimulating(false);
        setTimeout(() => {
            setIsSimulating(true);
            if (onSimulate && shot) {
                onSimulate(shot);
            }
        }, 50);
    }, [onSimulate, shot]);

    const handleClose = useCallback(() => {
        setModalVisible(false);
        if (onClose) {
            onClose();
        } else {
            router.back();
        }
    }, [onClose, router]);

    const color = shot ? (CATEGORY_COLORS[shot.category] ?? '#6B7280') : '#6B7280';
    const isWide = windowWidth - sidebarWidth >= 600;
    const labels = UI_LABELS[selectedLang] ?? UI_LABELS.es;
    const localized = shot ? getLocalizedShot(shot, selectedLang) : null;

    const handleSimulateFromButton = useCallback(() => {
        if (!shot) return;

        setModalVisible(false);

        // Calculate aim vector from cue ball trajectory if available
        let aimX = '1';
        let aimY = '0';
        if (shot.cueBallTrajectory && shot.cueBallTrajectory.length >= 2) {
            const p0 = shot.cueBallTrajectory[0];
            const p1 = shot.cueBallTrajectory[1];
            aimX = String(p1.x - p0.x);
            aimY = String(p1.y - p0.y);
        } else {
            aimX = String(shot.yellow.x - shot.white.x);
            aimY = String(shot.yellow.y - shot.white.y);
        }

        // Calculate spin
        let sX = 0;
        let sY = 0;
        if (shot.effectY < 0) {
            const tips = Math.min(3.5, Math.abs(shot.effectY * 5.0));
            const rawHour = shot.effectX * 5.0;
            const hour = rawHour <= 0.05 ? 12 : rawHour;
            const theta = (3 - hour) * (Math.PI / 6);
            const mag = Math.min(1.0, tips / 3.5);
            sX = Math.cos(theta) * mag;
            sY = Math.sin(theta) * mag;
        } else if (shot.effectX !== 0 || shot.effectY !== 0) {
            sX = Math.max(-1, Math.min(1, shot.effectX));
            sY = Math.max(-1, Math.min(1, shot.effectY));
        }

        if (onClose) {
            onClose();
        }

        router.replace({
            pathname: '/training/simulate',
            params: {
                shotId: String(shot.id),
                whiteX: String(shot.white.x),
                whiteY: String(shot.white.y),
                yellowX: String(shot.yellow.x),
                yellowY: String(shot.yellow.y),
                redX: String(shot.red.x),
                redY: String(shot.red.y),
                aimX,
                aimY,
                spinX: String(sX),
                spinY: String(sY),
                powerLevel: String(shot.powerLevel || shot.railSpeed || 3),
                category: shot.category,
                categoryName: shot.categoryName,
                categoryColor: color ? encodeURIComponent(color) : '',
                customName: localized?.name || `Jugada #${shot.id}`,
            },
        });
    }, [onClose, router, shot, localized, color]);

    const handleToggleFavorite = useCallback(async () => {
        if (!shot || isSaving) return;
        setIsSaving(true);
        const nextState = !shot.isFavorite;
        setShot((prev) => (prev ? { ...prev, isFavorite: nextState } : null));

        try {
            const res = await toggleFavoriteShot(shot.id, userId);
            setShot((prev) => (prev ? { ...prev, isFavorite: res.isFavorite } : null));
        } catch {
            setShot((prev) => (prev ? { ...prev, isFavorite: !nextState } : null));
        } finally {
            setIsSaving(false);
        }
    }, [shot, isSaving, userId]);

    useEffect(() => {
        if (!shotId) return;
        setLoading(true);
        fetchShotDetail(shotId, userId)
            .then((raw) => setShot(adaptCatalogShot(raw)))
            .catch(() => setShot(null))
            .finally(() => setLoading(false));
    }, [shotId, userId]);

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: palette.background } as any]}>
                <Text style={{ color: palette.muted }}>{labels.loading}</Text>
            </View>
        );
    }

    if (!shot || !localized) {
        return (
            <View style={[styles.center, { backgroundColor: palette.background } as any]}>
                <Text style={{ color: palette.muted }}>{labels.notFound}</Text>
                <Pressable onPress={handleClose} style={{ marginTop: 16 }}>
                    <Text style={{ color: color }}>{labels.close}</Text>
                </Pressable>
            </View>
        );
    }

    const content = (
        <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, backgroundColor: palette.background } as any}
            contentContainerStyle={{ padding: isWide ? 28 : 16, maxWidth: 1060, alignSelf: 'center', width: '100%' }}
        >
            {/* Header: Save button on Left, Close button on Right */}
            <View style={styles.headerRow}>
                <Pressable
                    onPress={handleToggleFavorite}
                    hitSlop={8}
                    style={[
                        styles.favoriteBtn,
                        shot.isFavorite
                            ? { backgroundColor: '#F59E0B22', borderColor: '#F59E0B66' }
                            : { backgroundColor: 'rgba(128,128,128,0.1)', borderColor: 'transparent' },
                    ]}
                >
                    <IconBookmark
                        size={17}
                        color={shot.isFavorite ? '#F59E0B' : palette.muted}
                        fill={shot.isFavorite ? '#F59E0B' : 'transparent'}
                    />
                    <Text
                        style={[
                            styles.favoriteBtnText,
                            { color: shot.isFavorite ? '#F59E0B' : palette.muted },
                        ]}
                    >
                        {shot.isFavorite ? labels.saved : labels.save}
                    </Text>
                </Pressable>

                <View style={{ flex: 1 }} />

                <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
                    <IconX size={20} color={palette.muted} />
                </Pressable>
            </View>

            {/* Top row: Category Badge & Multilingual Switcher */}
            <View style={styles.badgeAndLangRow}>
                <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '50', borderWidth: 1 }]}>
                    <View style={[styles.badgeDot, { backgroundColor: color }]} />
                    <Text style={[styles.badgeText, { color }]}>
                        {localized.name}
                    </Text>
                </View>

                {/* Multilingual Selector: ES | EN | KO */}
                <View style={[styles.langSelector, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                    {(['es', 'en', 'ko'] as CatalogLanguage[]).map((langCode) => {
                        const isSelected = selectedLang === langCode;
                        const labelTitle: Record<CatalogLanguage, string> = {
                            es: 'ES',
                            en: 'EN',
                            ko: 'KO (원문)',
                        };
                        return (
                            <Pressable
                                key={langCode}
                                onPress={() => setSelectedLang(langCode)}
                                style={[
                                    styles.langButton,
                                    isSelected && {
                                        backgroundColor: color,
                                        shadowColor: color,
                                        shadowOpacity: 0.35,
                                        shadowRadius: 5,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.langButtonText,
                                        { color: isSelected ? '#FFFFFF' : palette.muted },
                                        isSelected && { fontWeight: '700' },
                                    ]}
                                >
                                    {labelTitle[langCode]}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Table */}
            <View style={[styles.tableContainer, isWide && { flexDirection: 'row', gap: 24 }]}>
                <View style={[styles.tableWrap, isWide && { flex: 1 }]}>
                    <Pressable
                        onPress={handleTriggerSimulation}
                        style={({ pressed }) => [
                            styles.tableInner,
                            {
                                borderColor: isSimulating ? color : `${color}40`,
                                borderRadius: 12,
                                overflow: 'hidden',
                                opacity: pressed ? 0.94 : 1,
                            },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={selectedLang === 'en' ? 'Tap table to simulate trajectory' : 'Tocar la mesa para simular trayectoria'}
                        {...(Platform.OS === 'web' ? ({ title: selectedLang === 'en' ? 'Tap table to simulate trajectory' : 'Toca la mesa para simular trayectoria' } as any) : {})}
                    >
                        <TrainingPlayTable
                            whiteBall={shot.white}
                            yellowBall={shot.yellow}
                            redBall={shot.red}
                            trajectory={shot.cueBallTrajectory}
                            trajectoryColor={color}
                            isSimulating={isSimulating}
                            onSimulationEnd={() => setIsSimulating(false)}
                            showGrid={true}
                            showDiamondNumbers={true}
                            style={{ width: '100%', aspectRatio: 316 / 174 }}
                        />

                        {/* Floating Simulation Badge on the table */}
                        <View
                            style={[
                                styles.tableSimulateBadge,
                                {
                                    backgroundColor: isSimulating ? `${color}E6` : 'rgba(10, 16, 13, 0.78)',
                                    borderColor: isSimulating ? '#FFFFFF' : `${color}55`,
                                },
                            ]}
                        >
                            <IconPlayerPlay size={12} color="#FFFFFF" strokeWidth={2.4} />
                            <Text style={styles.tableSimulateBadgeText}>
                                {isSimulating
                                    ? labels.simulating
                                    : (selectedLang === 'en'
                                        ? 'Tap to simulate'
                                        : selectedLang === 'ko'
                                        ? '터치하여 시뮬레이션'
                                        : 'Toca para simular')}
                            </Text>
                        </View>
                    </Pressable>
                </View>

                {/* Tactical Parameters Visualizer (wide sidebar) */}
                {isWide && (
                    <View style={styles.infoSidebar}>
                        <BallTacticsVisualizer
                            ballThickness={shot.ballThickness}
                            effectX={shot.effectX}
                            effectY={shot.effectY}
                            railSpeed={shot.railSpeed}
                            categoryColor={color}
                            isDifficult={shot.isDifficult}
                            isPosition={shot.isPosition}
                            isDefense={shot.isDefense}
                            lang={selectedLang}
                            compact={true}
                            isDark={isDark}
                        />
                    </View>
                )}
            </View>

            {/* Tactical Parameters Visualizer (mobile) */}
            {!isWide && (
                <BallTacticsVisualizer
                    ballThickness={shot.ballThickness}
                    effectX={shot.effectX}
                    effectY={shot.effectY}
                    railSpeed={shot.railSpeed}
                    categoryColor={color}
                    isDifficult={shot.isDifficult}
                    isPosition={shot.isPosition}
                    isDefense={shot.isDefense}
                    lang={selectedLang}
                    compact={false}
                    isDark={isDark}
                />
            )}

            {/* Description */}
            {localized.description ? (
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: palette.text }]}>{labels.description}</Text>
                        <Text style={[styles.langSourceBadge, { color: palette.muted }]}>
                            {labels.originalNotice}
                        </Text>
                    </View>
                    <Text style={[styles.bodyText, { color: palette.muted }]}>{localized.description}</Text>
                </View>
            ) : null}

            {/* Tips */}
            {localized.tips ? (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: palette.text }]}>{labels.tips}</Text>
                    <Text style={[styles.bodyText, { color: palette.muted }]}>{localized.tips}</Text>
                </View>
            ) : null}

            {/* YouTube link */}
            {shot.youtubeUrl ? (
                <View style={styles.section}>
                    <Pressable
                        onPress={() => {
                            if (Platform.OS === 'web') {
                                window.open(shot.youtubeUrl!, '_blank');
                            }
                        }}
                    >
                        <Text style={{ color: '#EF4444', fontSize: 14 }}>
                            {labels.youtube}
                        </Text>
                    </Pressable>
                </View>
            ) : null}

            {/* Action buttons: Entrenar & Simular */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Pressable
                    style={[styles.simulateBtn, { flex: 1, backgroundColor: '#0d5e2f' }]}
                    onPress={() => {
                        setModalVisible(false);
                        if (onClose) {
                            onClose();
                        }
                        router.replace({ pathname: '/training/session', params: { shotId: String(shot.id) } });
                    }}
                >
                    <IconTarget size={18} color="#fff" />
                    <Text style={styles.simulateBtnText}>{labels.train}</Text>
                </Pressable>
                <Pressable
                    style={[styles.simulateBtn, { flex: 1, backgroundColor: color }]}
                    onPress={handleSimulateFromButton}
                >
                    <IconPlayerPlay size={18} color="#fff" />
                    <Text style={styles.simulateBtnText}>
                        {isSimulating ? labels.simulating : labels.simulate}
                    </Text>
                </Pressable>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );

    // On web, render as a modal overlay
    if (Platform.OS === 'web' && !propShotId) {
        if (!modalVisible) return null;
        return (
            <Modal transparent animationType="fade" visible={modalVisible} onRequestClose={handleClose}>
                <Pressable style={styles.webOverlay} onPress={handleClose}>
                    <Pressable style={styles.webModal} onPress={(e) => e.stopPropagation()}>
                        {content}
                    </Pressable>
                </Pressable>
            </Modal>
        );
    }

    return content;
}

function InfoRow({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: muted }]}>{label}</Text>
            <Text style={[styles.infoValue, { color }]}>{value}</Text>
        </View>
    );
}

function Tag({ label, color }: { label: string; color: string }) {
    return (
        <View style={[styles.tag, { backgroundColor: color + '18', borderColor: color + '40' }]}>
            <Text style={[styles.tagText, { color }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' } as ViewStyle,
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 } as ViewStyle,
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(128,128,128,0.1)' } as ViewStyle,
    favoriteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
    } as ViewStyle,
    favoriteBtnText: {
        fontSize: 13,
        fontWeight: '600',
    } as TextStyle,
    badgeAndLangRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    } as ViewStyle,
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 } as ViewStyle,
    badgeDot: { width: 8, height: 8, borderRadius: 4 } as ViewStyle,
    badgeText: { fontSize: 13, fontWeight: '600' },
    langSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 3,
        borderRadius: 20,
        borderWidth: 1,
        gap: 2,
    } as ViewStyle,
    langButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    } as ViewStyle,
    langButtonText: {
        fontSize: 11.5,
        fontWeight: '500',
    },
    tableContainer: { marginBottom: 16 } as ViewStyle,
    tableWrap: { width: '100%' } as ViewStyle,
    tableInner: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', position: 'relative' } as ViewStyle,
    tableSimulateBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 5,
        elevation: 4,
    } as ViewStyle,
    tableSimulateBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    infoSidebar: { width: 340, gap: 12 } as ViewStyle,
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 } as ViewStyle,
    infoRow: { gap: 2 } as ViewStyle,
    infoLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 15, fontWeight: '600' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 } as ViewStyle,
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 } as ViewStyle,
    tagText: { fontSize: 12, fontWeight: '600' },
    section: { marginBottom: 20 } as ViewStyle,
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        gap: 8,
    } as ViewStyle,
    sectionTitle: { fontSize: 15, fontWeight: '700' },
    langSourceBadge: { fontSize: 11, fontStyle: 'italic' },
    bodyText: { fontSize: 14, lineHeight: 21 },
    simulateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 } as ViewStyle,
    simulateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    webOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: 12 } as ViewStyle,
    webModal: { width: '95vw', maxWidth: 1100, maxHeight: '92vh', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' } as any,
});
