import type { Match } from '@/src/domain/entities/Match';
import { MatchNotFound } from '@/src/domain/exceptions/MatchNotFound';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';

export class UndoLastEntry {
    constructor(private readonly repository: IMatchRepository) { }

    async execute(partidaId: string): Promise<Match> {
        const partida = await this.repository.obtenerPorId(partidaId);
        if (!partida) {
            throw new MatchNotFound(partidaId);
        }

        const ultimaEntry = partida.entradas.pop();
        if (!ultimaEntry) {
            return partida;
        }

        if (ultimaEntry.jugador === 'A') {
            partida.marcadorA = Math.max(0, partida.marcadorA - ultimaEntry.carambolas);
            partida.turnoActual = 'A';
        } else {
            partida.marcadorB = Math.max(0, partida.marcadorB - ultimaEntry.carambolas);
            partida.turnoActual = 'B';
        }

        await this.repository.actualizar(partida);
        return partida;
    }
}
