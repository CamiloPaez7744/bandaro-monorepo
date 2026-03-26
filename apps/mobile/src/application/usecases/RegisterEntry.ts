import type { EntryDTO } from '@/src/application/dtos/EntryDTO';
import { InvalidEntry } from '@/src/domain/exceptions/InvalidEntry';
import { MatchNotFound } from '@/src/domain/exceptions/MatchNotFound';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';

export class RegisterEntry {
    constructor(private readonly repository: IMatchRepository) { }

    async execute(dto: EntryDTO) {
        if (dto.carambolas < 0 || dto.carambolas > 15) {
            throw new InvalidEntry();
        }

        const partida = await this.repository.obtenerPorId(dto.partidaId);
        if (!partida) {
            throw new MatchNotFound(dto.partidaId);
        }

        if (partida.estado !== 'EN_VIVO') {
            throw new InvalidEntry();
        }

        const numero = partida.entradas.length + 1;
        partida.entradas.push({
            numero,
            jugador: dto.jugador,
            carambolas: dto.falta ? 0 : dto.carambolas,
            timestamp: new Date().toISOString(),
            falta: dto.falta,
        });

        if (dto.jugador === 'A') {
            partida.marcadorA += dto.falta ? 0 : dto.carambolas;
            partida.turnoActual = 'B';
        } else {
            partida.marcadorB += dto.falta ? 0 : dto.carambolas;
            partida.turnoActual = 'A';
        }

        await this.repository.actualizar(partida);
        return partida;
    }
}
