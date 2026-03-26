export interface CreateMatchDTO {
    jugadorA: string;
    jugadorB: string;
    ganadorSalida: 'A' | 'B';
    bolaPlayerA: 'BLANCA' | 'AMARILLA';
    bolaPlayerB: 'BLANCA' | 'AMARILLA';
    distanciaObjetivoA: number;
    distanciaObjetivoB: number;
}
