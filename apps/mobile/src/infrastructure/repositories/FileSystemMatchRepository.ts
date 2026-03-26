import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Match } from '@/src/domain/entities/Match';
import type { IMatchRepository } from '@/src/domain/repositories/IMatchRepository';
import { MatchMapper } from '@/src/infrastructure/mappers/MatchMapper';

const STORAGE_KEY = '@billar/partidas';

export class FileSystemMatchRepository implements IMatchRepository {
    async crear(partida: Match): Promise<void> {
        const partidas = await this.obtenerHistory();
        partidas.push(partida);
        await this.persist(partidas);
    }

    async actualizar(partida: Match): Promise<void> {
        const partidas = await this.obtenerHistory();
        const index = partidas.findIndex((item) => item.id === partida.id);

        if (index === -1) {
            partidas.push(partida);
        } else {
            partidas[index] = partida;
        }

        await this.persist(partidas);
    }

    async obtenerPorId(id: string): Promise<Match | null> {
        const partidas = await this.obtenerHistory();
        return partidas.find((partida) => partida.id === id) ?? null;
    }

    async obtenerHistory(): Promise<Match[]> {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const collection = JSON.parse(raw) as string[];
        return collection.map((item) => MatchMapper.fromPrimitives(item));
    }

    private async persist(partidas: Match[]): Promise<void> {
        const collection = partidas.map((partida) => MatchMapper.toPrimitives(partida));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    }
}
