import type { Match } from '@/src/domain/entities/Match';
import { MatchNotFound } from '@/src/domain/exceptions/MatchNotFound';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';
import { Average } from '@/src/domain/value-objects/Average';
import { HighestRun } from '@/src/domain/value-objects/HighestRun';
import type { SummaryMatch } from '@/types';

export class FinishMatch {
    constructor(private readonly repository: IMatchRepository) { }

    async execute(partidaId: string): Promise<{ partida: Match; resumen: SummaryMatch }> {
        const partida = await this.repository.obtenerPorId(partidaId);
        if (!partida) {
            throw new MatchNotFound(partidaId);
        }

        partida.estado = 'FINALIZADA';
        partida.fechaFin = new Date().toISOString();
        await this.repository.actualizar(partida);

        const entradasA = partida.entradas.filter((e) => e.jugador === 'A');
        const entradasB = partida.entradas.filter((e) => e.jugador === 'B');
        const totalEntrys = partida.entradas.length;

        const resumen: SummaryMatch = {
            promedioGeneral: Average.calcular(partida.marcadorA + partida.marcadorB, totalEntrys),
            promedioPlayerA: Average.calcular(partida.marcadorA, entradasA.length),
            promedioPlayerB: Average.calcular(partida.marcadorB, entradasB.length),
            serieMayorA: HighestRun.calcular(entradasA.map((e) => e.carambolas)),
            serieMayorB: HighestRun.calcular(entradasB.map((e) => e.carambolas)),
            ganador:
                partida.marcadorA === partida.marcadorB
                    ? 'EMPATE'
                    : partida.marcadorA > partida.marcadorB
                        ? 'A'
                        : 'B',
        };

        return { partida, resumen };
    }
}
