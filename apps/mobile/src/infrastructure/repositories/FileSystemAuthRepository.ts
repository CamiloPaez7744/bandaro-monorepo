import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Session } from '@/src/domain/entities/Session';
import type { User } from '@/src/domain/entities/User';
import type { IAuthRepository } from '@/src/domain/repositories/IAuthRepository';
import { createJwt } from '@/src/infrastructure/auth/jwt';

const USERS_STORAGE_KEY = '@billar/auth/users';
const SESSION_STORAGE_KEY = '@billar/auth/session';

interface StoredUser {
    id: string;
    nombre: string;
    alias: string;
    nacionalidad: string;
    countryCode?: string;
    avatar: string;
    email: string;
    passwordHash: string;
    createdAt: string;
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function hashPassword(raw: string): string {
    let hash = 0;
    for (let i = 0; i < raw.length; i += 1) {
        hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
    }
    return `p-${hash.toString(16)}`;
}

function normalizeCountryCode(code?: string): string {
    const normalized = (code ?? '').trim().toLowerCase();
    return normalized || 'co';
}

export class FileSystemAuthRepository implements IAuthRepository {
    async registrar(input: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }): Promise<User> {
        const users = await this.readUsers();
        const email = normalizeEmail(input.email);

        if (users.some((user) => normalizeEmail(user.email) === email)) {
            throw new Error('Ya existe un usuario con este correo.');
        }

        const user: User = {
            id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            nombre: input.nombre.trim(),
            alias: input.alias.trim(),
            nacionalidad: input.nacionalidad.trim(),
            countryCode: normalizeCountryCode(input.countryCode),
            avatar: input.avatar,
            email,
            passwordHash: hashPassword(input.password),
            createdAt: new Date().toISOString(),
        };

        users.push(user);
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        return user;
    }

    async login(emailRaw: string, password: string): Promise<Session> {
        const users = await this.readUsers();
        const email = normalizeEmail(emailRaw);
        const user = users.find((item) => normalizeEmail(item.email) === email);

        if (!user || user.passwordHash !== hashPassword(password)) {
            throw new Error('Credenciales invalidas.');
        }

        const session = this.buildSession(user.id);
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        return session;
    }

    async logout(): Promise<void> {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    }

    async obtenerSessionActual(): Promise<Session | null> {
        const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as Session;
    }

    async refrescarSession(refreshToken: string): Promise<Session> {
        const session = await this.obtenerSessionActual();
        if (!session) {
            throw new Error('No hay sesion activa.');
        }

        if (session.refreshToken !== refreshToken) {
            throw new Error('Refresh token invalido.');
        }

        if (Date.now() > session.refreshExpiresAt) {
            await this.logout();
            throw new Error('La sesion expiro. Inicia sesion nuevamente.');
        }

        const next = this.buildSession(session.userId);
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
        return next;
    }

    async obtenerUserPorId(userId: string): Promise<User | null> {
        const users = await this.readUsers();
        return users.find((user) => user.id === userId) ?? null;
    }

    async actualizarPerfil(
        userId: string,
        input: { nombre?: string; alias?: string; nacionalidad?: string; countryCode?: string; avatar?: string }
    ): Promise<User> {
        const users = await this.readUsers();
        const index = users.findIndex((user) => user.id === userId);

        if (index === -1) {
            throw new Error('User no encontrado.');
        }

        const current = users[index];
        const updated: User = {
            ...current,
            nombre: input.nombre?.trim() || current.nombre,
            alias: input.alias?.trim() || current.alias,
            nacionalidad: input.nacionalidad?.trim() || current.nacionalidad,
            countryCode: normalizeCountryCode(input.countryCode ?? current.countryCode),
            avatar: input.avatar || current.avatar,
        };

        users[index] = updated;
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        return updated;
    }

    private buildSession(userId: string): Session {
        const access = createJwt({ sub: userId, type: 'access' }, 60 * 15);
        const refresh = createJwt({ sub: userId, type: 'refresh' }, 60 * 60 * 24 * 7);

        return {
            userId,
            accessToken: access.token,
            refreshToken: refresh.token,
            accessExpiresAt: access.exp,
            refreshExpiresAt: refresh.exp,
        };
    }

    private async readUsers(): Promise<User[]> {
        const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const users = JSON.parse(raw) as StoredUser[];
        return users.map((user) => ({
            ...user,
            countryCode: normalizeCountryCode(user.countryCode),
        }));
    }
}
