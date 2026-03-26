import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';

export class RefreshSession {
    constructor(private readonly repository: IAuthRepository) { }

    async execute(refreshToken: string) {
        if (!refreshToken) {
            throw new Error('Refresh token requerido.');
        }

        return this.repository.refrescarSession(refreshToken);
    }
}
