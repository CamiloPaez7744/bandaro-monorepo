import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';

export class LogoutUser {
    constructor(private readonly repository: IAuthRepository) { }

    async execute() {
        await this.repository.logout();
    }
}
