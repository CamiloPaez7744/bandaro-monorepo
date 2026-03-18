import type { EntradaDTO } from '@/src/application/dtos/EntradaDTO';
import { EntradaInvalida } from '@/src/domain/exceptions/EntradaInvalida';
import { PartidaNoEncontrada } from '@/src/domain/exceptions/PartidaNoEncontrada';
import type { IPartidaRepository } from '@/src/domain/repositories/IPartidaRepository';

export class RegistrarEntrada {
    constructor(private readonly repository: IPartidaRepository) { }

    async execute(dto: EntradaDTO) {
        if (dto.carambolas < 0 || dto.carambolas > 15) {
            throw new EntradaInvalida();
        }

        const partida = await this.repository.obtenerPorId(dto.partidaId);
        if (!partida) {
            throw new PartidaNoEncontrada(dto.partidaId);
        }

        if (partida.estado !== 'EN_VIVO') {
            throw new EntradaInvalida();
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
