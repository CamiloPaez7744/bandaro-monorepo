import type { EstadisticasDTO } from '@/src/application/dtos/EstadisticasDTO';
import type { IPartidaRepository } from '@/src/domain/repositories/IPartidaRepository';
import { Promedio } from '@/src/domain/value-objects/Promedio';
import { SerieMayor } from '@/src/domain/value-objects/SerieMayor';

export class ObtenerEstadisticas {
    constructor(private readonly repository: IPartidaRepository) { }

    async execute(): Promise<EstadisticasDTO> {
        const partidas = await this.repository.obtenerHistorial();
        const finalizadas = partidas.filter((p) => p.estado === 'FINALIZADA');

        const totalPartidas = finalizadas.length;
        const totalEntradas = finalizadas.reduce((acc, p) => acc + p.entradas.length, 0);
        const totalCarambolas = finalizadas.reduce((acc, p) => acc + p.marcadorA + p.marcadorB, 0);

        const series = finalizadas.flatMap((p) => p.entradas.map((e) => e.carambolas));

        return {
            promedioGeneral: Promedio.calcular(totalCarambolas, totalEntradas),
            serieMayor: SerieMayor.calcular(series),
            totalPartidas,
            totalEntradas,
        };
    }
}
