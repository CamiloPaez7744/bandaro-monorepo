import type { TurnoPlayer } from '@/types';

export interface Entry {
    numero: number;
    jugador: TurnoPlayer;
    carambolas: number;
    timestamp: string;
    falta?: boolean;
}
