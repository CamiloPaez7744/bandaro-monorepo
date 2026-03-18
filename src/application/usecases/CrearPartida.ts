import type { CrearPartidaDTO } from '@/src/application/dtos/CrearPartidaDTO';
import type { Partida } from '@/src/domain/entities/Partida';
import type { IPartidaRepository } from '@/src/domain/repositories/IPartidaRepository';
import { Distancia } from '@/src/domain/value-objects/Distancia';

export class CrearPartida {
    constructor(private readonly repository: IPartidaRepository) { }

    async execute(dto: CrearPartidaDTO): Promise<Partida> {
        const distanciaObjetivoA = Distancia.validar(dto.distanciaObjetivoA);
        const distanciaObjetivoB = Distancia.validar(dto.distanciaObjetivoB);

        const partida: Partida = {
            id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            fechaInicio: new Date().toISOString(),
            modalidad: '3_BANDAS',
            ganadorSalida: dto.ganadorSalida,
            bolaJugadorA: dto.bolaJugadorA,
            bolaJugadorB: dto.bolaJugadorB,
            distanciaObjetivoA,
            distanciaObjetivoB,
            distanciaObjetivo: distanciaObjetivoA,
            estado: 'EN_VIVO',
            turnoActual: 'A',
            jugadorA: { nombre: dto.jugadorA },
            jugadorB: { nombre: dto.jugadorB },
            marcadorA: 0,
            marcadorB: 0,
            entradas: [],
        };

        await this.repository.crear(partida);
        return partida;
    }
}
