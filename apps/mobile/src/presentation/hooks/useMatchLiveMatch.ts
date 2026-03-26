import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Match } from '@/src/domain/entities/Match';
import { container } from '@/src/presentation/container';
import type { TurnoPlayer } from '@/types';

export function useMatchLiveMatch(partidaId: string) {
    const [partida, setMatch] = useState<Match | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [shotClock, setShotClock] = useState(40);
    const [isClockPaused, setIsClockPaused] = useState(false);

    const cargar = useCallback(async () => {
        const data = await container.obtenerMatch.execute(partidaId);
        setMatch(data);
    }, [partidaId]);

    useEffect(() => {
        cargar().catch(() => setError('No se pudo cargar la partida.'));
    }, [cargar]);

    useEffect(() => {
        if (isClockPaused) {
            return;
        }

        const timer = setInterval(() => {
            setShotClock((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [isClockPaused]);

    const resetShotClock = useCallback(() => setShotClock(40), []);

    const toggleClockPause = useCallback(() => {
        setIsClockPaused((prev) => !prev);
    }, []);

    const restartClock = useCallback(() => {
        setShotClock(40);
        setIsClockPaused(false);
    }, []);

    const registrar = useCallback(
        async (carambolas: number, falta = false) => {
            if (!partida) {
                return;
            }

            const jugador: TurnoPlayer = partida.turnoActual;
            const actualizada = await container.registrarEntry.execute({
                partidaId: partida.id,
                jugador,
                carambolas,
                falta,
            });

            setMatch(actualizada);
            resetShotClock();
        },
        [partida, resetShotClock]
    );

    const puedeFinalizar = useMemo(() => {
        if (!partida) {
            return false;
        }

        const objetivoA = partida.distanciaObjetivoA ?? partida.distanciaObjetivo ?? 20;
        const objetivoB = partida.distanciaObjetivoB ?? partida.distanciaObjetivo ?? 20;

        return partida.marcadorA >= objetivoA || partida.marcadorB >= objetivoB;
    }, [partida]);

    const deshacerUltimaEntry = useCallback(async () => {
        if (!partida) {
            return;
        }

        const actualizada = await container.deshacerUltimaEntry.execute(partida.id);
        setMatch(actualizada);
    }, [partida]);

    return {
        partida,
        error,
        shotClock,
        isClockPaused,
        registrar,
        cargar,
        resetShotClock,
        toggleClockPause,
        restartClock,
        puedeFinalizar,
        deshacerUltimaEntry,
    };
}
