import type { TableSnapshot } from '@/src/domain/entities/TableSnapshot';

export interface ISnapshotRepository {
    submit(imageUri: string): Promise<TableSnapshot>;
    getById(id: string): Promise<TableSnapshot | null>;
}
