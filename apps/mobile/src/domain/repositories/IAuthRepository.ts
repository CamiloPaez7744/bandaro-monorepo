import type { Session } from '@/src/domain/entities/Session';
import type { User } from '@/src/domain/entities/User';

export interface ActualizarPerfilInput {
    nombre?: string;
    alias?: string;
    nacionalidad?: string;
    countryCode?: string;
    avatar?: string;
}

export interface IAuthRepository {
    registrar(input: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }): Promise<User>;
    login(email: string, password: string): Promise<Session>;
    logout(): Promise<void>;
    obtenerSessionActual(): Promise<Session | null>;
    refrescarSession(refreshToken: string): Promise<Session>;
    obtenerUserPorId(userId: string): Promise<User | null>;
    actualizarPerfil(userId: string, input: ActualizarPerfilInput): Promise<User>;
}
