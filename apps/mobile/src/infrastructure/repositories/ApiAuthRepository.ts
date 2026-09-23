import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@/src/domain/entities/Session';
import type { User } from '@/src/domain/entities/User';
import type { IAuthRepository, ActualizarPerfilInput } from '@/src/domain/repositories/IAuthRepository';
import { apiFetch } from '../security/cryptoClient';

const SESSION_STORAGE_KEY = '@billar/auth/session';
const TOKEN_KEY = '@billar/auth/access_token';
const USER_CACHE_KEY = '@billar/auth/cached_user';

export class ApiAuthRepository implements IAuthRepository {
    async registrar(input: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }): Promise<User> {
        const res = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: input.nombre,
                alias: input.alias,
                email: input.email,
                password: input.password,
                nationality: input.nacionalidad,
                countryCode: input.countryCode,
                avatarUrl: input.avatar,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Error al registrar usuario' }));
            throw new Error(err.error || 'Error al registrar usuario');
        }

        const data = await res.json();
        const user = this.mapBackendUser(data.user);

        const session: Session = {
            userId: user.id,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accessExpiresAt: Date.now() + 3600 * 1000,
            refreshExpiresAt: Date.now() + 30 * 24 * 3600 * 1000,
        };

        await this.persistSession(session, user);
        return user;
    }

    async login(email: string, password: string): Promise<Session> {
        const res = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Credenciales inválidas' }));
            throw new Error(err.error || 'Credenciales inválidas');
        }

        const data = await res.json();
        const user = this.mapBackendUser(data.user);

        const session: Session = {
            userId: user.id,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accessExpiresAt: Date.now() + 3600 * 1000,
            refreshExpiresAt: Date.now() + 30 * 24 * 3600 * 1000,
        };

        await this.persistSession(session, user);
        return session;
    }

    async loginWithGoogle(payload?: { email?: string; name?: string; googleId?: string; isDevDemo?: boolean }): Promise<Session> {
        const res = await apiFetch('/auth/google', {
            method: 'POST',
            body: JSON.stringify(payload || { isDevDemo: true }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Error al iniciar sesión con Google' }));
            throw new Error(err.error || 'Error al iniciar sesión con Google');
        }

        const data = await res.json();
        const user = this.mapBackendUser(data.user);

        const session: Session = {
            userId: user.id,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accessExpiresAt: Date.now() + 3600 * 1000,
            refreshExpiresAt: Date.now() + 30 * 24 * 3600 * 1000,
        };

        await this.persistSession(session, user);
        return session;
    }

    async loginWithMicrosoft(payload?: { email?: string; name?: string; microsoftId?: string; isDevDemo?: boolean }): Promise<Session> {
        const res = await apiFetch('/auth/microsoft', {
            method: 'POST',
            body: JSON.stringify(payload || { isDevDemo: true }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Error al iniciar sesión con Microsoft' }));
            throw new Error(err.error || 'Error al iniciar sesión con Microsoft');
        }

        const data = await res.json();
        const user = this.mapBackendUser(data.user);

        const session: Session = {
            userId: user.id,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accessExpiresAt: Date.now() + 3600 * 1000,
            refreshExpiresAt: Date.now() + 30 * 24 * 3600 * 1000,
        };

        await this.persistSession(session, user);
        return session;
    }

    async logout(): Promise<void> {
        const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
            try {
                const session = JSON.parse(raw);
                await apiFetch('/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({ refreshToken: session.refreshToken }),
                });
            } catch {
                // Ignore network error on logout
            }
        }

        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_CACHE_KEY);
    }

    async obtenerSessionActual(): Promise<Session | null> {
        const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as Session;
        } catch {
            return null;
        }
    }

    async refrescarSession(refreshToken: string): Promise<Session> {
        const res = await apiFetch('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
            await this.logout();
            throw new Error('La sesión expiró. Inicia sesión nuevamente.');
        }

        const data = await res.json();
        const currentSession = await this.obtenerSessionActual();
        const userId = currentSession?.userId || 'unknown';

        const nextSession: Session = {
            userId,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accessExpiresAt: Date.now() + 3600 * 1000,
            refreshExpiresAt: Date.now() + 30 * 24 * 3600 * 1000,
        };

        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
        await AsyncStorage.setItem(TOKEN_KEY, nextSession.accessToken);
        return nextSession;
    }

    async obtenerUserPorId(userId: string): Promise<User | null> {
        // Try to fetch live user profile from backend
        try {
            const res = await apiFetch('/auth/me');
            if (res.ok) {
                const data = await res.json();
                const user = this.mapBackendUser(data.user);
                await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
                return user;
            }
        } catch {
            // Fallback to cache if network is down
        }

        const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (raw) {
            try {
                return JSON.parse(raw) as User;
            } catch {
                return null;
            }
        }
        return null;
    }

    async actualizarPerfil(userId: string, input: ActualizarPerfilInput): Promise<User> {
        const cached = await this.obtenerUserPorId(userId);
        const updated: User = {
            id: userId,
            nombre: input.nombre || cached?.nombre || 'Usuario',
            alias: input.alias || cached?.alias || 'Jugador',
            nacionalidad: input.nacionalidad || cached?.nacionalidad || 'Colombia',
            countryCode: input.countryCode || cached?.countryCode || 'CO',
            avatar: input.avatar || cached?.avatar || 'avatar-01',
            email: cached?.email || '',
            passwordHash: '',
            createdAt: cached?.createdAt || new Date().toISOString(),
        };

        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(updated));
        return updated;
    }

    private mapBackendUser(bUser: any): User {
        return {
            id: bUser.id,
            nombre: bUser.name,
            alias: bUser.alias || bUser.name?.split(' ')[0] || 'Jugador',
            nacionalidad: bUser.nationality || 'Colombia',
            countryCode: bUser.countryCode || 'CO',
            avatar: bUser.avatarUrl || 'avatar-01',
            email: bUser.email,
            passwordHash: '',
            createdAt: bUser.createdAt || new Date().toISOString(),
        };
    }

    private async persistSession(session: Session, user: User): Promise<void> {
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        await AsyncStorage.setItem(TOKEN_KEY, session.accessToken);
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    }
}
