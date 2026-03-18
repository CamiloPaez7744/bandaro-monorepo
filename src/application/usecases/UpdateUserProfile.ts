import type { UpdateProfileDTO } from '@/src/application/dtos/UpdateProfileDTO';
import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';

export class UpdateUserProfile {
    constructor(private readonly repository: IAuthRepository) { }

    async execute(userId: string, dto: UpdateProfileDTO) {
        if (!userId) {
            throw new Error('Usuario invalido.');
        }

        return this.repository.actualizarPerfil(userId, dto);
    }
}
