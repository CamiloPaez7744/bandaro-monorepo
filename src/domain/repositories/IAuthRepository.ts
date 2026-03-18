import type { Sesion } from '@/src/domain/entities/Sesion';
import type { Usuario } from '@/src/domain/entities/Usuario';

export interface ActualizarPerfilInput {
    nombre?: string;
    alias?: string;
    nacionalidad?: string;
    countryCode?: string;
    avatar?: string;
}

export interface IAuthRepository {
    registrar(input: Omit<Usuario, 'id' | 'createdAt' | 'passwordHash'> & { password: string }): Promise<Usuario>;
    login(email: string, password: string): Promise<Sesion>;
    logout(): Promise<void>;
    obtenerSesionActual(): Promise<Sesion | null>;
    refrescarSesion(refreshToken: string): Promise<Sesion>;
    obtenerUsuarioPorId(userId: string): Promise<Usuario | null>;
    actualizarPerfil(userId: string, input: ActualizarPerfilInput): Promise<Usuario>;
}
