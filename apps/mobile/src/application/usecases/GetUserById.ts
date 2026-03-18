import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';

export class GetUserById {
    constructor(private readonly repository: IAuthRepository) { }

    async execute(userId: string) {
        return this.repository.obtenerUsuarioPorId(userId);
    }
}
