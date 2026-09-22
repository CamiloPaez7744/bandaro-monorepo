import { useEffect, useState } from 'react';
import {
    Platform, Pressable, ScrollView, Text, View,
    useWindowDimensions, Modal, StyleSheet, type ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { IconX, IconPlayerPlay, IconBookmark } from '@tabler/icons-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { getPalette } from '@/constants/theme';
import { useSidebarWidth } from '@/components/LayoutContext';
import { BilliardsTableThumbnail } from '@/src/presentation/components/Training/BilliardsTableThumbnail';
import { fetchShotDetail, type CatalogShotRaw } from '@/src/infrastructure/catalog/catalogApi';
import { adaptCatalogShot, type CatalogShot } from '@/src/infrastructure/catalog/shotAdapter';

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
    big_spin: 'Gran Rotación',
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
    const { width: windowWidth } = useWindowDimensions();
    const sidebarWidth = useSidebarWidth();

    const shotId = propShotId ?? (params.shotId ? parseInt(params.shotId, 10) : undefined);
    const [shot, setShot] = useState<CatalogShot | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!shotId) return;
        setLoading(true);
        fetchShotDetail(shotId)
            .then((raw) => setShot(adaptCatalogShot(raw)))
            .catch(() => setShot(null))
            .finally(() => setLoading(false));
    }, [shotId]);

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            router.back();
        }
    };

    const color = shot ? (CATEGORY_COLORS[shot.category] ?? '#6B7280') : '#6B7280';
    const isWide = windowWidth - sidebarWidth >= 600;

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: palette.background } as any]}>
                <Text style={{ color: palette.muted }}>Cargando tiro...</Text>
            </View>
        );
    }

    if (!shot) {
        return (
            <View style={[styles.center, { backgroundColor: palette.background } as any]}>
                <Text style={{ color: palette.muted }}>Tiro no encontrado</Text>
                <Pressable onPress={handleClose} style={{ marginTop: 16 }}>
                    <Text style={{ color: color }}>Cerrar</Text>
                </Pressable>
            </View>
        );
    }

    const content = (
        <ScrollView
            style={{ flex: 1, backgroundColor: palette.background } as any}
            contentContainerStyle={{ padding: isWide ? 32 : 16, maxWidth: 800, alignSelf: 'center', width: '100%' }}
        >
            {/* Close button */}
            <View style={styles.headerRow}>
                <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
                    <IconX size={20} color={palette.muted} />
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable hitSlop={8} style={styles.closeBtn}>
                    <IconBookmark size={18} color={palette.muted} />
                </Pressable>
            </View>

            {/* Category badge */}
            <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                <View style={[styles.badgeDot, { backgroundColor: color }]} />
                <Text style={[styles.badgeText, { color }]}>
                    {CATEGORY_NAMES[shot.category] ?? shot.category}
                </Text>
            </View>

            {/* Table */}
            <View style={[styles.tableContainer, isWide && { flexDirection: 'row', gap: 24 }]}>
                <View style={[styles.tableWrap, isWide && { flex: 1 }]}>
                    <View style={[styles.tableInner, { borderColor: color + '30' }]}>
                        <BilliardsTableThumbnail
                            balls={[
                                { id: 'white', x: shot.white.x, y: shot.white.y, color: '#FFFFFF', border: '#CCCCCC' },
                                { id: 'yellow', x: shot.yellow.x, y: shot.yellow.y, color: '#FBBF24', border: '#D97706' },
                                { id: 'red', x: shot.red.x, y: shot.red.y, color: '#EF4444', border: '#B91C1C' },
                            ]}
                            paths={[
                                { id: 'cue', points: shot.cueBallTrajectory, color, width: 2.5, opacity: 1 },
                                { id: 'obj1', points: shot.objectBall1Trajectory, color: '#FBBF24', width: 1.5, dash: [5, 4], opacity: 0.6 },
                                { id: 'obj2', points: shot.objectBall2Trajectory, color: '#EF4444', width: 1.5, dash: [5, 4], opacity: 0.6 },
                            ]}
                            showPath
                            style={{ width: '100%', aspectRatio: 2 / 1 }}
                        />
                    </View>
                </View>

                {/* Info sidebar (wide) */}
                {isWide && (
                    <View style={styles.infoSidebar}>
                        <InfoRow label="Grosor" value={`${shot.ballThickness}`} color={palette.text} muted={palette.muted} />
                        <InfoRow label="Velocidad" value={`${shot.railSpeed} rieles`} color={palette.text} muted={palette.muted} />
                        <InfoRow label="Efecto X" value={`${shot.effectX > 0 ? '+' : ''}${shot.effectX}`} color={palette.text} muted={palette.muted} />
                        <InfoRow label="Efecto Y" value={`${shot.effectY > 0 ? '+' : ''}${shot.effectY}`} color={palette.text} muted={palette.muted} />
                        {shot.isDifficult && <Tag label="Difícil" color="#EF4444" />}
                        {shot.isPosition && <Tag label="Posición" color="#3B82F6" />}
                        {shot.isDefense && <Tag label="Defensa" color="#10B981" />}
                    </View>
                )}
            </View>

            {/* Info row (mobile) */}
            {!isWide && (
                <View style={styles.infoGrid}>
                    <InfoRow label="Grosor" value={`${shot.ballThickness}`} color={palette.text} muted={palette.muted} />
                    <InfoRow label="Velocidad" value={`${shot.railSpeed} rieles`} color={palette.text} muted={palette.muted} />
                    <InfoRow label="Efecto X" value={`${shot.effectX > 0 ? '+' : ''}${shot.effectX}`} color={palette.text} muted={palette.muted} />
                    <InfoRow label="Efecto Y" value={`${shot.effectY > 0 ? '+' : ''}${shot.effectY}`} color={palette.text} muted={palette.muted} />
                </View>
            )}

            {/* Tags (mobile) */}
            {!isWide && (
                <View style={styles.tagsRow}>
                    {shot.isDifficult && <Tag label="Difícil" color="#EF4444" />}
                    {shot.isPosition && <Tag label="Posición" color="#3B82F6" />}
                    {shot.isDefense && <Tag label="Defensa" color="#10B981" />}
                </View>
            )}

            {/* Description */}
            {shot.description ? (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: palette.text }]}>Descripción</Text>
                    <Text style={[styles.bodyText, { color: palette.muted }]}>{shot.description}</Text>
                </View>
            ) : null}

            {/* Tips */}
            {shot.tips ? (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: palette.text }]}>Consejos</Text>
                    <Text style={[styles.bodyText, { color: palette.muted }]}>{shot.tips}</Text>
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
                            Ver en YouTube
                        </Text>
                    </Pressable>
                </View>
            ) : null}

            {/* Simulate button */}
            <Pressable
                style={[styles.simulateBtn, { backgroundColor: color }]}
                onPress={() => {
                    if (onSimulate) {
                        onSimulate(shot);
                    } else {
                        router.push({ pathname: '/training/simulate', params: { shotId: String(shot.id) } });
                    }
                }}
            >
                <IconPlayerPlay size={18} color="#fff" />
                <Text style={styles.simulateBtnText}>Simular tiro</Text>
            </Pressable>

            <View style={{ height: 40 }} />
        </ScrollView>
    );

    // On web, render as a modal overlay
    if (Platform.OS === 'web' && !propShotId) {
        return (
            <Modal transparent animationType="fade" visible onRequestClose={handleClose}>
                <View style={styles.webOverlay}>
                    <View style={styles.webModal}>
                        {content}
                    </View>
                </View>
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
    badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 16, gap: 6 } as ViewStyle,
    badgeDot: { width: 8, height: 8, borderRadius: 4 } as ViewStyle,
    badgeText: { fontSize: 13, fontWeight: '600' },
    tableContainer: { marginBottom: 16 } as ViewStyle,
    tableWrap: { width: '100%' } as ViewStyle,
    tableInner: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
    infoSidebar: { width: 200, gap: 12 } as ViewStyle,
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 } as ViewStyle,
    infoRow: { gap: 2 } as ViewStyle,
    infoLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 15, fontWeight: '600' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 } as ViewStyle,
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 } as ViewStyle,
    tagText: { fontSize: 12, fontWeight: '600' },
    section: { marginBottom: 20 } as ViewStyle,
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
    bodyText: { fontSize: 14, lineHeight: 21 },
    simulateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 } as ViewStyle,
    simulateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    webOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' } as ViewStyle,
    webModal: { width: '90vw', maxWidth: 800, maxHeight: '90vh', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20 } as any,
});
