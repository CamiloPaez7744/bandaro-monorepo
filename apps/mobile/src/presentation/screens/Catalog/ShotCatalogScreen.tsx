import { useCallback, useState, useRef, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import {
    IconSearch,
    IconX,
    IconTarget,
    IconAdjustments,
    IconBookmark,
    IconChevronLeft,
    IconChevronRight,
    IconSparkles,
    IconUserPlus,
    IconLock,
} from '@/src/presentation/components/icons';
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
    const { language, t } = useI18n();

    const isPickerMode = mode === 'picker';
    const contentWidth = isPickerMode ? windowWidth : windowWidth - sidebarWidth;
    const isWide = contentWidth >= 800;
    const numCols = isWide ? (contentWidth > 1100 ? 3 : 2) : 1;
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
        onlyFavorites,
        setOnlyFavorites,
        searchQuery,
        setSearchQuery,
        selectCategory,
        toggleOnlyFavorites,
        resetFilters,
        loadMore,
        toggleFavorite,
        isGuestPreview,
        totalAvailable,
        catalogTotal,
        favoritesCount,
        previewLimit,
    } = useShotCatalog();

    const categoriesScrollRef = useRef<ScrollView>(null);
    const isDraggingRef = useRef(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Enable mouse drag-to-scroll and horizontal mouse wheel on web
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const node = (categoriesScrollRef.current as any)?.getScrollableNode?.() || (categoriesScrollRef.current as any);
        if (!node) return;

        const updateScrollArrows = () => {
            if (!node) return;
            const hasOverflow = node.scrollWidth > node.clientWidth + 2;
            setCanScrollLeft(node.scrollLeft > 4);
            setCanScrollRight(hasOverflow && node.scrollLeft < node.scrollWidth - node.clientWidth - 4);
        };

        const timer = setTimeout(updateScrollArrows, 100);

        let isDown = false;
        let startX = 0;
        let scrollStart = 0;

        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            isDown = true;
            isDraggingRef.current = false;
            startX = e.pageX;
            scrollStart = node.scrollLeft;
            node.style.cursor = 'grabbing';
            node.style.userSelect = 'none';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            const deltaX = e.pageX - startX;
            if (Math.abs(deltaX) > 4) {
                isDraggingRef.current = true;
            }
            node.scrollLeft = scrollStart - deltaX;
            updateScrollArrows();
        };

        const onMouseUp = () => {
            if (!isDown) return;
            isDown = false;
            node.style.cursor = 'grab';
            node.style.removeProperty('user-select');
            setTimeout(() => {
                isDraggingRef.current = false;
            }, 60);
            updateScrollArrows();
        };

        const onWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                node.scrollLeft += e.deltaY;
                e.preventDefault();
                updateScrollArrows();
            }
        };

        const onScroll = () => {
            updateScrollArrows();
        };

        node.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        node.addEventListener('wheel', onWheel, { passive: false });
        node.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', updateScrollArrows);

        node.style.cursor = 'grab';
        node.style.overflowX = 'auto';

        return () => {
            clearTimeout(timer);
            node.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            node.removeEventListener('wheel', onWheel);
            node.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', updateScrollArrows);
        };
    }, [categories]);

    const handleScrollStep = useCallback((direction: 'left' | 'right') => {
        const node = (categoriesScrollRef.current as any)?.getScrollableNode?.() || (categoriesScrollRef.current as any);
        if (!node) return;
        const offset = direction === 'left' ? -260 : 260;
        node.scrollBy({ left: offset, behavior: 'smooth' });
    }, []);

    const handleChipPress = useCallback((action: () => void) => {
        if (isDraggingRef.current) return;
        action();
    }, []);

    const handlePressDetail = useCallback(
        (shot: CatalogShot) => {
            router.push({ pathname: '/catalog/[shotId]', params: { shotId: String(shot.id) } });
        },
        [router]
    );

    const handleTrainShot = useCallback(
        (shot: CatalogShot) => {
            if (shot.isLocked) {
                const title = language === 'en' ? 'VIP Content' : 'Contenido Exclusivo';
                const msg = language === 'en'
                    ? 'This master shot is part of the VIP tier. Sign in or upgrade to unlock!'
                    : 'Esta carambola maestra es exclusiva para miembros. ¡Inicia sesión o actualiza para desbloquearla!';
                if (Platform.OS === 'web') {
                    window.alert(`${title}\n\n${msg}`);
                } else {
                    Alert.alert(title, msg);
                }
                return;
            }

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
        [onSelectShot, onClosePicker, router, language]
    );

    const renderCardItem = useCallback(
        ({ item: shot }: { item: CatalogShot }) => (
            <View style={[styles.cardItem, numCols > 1 ? { margin: 8 } : { marginBottom: 16 }]}>
                <ShotCatalogCard
                    shot={shot}
                    onPress={handlePressDetail}
                    onTrain={handleTrainShot}
                    onToggleFavorite={toggleFavorite}
                    palette={palette}
                    isPickerMode={isPickerMode}
                />
            </View>
        ),
        [handlePressDetail, handleTrainShot, toggleFavorite, palette, isPickerMode, numCols]
    );

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            {/* Top Bar Header */}
            <View style={[styles.header, { paddingHorizontal, paddingTop, borderColor: palette.border }]}>
                <View style={styles.headerTitleRow}>
                    <View style={styles.headerTitles}>
                        <Text style={[styles.title, { color: palette.text }]}>
                            {isPickerMode ? t('catalog.pickerTitle') : t('catalog.title')}
                        </Text>
                        <Text style={[styles.subtitle, { color: palette.muted }]}>
                            {isPickerMode ? t('catalog.pickerSubtitle') : t('catalog.subtitle')}
                        </Text>
                    </View>

                    {isPickerMode && onClosePicker ? (
                        <Pressable
                            style={[styles.closeBtn, { backgroundColor: palette.surfaceLow }]}
                            onPress={onClosePicker}
                            accessibilityLabel={language === 'en' ? 'Close picker' : 'Cerrar selector'}>
                            <IconX size={20} color={palette.text} />
                        </Pressable>
                    ) : (
                        <Pressable
                            style={[styles.quickStartBtn, { backgroundColor: palette.primary }]}
                            onPress={() => router.push('/training/session')}>
                            <IconTarget size={18} color="#FFFFFF" strokeWidth={2.2} />
                            <Text style={styles.quickStartBtnText}>{t('catalog.freeSession')}</Text>
                        </Pressable>
                    )}
                </View>

                {/* Search & Filter Bar */}
                <View style={styles.searchRow}>
                    <View style={[styles.searchInputWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
                        <IconSearch size={18} color={palette.muted} strokeWidth={2} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={t('catalog.searchPlaceholder')}
                            placeholderTextColor={palette.muted}
                            style={[styles.searchInput, { color: palette.text }]}
                        />
                        {searchQuery ? (
                            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                                <IconX size={16} color={palette.muted} strokeWidth={2} />
                            </Pressable>
                        ) : null}
                    </View>
                </View>

                {/* Guest Preview Invitation Banner */}
                {isGuestPreview && (
                    <View style={[styles.guestBanner, { backgroundColor: '#3B82F614', borderColor: '#3B82F644' }]}>
                        <View style={styles.guestBannerContent}>
                            <View style={[styles.guestBannerIconWrap, { backgroundColor: '#3B82F625' }]}>
                                <IconSparkles size={18} color="#60A5FA" />
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={[styles.guestBannerTitle, { color: palette.text }]}>
                                    {language === 'en' ? 'Guest Preview Sample' : 'Muestra reducida de 12 carambolas'}
                                </Text>
                                <Text style={[styles.guestBannerText, { color: palette.muted }]}>
                                    {language === 'en'
                                        ? `Showing ${shots.length} preview shots. Sign in for free to unlock all ${totalAvailable || 180}+ master plays and Spaced Repetition!`
                                        : `Mostrando ${shots.length} carambolas de muestra. ¡Inicia sesión gratis para ver las ${totalAvailable || 180}+ jugadas maestras y activar el repaso espaciado!`
                                    }
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            style={[styles.guestBannerAction, { backgroundColor: palette.primary }]}
                            onPress={() => router.push('/auth/login')}
                            accessibilityRole="button">
                            <IconUserPlus size={14} color="#FFFFFF" strokeWidth={2.2} />
                            <Text style={styles.guestBannerActionText}>
                                {language === 'en' ? 'Sign In Free' : 'Iniciar Sesión'}
                            </Text>
                        </Pressable>
                    </View>
                )}

                {/* Horizontal Category Filter Pills Carousel with Web Drag & Arrow Support */}
                <View style={styles.categoriesContainer}>
                    {Platform.OS === 'web' && canScrollLeft && (
                        <Pressable
                            style={[styles.scrollArrowBtn, styles.scrollArrowLeft, { backgroundColor: palette.card, borderColor: palette.border }]}
                            onPress={() => handleScrollStep('left')}
                            hitSlop={6}
                            accessibilityLabel="Desplazar categorías a la izquierda">
                            <IconChevronLeft size={16} color={palette.text} />
                        </Pressable>
                    )}

                    <ScrollView
                        ref={categoriesScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesScroll}
                        style={Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none' } as any) : undefined}>
                        {/* All categories pill */}
                        <Pressable
                            style={[
                                styles.categoryChip,
                                !selectedCategory && !onlyFavorites
                                    ? [styles.categoryChipActive, { backgroundColor: palette.primary, borderColor: palette.primary }]
                                    : [styles.categoryChipInactive, { backgroundColor: palette.card, borderColor: palette.border }],
                            ]}
                            onPress={() => handleChipPress(resetFilters)}>
                            <Text
                                style={[
                                    styles.categoryChipText,
                                    !selectedCategory && !onlyFavorites ? styles.categoryChipTextActive : { color: palette.muted },
                                ]}>
                                {t('catalog.allCategories', { total: catalogTotal || totalAvailable || total })}
                            </Text>
                        </Pressable>

                        {/* Guardadas / Favoritas pill */}
                        <Pressable
                            style={[
                                styles.categoryChip,
                                { flexDirection: 'row', alignItems: 'center', gap: 6 },
                                onlyFavorites
                                    ? [styles.categoryChipActive, { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }]
                                    : [styles.categoryChipInactive, { backgroundColor: palette.card, borderColor: palette.border }],
                            ]}
                            onPress={() => handleChipPress(toggleOnlyFavorites)}>
                            <IconBookmark
                                size={14}
                                color={onlyFavorites ? '#FFFFFF' : '#F59E0B'}
                                fill={onlyFavorites ? '#FFFFFF' : 'transparent'}
                            />
                            <Text
                                style={[
                                    styles.categoryChipText,
                                    onlyFavorites ? styles.categoryChipTextActive : { color: palette.text },
                                ]}>
                                {language === 'en' ? 'Favorites' : 'Guardadas'}
                                {favoritesCount > 0 ? ` (${favoritesCount})` : ''}
                            </Text>
                        </Pressable>

                        {/* Specific categories */}
                        {categories.map((item) => {
                            const isActive = item.category === selectedCategory;
                            const catColor = CATEGORY_COLORS[item.category] ?? palette.primary;
                            return (
                                <Pressable
                                    key={item.category}
                                    style={[
                                        styles.categoryChip,
                                        isActive
                                            ? [styles.categoryChipActive, { backgroundColor: catColor, borderColor: catColor }]
                                            : [styles.categoryChipInactive, { backgroundColor: palette.card, borderColor: palette.border }],
                                    ]}
                                    onPress={() => handleChipPress(() => selectCategory(item.category))}>
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
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    {Platform.OS === 'web' && canScrollRight && (
                        <Pressable
                            style={[styles.scrollArrowBtn, styles.scrollArrowRight, { backgroundColor: palette.card, borderColor: palette.border }]}
                            onPress={() => handleScrollStep('right')}
                            hitSlop={6}
                            accessibilityLabel="Desplazar categorías a la derecha">
                            <IconChevronRight size={16} color={palette.text} />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Content Body: Virtualized Grid of Shots */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={palette.primary} />
                    <Text style={[styles.loadingText, { color: palette.muted }]}>
                        {t('catalog.loading')}
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    key={`catalog_grid_${numCols}`}
                    data={shots}
                    keyExtractor={(item) => String(item.id)}
                    numColumns={numCols}
                    renderItem={renderCardItem}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingHorizontal, paddingBottom: 100 },
                    ]}
                    windowSize={3}
                    initialNumToRender={6}
                    maxToRenderPerBatch={6}
                    removeClippedSubviews={Platform.OS !== 'web'}
                    onEndReached={() => {
                        if (!loadingMore && shots.length < total) {
                            loadMore();
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {onlyFavorites ? (
                                <>
                                    <IconBookmark size={42} color="#F59E0B" fill="#F59E0B" />
                                    <Text style={[styles.emptyTitle, { color: palette.text }]}>
                                        {language === 'en' ? 'No saved shots yet' : 'Sin jugadas guardadas'}
                                    </Text>
                                    <Text style={[styles.emptyDesc, { color: palette.muted }]}>
                                        {language === 'en'
                                            ? 'Save your favorite shots using the bookmark icon to easily find them here.'
                                            : 'Guarda tus carambolas favoritas usando el ícono de marcador para tenerlas a mano.'}
                                    </Text>
                                    <Pressable
                                        style={[
                                            styles.resetFilterBtn,
                                            { backgroundColor: palette.card, borderColor: palette.border },
                                        ]}
                                        onPress={resetFilters}>
                                        <Text style={[styles.resetFilterBtnText, { color: palette.primary }]}>
                                            {language === 'en' ? 'Explore full catalog' : 'Explorar todo el catálogo'}
                                        </Text>
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    <IconAdjustments size={40} color={palette.muted} strokeWidth={1.5} />
                                    <Text style={[styles.emptyTitle, { color: palette.text }]}>
                                        {t('catalog.emptyTitle')}
                                    </Text>
                                    <Text style={[styles.emptyDesc, { color: palette.muted }]}>
                                        {t('catalog.emptyDesc')}
                                    </Text>
                                    {(selectedCategory || searchQuery) && (
                                        <Pressable
                                            style={[
                                                styles.resetFilterBtn,
                                                { backgroundColor: palette.card, borderColor: palette.border },
                                            ]}
                                            onPress={resetFilters}>
                                            <Text style={[styles.resetFilterBtnText, { color: palette.primary }]}>
                                                {language === 'en' ? 'Clear filters' : 'Limpiar filtros'}
                                            </Text>
                                        </Pressable>
                                    )}
                                </>
                            )}
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.loadingMoreWrap}>
                                <ActivityIndicator size="small" color={palette.primary} />
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    cardItem: {
        flex: 1,
        minWidth: 280,
        maxWidth: 600,
        ...(Platform.OS === 'web'
            ? ({
                  contentVisibility: 'auto',
                  containIntrinsicSize: '0 380px',
              } as any)
            : {}),
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
    categoriesContainer: {
        position: 'relative',
        width: '100%',
        justifyContent: 'center',
    },
    scrollArrowBtn: {
        position: 'absolute',
        zIndex: 10,
        top: '50%',
        marginTop: -15,
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.28)' }
            : { elevation: 3 }),
    },
    scrollArrowLeft: {
        left: -6,
    },
    scrollArrowRight: {
        right: -6,
    },
    categoriesScroll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        userSelect: 'none',
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
    resetFilterBtn: {
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    resetFilterBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    loadingMoreWrap: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    guestBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginTop: 10,
        gap: 12,
        flexWrap: 'wrap',
    },
    guestBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 240,
    },
    guestBannerIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    guestBannerText: {
        fontSize: 11.5,
        lineHeight: 16,
    },
    guestBannerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    guestBannerActionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
});
