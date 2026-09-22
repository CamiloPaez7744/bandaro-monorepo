import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { IconSearch, IconAdjustments, IconX } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';

import { useShotCatalog } from '@/src/presentation/hooks/useShotCatalog';
import { useColorScheme } from '@/components/useColorScheme';
import { getPalette } from '@/constants/theme';
import { useSidebarWidth } from '@/components/LayoutContext';
import { ShotCatalogCard } from '@/src/presentation/components/Catalog/ShotCatalogCard';
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

const CARD_GAP = 16;

export function ShotCatalogScreen({ onSelectShot }: { onSelectShot?: (shot: CatalogShot) => void }) {
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const { width: windowWidth } = useWindowDimensions();
    const sidebarWidth = useSidebarWidth();
    const router = useRouter();

    const contentWidth = windowWidth - sidebarWidth;
    const containerPadding = contentWidth >= 1024 ? 24 : 16;

    const [filtersVisible, setFiltersVisible] = useState(false);

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

    const handlePress = useCallback(
        (shot: CatalogShot) => {
            if (onSelectShot) {
                onSelectShot(shot);
            } else {
                router.push({ pathname: '/catalog/[shotId]', params: { shotId: String(shot.id) } });
            }
        },
        [onSelectShot, router]
    );

    const isDark = palette.background === '#112118';
    const activeFilterCount = selectedCategory ? 1 : 0;

    return (
        <View style={{ flex: 1, backgroundColor: palette.background }}>
            {/* Header */}
            <View style={{ paddingHorizontal: containerPadding, paddingTop: 16, paddingBottom: 8 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: palette.text }}>
                    Catálogo de Jugadas
                </Text>
                <Text style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}>
                    {total.toLocaleString()} jugadas de billiard-bible.com
                </Text>
            </View>

            {/* Search bar + Filter button */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: containerPadding,
                paddingBottom: 12,
                gap: 8,
            }}>
                {/* Search input */}
                <View style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? '#1a2f24' : '#f1f5f9',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#274a39' : '#e2e8f0',
                    paddingHorizontal: 12,
                    height: 42,
                }}>
                    <IconSearch size={18} color={palette.muted} strokeWidth={2} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Buscar por ID, jugador, club..."
                        placeholderTextColor={palette.muted}
                        style={{
                            flex: 1,
                            marginLeft: 8,
                            fontSize: 13,
                            color: palette.text,
                            outlineStyle: 'none',
                        } as any}
                    />
                    {searchQuery ? (
                        <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                            <IconX size={16} color={palette.muted} strokeWidth={2} />
                        </Pressable>
                    ) : null}
                </View>

                {/* Filter toggle button */}
                <Pressable
                    onPress={() => setFiltersVisible((v) => !v)}
                    style={({ pressed }) => ({
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: filtersVisible
                            ? palette.primary
                            : isDark ? '#1a2f24' : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: filtersVisible
                            ? 'transparent'
                            : isDark ? '#274a39' : '#e2e8f0',
                        opacity: pressed ? 0.8 : 1,
                    })}
                >
                    <IconAdjustments
                        size={18}
                        color={filtersVisible ? '#fff' : palette.muted}
                        strokeWidth={2}
                    />
                    {activeFilterCount > 0 && !filtersVisible ? (
                        <View style={{
                            position: 'absolute',
                            top: -3,
                            right: -3,
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: palette.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
                                {activeFilterCount}
                            </Text>
                        </View>
                    ) : null}
                </Pressable>
            </View>

            {/* Collapsible filter panel */}
            {filtersVisible ? (
                <View style={{
                    paddingHorizontal: containerPadding,
                    paddingBottom: 12,
                }}>
                    <View style={{
                        backgroundColor: isDark ? '#1a2f24' : '#f8fafc',
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: isDark ? '#274a39' : '#e2e8f0',
                        padding: 12,
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}>
                            <Text style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: palette.text,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}>
                                Categoría
                            </Text>
                            {selectedCategory ? (
                                <Pressable onPress={() => setSelectedCategory(undefined)}>
                                    <Text style={{
                                        fontSize: 11,
                                        fontWeight: '600',
                                        color: palette.primary,
                                    }}>
                                        Limpiar
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                        <View style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 6,
                        }}>
                            {/* All pill */}
                            <Pressable
                                onPress={() => setSelectedCategory(undefined)}
                                style={({ pressed }) => ({
                                    backgroundColor: !selectedCategory ? palette.primary : (isDark ? '#274a39' : '#e2e8f0'),
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    opacity: pressed ? 0.7 : 1,
                                })}
                            >
                                <Text style={{
                                    fontSize: 11,
                                    fontWeight: '600',
                                    color: !selectedCategory ? '#fff' : palette.muted,
                                }}>
                                    Todas ({total})
                                </Text>
                            </Pressable>

                            {categories.map((item) => {
                                const isActive = item.category === selectedCategory;
                                const catColor = CATEGORY_COLORS[item.category] ?? palette.muted;
                                return (
                                    <Pressable
                                        key={item.category}
                                        onPress={() => setSelectedCategory(isActive ? undefined : item.category)}
                                        style={({ pressed }) => ({
                                            backgroundColor: isActive ? catColor : (isDark ? '#274a39' : '#e2e8f0'),
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            opacity: pressed ? 0.7 : 1,
                                        })}
                                    >
                                        <Text style={{
                                            fontSize: 11,
                                            fontWeight: '600',
                                            color: isActive ? '#fff' : palette.muted,
                                        }}>
                                            {CATEGORY_NAMES[item.category] ?? item.category} ({item.count})
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                </View>
            ) : null}

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={palette.primary} />
                    <Text style={{ marginTop: 8, color: palette.muted }}>Cargando jugadas...</Text>
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: palette.danger, fontSize: 14 }}>{error}</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{
                        paddingHorizontal: containerPadding,
                        paddingTop: 8,
                        paddingBottom: 80,
                    }}
                    onScroll={(e) => {
                        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                        if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 200) {
                            loadMore();
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: CARD_GAP,
                    }}>
                        {shots.map((shot) => (
                            <View key={shot.id} style={{ flexGrow: 1, flexBasis: 300 }}>
                                <ShotCatalogCard shot={shot} onPress={handlePress} palette={palette} />
                            </View>
                        ))}
                    </View>
                    {loadingMore ? (
                        <View style={{ paddingVertical: 16 }}>
                            <ActivityIndicator size="small" color={palette.primary} />
                        </View>
                    ) : null}
                    {shots.length === 0 ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ color: palette.muted, fontSize: 14 }}>No se encontraron jugadas</Text>
                        </View>
                    ) : null}
                </ScrollView>
            )}
        </View>
    );
}
