import type { RegisterDTO } from '@/src/application/dtos/RegisterDTO';
import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';

export class RegisterUser {
    constructor(private readonly repository: IAuthRepository) { }

    async execute(dto: RegisterDTO) {
        if (!dto.nombre.trim() || !dto.alias.trim() || !dto.nacionalidad.trim()) {
            throw new Error('Completa nombre, alias y nacionalidad.');
        }

        if (!dto.countryCode.trim()) {
            throw new Error('Selecciona una bandera de nacionalidad.');
        }

        if (!dto.email.trim().includes('@')) {
            throw new Error('Correo invalido.');
        }

        if (dto.password.length < 6) {
            throw new Error('La clave debe tener al menos 6 caracteres.');
        }

        return this.repository.registrar(dto);
    }
}
