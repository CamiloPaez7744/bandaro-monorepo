import type { Partida } from '@/src/domain/entities/Partida';
import { PartidaNoEncontrada } from '@/src/domain/exceptions/PartidaNoEncontrada';
import type { IPartidaRepository } from '@/src/domain/repositories/IPartidaRepository';

export class DeshacerUltimaEntrada {
    constructor(private readonly repository: IPartidaRepository) { }

    async execute(partidaId: string): Promise<Partida> {
        const partida = await this.repository.obtenerPorId(partidaId);
        if (!partida) {
            throw new PartidaNoEncontrada(partidaId);
        }

        const ultimaEntrada = partida.entradas.pop();
        if (!ultimaEntrada) {
            return partida;
        }

        if (ultimaEntrada.jugador === 'A') {
            partida.marcadorA = Math.max(0, partida.marcadorA - ultimaEntrada.carambolas);
            partida.turnoActual = 'A';
        } else {
            partida.marcadorB = Math.max(0, partida.marcadorB - ultimaEntrada.carambolas);
            partida.turnoActual = 'B';
        }

        await this.repository.actualizar(partida);
        return partida;
    }
}
