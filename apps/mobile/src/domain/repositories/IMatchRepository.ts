import type { Match } from '@/src/domain/entities/Match';

export interface IMatchRepository {
    crear(partida: Match): Promise<void>;
    actualizar(partida: Match): Promise<void>;
    obtenerPorId(id: string): Promise<Match | null>;
    obtenerHistory(): Promise<Match[]>;
}
