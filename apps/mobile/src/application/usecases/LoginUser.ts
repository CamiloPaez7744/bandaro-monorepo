import type { LoginDTO } from '@/src/application/dtos/LoginDTO';
import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';

export class LoginUser {
    constructor(private readonly repository: IAuthRepository) { }

    async execute(dto: LoginDTO) {
        if (!dto.email.trim() || !dto.password) {
            throw new Error('Ingresa correo y clave.');
        }

        return this.repository.login(dto.email, dto.password);
    }
}
