import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/useAuth';
import { adaptCatalogShotList, type CatalogShot } from '@/src/infrastructure/catalog/shotAdapter';
import {
    fetchCatalog,
    fetchCategories,
    toggleFavoriteShot,
    type CategoryCount,
} from '@/src/infrastructure/catalog/catalogApi';

export function useShotCatalog() {
    const { user } = useAuth();
    const userId = user?.id || 'guest';

    const [shots, setShots] = useState<CatalogShot[]>([]);
    const [categories, setCategories] = useState<CategoryCount[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [offset, setOffset] = useState(0);
    const limit = 30;

    const load = useCallback(async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
                setOffset(0);
            } else {
                setLoadingMore(true);
            }
            setError(null);

            const currentOffset = reset ? 0 : offset;
            const res = await fetchCatalog({
                category: selectedCategory,
                search: searchQuery || undefined,
                onlyFavorites,
                userId,
                limit,
                offset: currentOffset,
            });

            const adapted = adaptCatalogShotList(res.shots);

            if (reset) {
                setShots(adapted);
            } else {
                setShots((prev) => [...prev, ...adapted]);
            }
            setTotal(res.total);
            setOffset(currentOffset + limit);
        } catch (e: any) {
            setError(e.message ?? 'Error loading shots');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedCategory, searchQuery, onlyFavorites, userId, offset]);

    const loadCategories = useCallback(async () => {
        try {
            const cats = await fetchCategories();
            setCategories(cats);
        } catch {}
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        load(true);
    }, [selectedCategory, searchQuery, onlyFavorites, userId]);

    const loadMore = useCallback(() => {
        if (!loadingMore && shots.length < total) {
            load(false);
        }
    }, [loadingMore, shots.length, total, load]);

    const refresh = useCallback(() => {
        load(true);
    }, [load]);

    const toggleFavorite = useCallback(
        async (shotId: number) => {
            // Optimistic update
            setShots((prev) =>
                prev.map((s) => (s.id === shotId ? { ...s, isFavorite: !s.isFavorite } : s))
            );

            try {
                const res = await toggleFavoriteShot(shotId, userId);
                setShots((prev) =>
                    prev.map((s) => (s.id === shotId ? { ...s, isFavorite: res.isFavorite } : s))
                );
                if (onlyFavorites && !res.isFavorite) {
                    setShots((prev) => prev.filter((s) => s.id !== shotId));
                    setTotal((prev) => Math.max(0, prev - 1));
                }
            } catch (err) {
                // Rollback on error
                setShots((prev) =>
                    prev.map((s) => (s.id === shotId ? { ...s, isFavorite: !s.isFavorite } : s))
                );
            }
        },
        [userId, onlyFavorites]
    );

    return {
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
        loadMore,
        refresh,
        toggleFavorite,
    };
}

