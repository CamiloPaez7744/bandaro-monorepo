import type { Partida } from '@/src/domain/entities/Partida';
import type { IPartidaRepository } from '@/src/domain/repositories/IPartidaRepository';

export class ObtenerPartida {
    constructor(private readonly repository: IPartidaRepository) { }

    async execute(id: string): Promise<Partida | null> {
        return this.repository.obtenerPorId(id);
    }
}
