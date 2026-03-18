import type { Partida } from '@/src/domain/entities/Partida';

export interface IPartidaRepository {
    crear(partida: Partida): Promise<void>;
    actualizar(partida: Partida): Promise<void>;
    obtenerPorId(id: string): Promise<Partida | null>;
    obtenerHistorial(): Promise<Partida[]>;
}
