export interface CrearPartidaDTO {
    jugadorA: string;
    jugadorB: string;
    ganadorSalida: 'A' | 'B';
    bolaJugadorA: 'BLANCA' | 'AMARILLA';
    bolaJugadorB: 'BLANCA' | 'AMARILLA';
    distanciaObjetivoA: number;
    distanciaObjetivoB: number;
}
