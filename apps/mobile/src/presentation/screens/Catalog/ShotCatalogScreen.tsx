import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import {
    IconSearch,
    IconX,
    IconSparkles,
    IconTarget,
    IconAdjustments,
} from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShotCatalog } from '@/src/presentation/hooks/useShotCatalog';
import { useColorScheme } from '@/components/useColorScheme';
import { getPalette, theme } from '@/constants/theme';
import { useSidebarWidth } from '@/components/LayoutContext';
import { useI18n } from '@/components/useLanguage';
import { ShotCatalogCard } from '@/src/presentation/components/Catalog/ShotCatalogCard';
import { getLocalizedCategoryName, type CatalogShot } from '@/src/infrastructure/catalog/shotAdapter';

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

export interface ShotCatalogScreenProps {
    onSelectShot?: (shot: CatalogShot) => void;
    mode?: 'default' | 'picker';
    onClosePicker?: () => void;
}

export function ShotCatalogScreen({
    onSelectShot,
    mode = 'default',
    onClosePicker,
}: ShotCatalogScreenProps) {
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const { width: windowWidth } = useWindowDimensions();
    const sidebarWidth = useSidebarWidth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { language } = useI18n();

    const isPickerMode = mode === 'picker';
    const contentWidth = isPickerMode ? windowWidth : windowWidth - sidebarWidth;
    const isWide = contentWidth >= 800;
    const paddingHorizontal = isWide ? theme.spacing.lg : theme.spacing.md;
    const paddingTop = isPickerMode ? Math.max(insets.top, 16) : 16;

    const {
        shots,
        categories,
        total,
        loading,
        loadingMore,
        error,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        loadMore,
    } = useShotCatalog();

    const handlePressDetail = useCallback(
        (shot: CatalogShot) => {
            router.push({ pathname: '/catalog/[shotId]', params: { shotId: String(shot.id) } });
        },
        [router]
    );

    const handleTrainShot = useCallback(
        (shot: CatalogShot) => {
            if (onSelectShot) {
                onSelectShot(shot);
                if (onClosePicker) {
                    onClosePicker();
                }
            } else {
                router.push({
                    pathname: '/training/session',
                    params: { shotId: String(shot.id) },
                });
            }
        },
        [onSelectShot, onClosePicker, router]
    );

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            {/* Top Bar Header */}
            <View style={[styles.header, { paddingHorizontal, paddingTop, borderColor: palette.border }]}>
                <View style={styles.headerTitleRow}>
                    <View style={styles.headerTitles}>
                        <View style={styles.badgeRow}>
                            <View style={[styles.pillBadge, { backgroundColor: `${palette.primary}18`, borderColor: `${palette.primary}33` }]}>
                                <IconSparkles size={13} color={palette.primary} />
                                <Text style={[styles.pillBadgeText, { color: palette.primary }]}>
                                    {isPickerMode ? 'SELECTOR DE ENTRENAMIENTO' : 'BIBLIA DE CARAMBOLAS UMB'}
                                </Text>
                            </View>
                            <Text style={[styles.totalCountText, { color: palette.muted }]}>
                                {total.toLocaleString()} jugadas
                            </Text>
                        </View>
                        <Text style={[styles.title, { color: palette.text }]}>
                            {isPickerMode ? 'Elige una Jugada para Entrenar' : 'Catálogo de Jugadas'}
                        </Text>
                        <Text style={[styles.subtitle, { color: palette.muted }]}>
                            {isPickerMode
                                ? 'Selecciona la posición que deseas añadir a tu mesa de práctica.'
                                : 'Explora tiros profesionales con diagramas balísticos, efectos y trayectorias exactas.'}
                        </Text>
                    </View>

                    {isPickerMode && onClosePicker ? (
                        <TouchableOpacity
                            style={[styles.closeBtn, { backgroundColor: palette.surfaceLow }]}
                            onPress={onClosePicker}
                            accessibilityLabel="Cerrar selector">
                            <IconX size={20} color={palette.text} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.quickStartBtn, { backgroundColor: palette.primary }]}
                            onPress={() => router.push('/training/session')}
                            activeOpacity={0.85}>
                            <IconTarget size={18} color="#FFFFFF" strokeWidth={2.2} />
                            <Text style={styles.quickStartBtnText}>Sesión Libre</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search & Filter Bar */}
                <View style={styles.searchRow}>
                    <View style={[styles.searchInputWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
                        <IconSearch size={18} color={palette.muted} strokeWidth={2} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Buscar por ID, efecto, jugador, categoría..."
                            placeholderTextColor={palette.muted}
                            style={[styles.searchInput, { color: palette.text }]}
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                                <IconX size={16} color={palette.muted} strokeWidth={2} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {/* Horizontal Category Filter Pills Carousel */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesScroll}>
                    {/* All categories pill */}
                    <TouchableOpacity
                        style={[
                            styles.categoryChip,
                            !selectedCategory
                                ? [styles.categoryChipActive, { backgroundColor: palette.primary, borderColor: palette.primary }]
                                : [styles.categoryChipInactive, { backgroundColor: palette.card, borderColor: palette.border }],
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedCategory(undefined)}>
                        <Text
                            style={[
                                styles.categoryChipText,
                                !selectedCategory ? styles.categoryChipTextActive : { color: palette.muted },
                            ]}>
                            Todas ({total})
                        </Text>
                    </TouchableOpacity>

                    {/* Specific categories */}
                    {categories.map((item) => {
                        const isActive = item.category === selectedCategory;
                        const catColor = CATEGORY_COLORS[item.category] ?? palette.primary;
                        return (
                            <TouchableOpacity
                                key={item.category}
                                style={[
                                    styles.categoryChip,
                                    isActive
                                        ? [styles.categoryChipActive, { backgroundColor: catColor, borderColor: catColor }]
                                        : [styles.categoryChipInactive, { backgroundColor: palette.card, borderColor: palette.border }],
                                ]}
                                activeOpacity={0.8}
                                onPress={() => setSelectedCategory(isActive ? undefined : item.category)}>
                                <View
                                    style={[
                                        styles.categoryDot,
                                        { backgroundColor: isActive ? '#FFFFFF' : catColor },
                                    ]}
                                />
                                <Text
                                    style={[
                                        styles.categoryChipText,
                                        isActive ? styles.categoryChipTextActive : { color: palette.text },
                                    ]}>
                                    {getLocalizedCategoryName(item.category, language === 'en' ? 'en' : 'es')} ({item.count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Content Body: Grid of Shots */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={palette.primary} />
                    <Text style={[styles.loadingText, { color: palette.muted }]}>
                        Cargando catálogo balístico...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingHorizontal, paddingBottom: 100 },
                    ]}
                    onScroll={(e) => {
                        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                        if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 250) {
                            loadMore();
                        }
                    }}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}>
                    {shots.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <IconAdjustments size={40} color={palette.muted} strokeWidth={1.5} />
                            <Text style={[styles.emptyTitle, { color: palette.text }]}>
                                No se encontraron jugadas
                            </Text>
                            <Text style={[styles.emptyDesc, { color: palette.muted }]}>
                                Prueba ajustando tu búsqueda o seleccionando otra categoría.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.cardsGrid}>
                            {shots.map((shot) => (
                                <View key={shot.id} style={styles.cardItem}>
                                    <ShotCatalogCard
                                        shot={shot}
                                        onPress={handlePressDetail}
                                        onTrain={handleTrainShot}
                                        palette={palette}
                                        isPickerMode={isPickerMode}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {loadingMore ? (
                        <View style={styles.loadingMoreWrap}>
                            <ActivityIndicator size="small" color={palette.primary} />
                        </View>
                    ) : null}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    headerTitles: {
        flex: 1,
        gap: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: theme.radius.full,
        borderWidth: 1,
    },
    pillBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    totalCountText: {
        fontSize: 12,
        fontWeight: '600',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickStartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radius.md,
    },
    quickStartBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchInputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 42,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        paddingVertical: 0,
    },
    categoriesScroll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 2,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radius.sm,
        borderWidth: 1,
    },
    categoryChipActive: {},
    categoryChipInactive: {},
    categoryDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    categoryChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    scrollContent: {
        paddingTop: 16,
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    cardItem: {
        flexGrow: 1,
        flexBasis: 300,
        maxWidth: 600,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
    },
    loadingText: {
        fontSize: 13,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    emptyDesc: {
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 320,
    },
    loadingMoreWrap: {
        paddingVertical: 24,
        alignItems: 'center',
    },
});
