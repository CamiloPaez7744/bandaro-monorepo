import type { Match } from '@/src/domain/entities/Match';

export class MatchMapper {
    static toPrimitives(partida: Match): string {
        return JSON.stringify(partida);
    }

    static fromPrimitives(raw: string): Match {
        return JSON.parse(raw) as Match;
    }
}
