import type { EstadoPartida, TurnoJugador } from '@/types';
import type { Entrada } from './Entrada';
import type { Jugador } from './Jugador';

export interface Partida {
    id: string;
    fechaInicio: string;
    fechaFin?: string;
    modalidad: '3_BANDAS';
    ganadorSalida: TurnoJugador;
    bolaJugadorA: 'BLANCA' | 'AMARILLA';
    bolaJugadorB: 'BLANCA' | 'AMARILLA';
    distanciaObjetivoA: number;
    distanciaObjetivoB: number;
    distanciaObjetivo?: number;
    estado: EstadoPartida;
    turnoActual: TurnoJugador;
    jugadorA: Jugador;
    jugadorB: Jugador;
    marcadorA: number;
    marcadorB: number;
    entradas: Entrada[];
    notas?: string;
}
