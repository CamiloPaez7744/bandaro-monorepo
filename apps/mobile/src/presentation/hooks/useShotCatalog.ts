import { useCallback, useEffect, useState } from 'react';

import { adaptCatalogShotList, type CatalogShot } from '@/src/infrastructure/catalog/shotAdapter';
import { fetchCatalog, fetchCategories, type CategoryCount } from '@/src/infrastructure/catalog/catalogApi';

export function useShotCatalog() {
    const [shots, setShots] = useState<CatalogShot[]>([]);
    const [categories, setCategories] = useState<CategoryCount[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
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
    }, [selectedCategory, searchQuery, offset]);

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
    }, [selectedCategory, searchQuery]);

    const loadMore = useCallback(() => {
        if (!loadingMore && shots.length < total) {
            load(false);
        }
    }, [loadingMore, shots.length, total, load]);

    const refresh = useCallback(() => {
        load(true);
    }, [load]);

    return {
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
        refresh,
    };
}
