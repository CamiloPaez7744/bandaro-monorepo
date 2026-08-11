import type { TableSnapshotDTO } from '@/src/application/dtos/TableSnapshotDTO';
import type { TableSnapshot } from '@/src/domain/entities/TableSnapshot';
import type { ISnapshotRepository } from '@/src/domain/repositories/ISnapshotRepository';

export class SubmitTableSnapshot {
    constructor(private readonly repository: ISnapshotRepository) {}

    async execute(dto: TableSnapshotDTO): Promise<TableSnapshot> {
        if (!dto.imageUri) {
            throw new Error('Se requiere una imagen de la mesa.');
        }

        return this.repository.submit(dto.imageUri);
    }
}
