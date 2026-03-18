export type EstadoPartida = 'EN_VIVO' | 'FINALIZADA';

export type TurnoJugador = 'A' | 'B';

export interface ResumenPartida {
    promedioGeneral: number;
    promedioJugadorA: number;
    promedioJugadorB: number;
    serieMayorA: number;
    serieMayorB: number;
    ganador: TurnoJugador | 'EMPATE';
}
