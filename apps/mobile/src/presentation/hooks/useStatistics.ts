import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { StatisticsDTO } from '@/src/application/dtos/StatisticsDTO';
import { container } from '@/src/presentation/container';

const fallback: StatisticsDTO = {
    promedioGeneral: 0,
    serieMayor: 0,
    totalMatchs: 0,
    totalEntrys: 0,
};

export function useStatistics() {
    const [estadisticas, setStatistics] = useState<StatisticsDTO>(fallback);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        const data = await container.obtenerStatistics.execute();
        setStatistics(data);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    return { estadisticas, loading, refresh };
}
