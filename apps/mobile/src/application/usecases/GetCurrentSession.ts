import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';

export class GetCurrentSession {
    constructor(private readonly repository: IAuthRepository) { }

    async execute() {
        return this.repository.obtenerSessionActual();
    }
}
