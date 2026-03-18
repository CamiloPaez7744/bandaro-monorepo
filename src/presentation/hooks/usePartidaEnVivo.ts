import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Partida } from '@/src/domain/entities/Partida';
import { container } from '@/src/presentation/container';
import type { TurnoJugador } from '@/types';

export function usePartidaEnVivo(partidaId: string) {
    const [partida, setPartida] = useState<Partida | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [shotClock, setShotClock] = useState(40);
    const [isClockPaused, setIsClockPaused] = useState(false);

    const cargar = useCallback(async () => {
        const data = await container.obtenerPartida.execute(partidaId);
        setPartida(data);
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

            const jugador: TurnoJugador = partida.turnoActual;
            const actualizada = await container.registrarEntrada.execute({
                partidaId: partida.id,
                jugador,
                carambolas,
                falta,
            });

            setPartida(actualizada);
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

    const deshacerUltimaEntrada = useCallback(async () => {
        if (!partida) {
            return;
        }

        const actualizada = await container.deshacerUltimaEntrada.execute(partida.id);
        setPartida(actualizada);
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
        deshacerUltimaEntrada,
    };
}
