import type { CreateMatchDTO } from '@/src/application/dtos/CreateMatchDTO';
import type { Match } from '@/src/domain/entities/Match';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';
import { Distance } from '@/src/domain/value-objects/Distance';

export class CreateMatch {
    constructor(private readonly repository: IMatchRepository) { }

    async execute(dto: CreateMatchDTO): Promise<Match> {
        const distanciaObjetivoA = Distance.validar(dto.distanciaObjetivoA);
        const distanciaObjetivoB = Distance.validar(dto.distanciaObjetivoB);

        const partida: Match = {
            id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            fechaInicio: new Date().toISOString(),
            modalidad: '3_BANDAS',
            ganadorSalida: dto.ganadorSalida,
            bolaPlayerA: dto.bolaPlayerA,
            bolaPlayerB: dto.bolaPlayerB,
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
