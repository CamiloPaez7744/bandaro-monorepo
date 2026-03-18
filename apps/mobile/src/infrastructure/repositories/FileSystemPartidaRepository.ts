import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Partida } from '@/src/domain/entities/Partida';
import type { IPartidaRepository } from '@/src/domain/repositories/IPartidaRepository';
import { PartidaMapper } from '@/src/infrastructure/mappers/PartidaMapper';

const STORAGE_KEY = '@billar/partidas';

export class FileSystemPartidaRepository implements IPartidaRepository {
    async crear(partida: Partida): Promise<void> {
        const partidas = await this.obtenerHistorial();
        partidas.push(partida);
        await this.persist(partidas);
    }

    async actualizar(partida: Partida): Promise<void> {
        const partidas = await this.obtenerHistorial();
        const index = partidas.findIndex((item) => item.id === partida.id);

        if (index === -1) {
            partidas.push(partida);
        } else {
            partidas[index] = partida;
        }

        await this.persist(partidas);
    }

    async obtenerPorId(id: string): Promise<Partida | null> {
        const partidas = await this.obtenerHistorial();
        return partidas.find((partida) => partida.id === id) ?? null;
    }

    async obtenerHistorial(): Promise<Partida[]> {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const collection = JSON.parse(raw) as string[];
        return collection.map((item) => PartidaMapper.fromPrimitives(item));
    }

    private async persist(partidas: Partida[]): Promise<void> {
        const collection = partidas.map((partida) => PartidaMapper.toPrimitives(partida));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    }
}
