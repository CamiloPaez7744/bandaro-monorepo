import type { EstadoMatch, TurnoPlayer } from '@/types';
import type { Entry } from './Entry';
import type { Player } from './Player';

export interface Match {
    id: string;
    fechaInicio: string;
    fechaFin?: string;
    modalidad: '3_BANDAS';
    ganadorSalida: TurnoPlayer;
    bolaPlayerA: 'BLANCA' | 'AMARILLA';
    bolaPlayerB: 'BLANCA' | 'AMARILLA';
    distanciaObjetivoA: number;
    distanciaObjetivoB: number;
    distanciaObjetivo?: number;
    estado: EstadoMatch;
    turnoActual: TurnoPlayer;
    jugadorA: Player;
    jugadorB: Player;
    marcadorA: number;
    marcadorB: number;
    entradas: Entry[];
    notas?: string;
}
