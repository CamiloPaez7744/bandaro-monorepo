import type { Partida } from '@/src/domain/entities/Partida';
import { PartidaNoEncontrada } from '@/src/domain/exceptions/PartidaNoEncontrada';
import type { IPartidaRepository } from '@/src/domain/repositories/IPartidaRepository';
import { Promedio } from '@/src/domain/value-objects/Promedio';
import { SerieMayor } from '@/src/domain/value-objects/SerieMayor';
import type { ResumenPartida } from '@/types';

export class FinalizarPartida {
    constructor(private readonly repository: IPartidaRepository) { }

    async execute(partidaId: string): Promise<{ partida: Partida; resumen: ResumenPartida }> {
        const partida = await this.repository.obtenerPorId(partidaId);
        if (!partida) {
            throw new PartidaNoEncontrada(partidaId);
        }

        partida.estado = 'FINALIZADA';
        partida.fechaFin = new Date().toISOString();
        await this.repository.actualizar(partida);

        const entradasA = partida.entradas.filter((e) => e.jugador === 'A');
        const entradasB = partida.entradas.filter((e) => e.jugador === 'B');
        const totalEntradas = partida.entradas.length;

        const resumen: ResumenPartida = {
            promedioGeneral: Promedio.calcular(partida.marcadorA + partida.marcadorB, totalEntradas),
            promedioJugadorA: Promedio.calcular(partida.marcadorA, entradasA.length),
            promedioJugadorB: Promedio.calcular(partida.marcadorB, entradasB.length),
            serieMayorA: SerieMayor.calcular(entradasA.map((e) => e.carambolas)),
            serieMayorB: SerieMayor.calcular(entradasB.map((e) => e.carambolas)),
            ganador:
                partida.marcadorA === partida.marcadorB
                    ? 'EMPATE'
                    : partida.marcadorA > partida.marcadorB
                        ? 'A'
                        : 'B',
        };

        return { partida, resumen };
    }
}
