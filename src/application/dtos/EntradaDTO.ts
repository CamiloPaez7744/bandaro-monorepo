import type { TurnoJugador } from '@/types';

export interface EntradaDTO {
    partidaId: string;
    jugador: TurnoJugador;
    carambolas: number;
    falta?: boolean;
}
