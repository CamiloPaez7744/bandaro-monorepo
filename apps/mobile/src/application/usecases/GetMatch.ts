import type { Match } from '@/src/domain/entities/Match';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';

export class GetMatch {
    constructor(private readonly repository: IMatchRepository) { }

    async execute(id: string): Promise<Match | null> {
        return this.repository.obtenerPorId(id);
    }
}
