import type { Partida } from '@/src/domain/entities/Partida';

export class PartidaMapper {
    static toPrimitives(partida: Partida): string {
        return JSON.stringify(partida);
    }

    static fromPrimitives(raw: string): Partida {
        return JSON.parse(raw) as Partida;
    }
}
