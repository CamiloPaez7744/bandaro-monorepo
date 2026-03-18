import type { Partida } from '@/src/domain/entities/Partida';
import type { IPartidaRepository } from '@/src/domain/repositories/IPartidaRepository';

export class ObtenerHistorial {
    constructor(private readonly repository: IPartidaRepository) { }

    async execute(): Promise<Partida[]> {
        const partidas = await this.repository.obtenerHistorial();
        return partidas.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
    }
}
