import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/useAuth';
import { adaptCatalogShotList, type CatalogShot } from '@/src/infrastructure/catalog/shotAdapter';
import {
    fetchCatalog,
    fetchCategories,
    fetchFavoriteShotIds,
    toggleFavoriteShot,
    type CategoryCount,
} from '@/src/infrastructure/catalog/catalogApi';

export function useShotCatalog() {
    const { user, session } = useAuth();
    const userId = user?.id || 'guest';
    const accessToken = session?.accessToken;

    const [shots, setShots] = useState<CatalogShot[]>([]);
    const [categories, setCategories] = useState<CategoryCount[]>([]);
    const [total, setTotal] = useState(0);
    const [totalAvailable, setTotalAvailable] = useState(0);
    const [catalogTotal, setCatalogTotal] = useState(0);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [isGuestPreview, setIsGuestPreview] = useState(false);
    const [previewLimit, setPreviewLimit] = useState<number | null>(null);
    const [requiresLogin, setRequiresLogin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [offset, setOffset] = useState(0);
    const limit = 30;
    const requestIdRef = useRef(0);

    const load = useCallback(async (reset = false) => {
        const reqId = ++requestIdRef.current;
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
                accessToken,
            });

            if (reqId !== requestIdRef.current) return;

            const adapted = adaptCatalogShotList(res.shots);

            if (reset) {
                setShots(adapted);
            } else {
                setShots((prev) => [...prev, ...adapted]);
            }
            if (res.grandTotal) {
                setCatalogTotal(res.grandTotal);
            } else if (!onlyFavorites && !selectedCategory && !searchQuery && (res.totalAvailable || res.total)) {
                setCatalogTotal(res.totalAvailable ?? res.total);
            }

            setTotal(res.total);
            setTotalAvailable(res.totalAvailable ?? res.total);
            setIsGuestPreview(Boolean(res.isGuestPreview));
            setPreviewLimit(res.previewLimit ?? null);
            setRequiresLogin(Boolean(res.requiresLoginForFullCatalog));
            setOffset(currentOffset + limit);
        } catch (e: any) {
            if (reqId !== requestIdRef.current) return;
            setError(e.message ?? 'Error loading shots');
        } finally {
            if (reqId === requestIdRef.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [selectedCategory, searchQuery, onlyFavorites, userId, accessToken, offset]);

    const loadCategories = useCallback(async () => {
        try {
            const cats = await fetchCategories();
            setCategories(cats);
            const sum = cats.reduce((acc, c) => acc + (Number(c.count) || 0), 0);
            if (sum > 0) {
                setCatalogTotal((prev) => (prev > 0 ? prev : sum));
            }
        } catch {}
    }, []);

    const loadFavoritesCount = useCallback(async () => {
        try {
            const ids = await fetchFavoriteShotIds(userId);
            setFavoritesCount(ids.length);
        } catch {}
    }, [userId]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        loadFavoritesCount();
    }, [loadFavoritesCount]);

    useEffect(() => {
        load(true);
    }, [selectedCategory, searchQuery, onlyFavorites, userId]);

    const selectCategory = useCallback((cat?: string) => {
        setOnlyFavorites(false);
        setSelectedCategory((prev) => (prev === cat ? undefined : cat));
    }, []);

    const toggleOnlyFavorites = useCallback(() => {
        setSelectedCategory(undefined);
        setOnlyFavorites((prev) => !prev);
    }, []);

    const resetFilters = useCallback(() => {
        setSelectedCategory(undefined);
        setOnlyFavorites(false);
        setSearchQuery('');
    }, []);

    const loadMore = useCallback(() => {
        if (!loadingMore && shots.length < total) {
            load(false);
        }
    }, [loadingMore, shots.length, total, load]);

    const refresh = useCallback(() => {
        load(true);
        loadFavoritesCount();
    }, [load, loadFavoritesCount]);

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
                setFavoritesCount((prev) => (res.isFavorite ? prev + 1 : Math.max(0, prev - 1)));
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
        totalAvailable,
        catalogTotal,
        favoritesCount,
        isGuestPreview,
        previewLimit,
        requiresLogin,
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
        refresh,
        toggleFavorite,
    };
}

