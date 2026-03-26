import type { StatisticsDTO } from '@/src/application/dtos/StatisticsDTO';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';
import { Average } from '@/src/domain/value-objects/Average';
import { HighestRun } from '@/src/domain/value-objects/HighestRun';

export class GetStatistics {
    constructor(private readonly repository: IMatchRepository) { }

    async execute(): Promise<StatisticsDTO> {
        const partidas = await this.repository.obtenerHistory();
        const finalizadas = partidas.filter((p) => p.estado === 'FINALIZADA');

        const totalMatchs = finalizadas.length;
        const totalEntrys = finalizadas.reduce((acc, p) => acc + p.entradas.length, 0);
        const totalCarambolas = finalizadas.reduce((acc, p) => acc + p.marcadorA + p.marcadorB, 0);

        const series = finalizadas.flatMap((p) => p.entradas.map((e) => e.carambolas));

        return {
            promedioGeneral: Average.calcular(totalCarambolas, totalEntrys),
            serieMayor: HighestRun.calcular(series),
            totalMatchs,
            totalEntrys,
        };
    }
}
