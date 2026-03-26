import type { TurnoPlayer } from '@/types';

export interface EntryDTO {
    partidaId: string;
    jugador: TurnoPlayer;
    carambolas: number;
    falta?: boolean;
}
