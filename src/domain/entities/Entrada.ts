import type { TurnoJugador } from '@/types';

export interface Entrada {
    numero: number;
    jugador: TurnoJugador;
    carambolas: number;
    timestamp: string;
    falta?: boolean;
}
