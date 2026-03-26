export type EstadoMatch = 'EN_VIVO' | 'FINALIZADA';

export type TurnoPlayer = 'A' | 'B';

export interface SummaryMatch {
    promedioGeneral: number;
    promedioPlayerA: number;
    promedioPlayerB: number;
    serieMayorA: number;
    serieMayorB: number;
    ganador: TurnoPlayer | 'EMPATE';
}
