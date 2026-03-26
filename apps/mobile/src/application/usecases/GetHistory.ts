import type { Match } from '@/src/domain/entities/Match';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';

export class GetHistory {
    constructor(private readonly repository: IMatchRepository) { }

    async execute(): Promise<Match[]> {
        const partidas = await this.repository.obtenerHistory();
        return partidas.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
    }
}
