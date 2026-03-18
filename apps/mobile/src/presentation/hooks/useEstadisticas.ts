import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { EstadisticasDTO } from '@/src/application/dtos/EstadisticasDTO';
import { container } from '@/src/presentation/container';

const fallback: EstadisticasDTO = {
    promedioGeneral: 0,
    serieMayor: 0,
    totalPartidas: 0,
    totalEntradas: 0,
};

export function useEstadisticas() {
    const [estadisticas, setEstadisticas] = useState<EstadisticasDTO>(fallback);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        const data = await container.obtenerEstadisticas.execute();
        setEstadisticas(data);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    return { estadisticas, loading, refresh };
}
