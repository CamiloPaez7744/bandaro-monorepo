import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import type { Sesion } from '@/src/domain/entities/Sesion';
import type { Usuario } from '@/src/domain/entities/Usuario';
import { container } from '@/src/presentation/container';

interface RegisterInput {
  nombre: string;
  alias: string;
  nacionalidad: string;
  countryCode: string;
  avatar: string;
  email: string;
  password: string;
}

interface UpdateProfileInput {
  nombre?: string;
  alias?: string;
  nacionalidad?: string;
  countryCode?: string;
  avatar?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: Usuario | null;
  session: Sesion | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const ACCESS_REFRESH_WINDOW_MS = 60 * 1000;
const SESSION_HEARTBEAT_MS = 30 * 1000;

export const DEFAULT_AVATARS = [
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
  'avatar-09',
  'avatar-10',
];

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Sesion | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppActive, setIsAppActive] = useState(true);

  const hydrate = useCallback(async () => {
    setIsLoading(true);
    try {
      const current = await container.getCurrentSession.execute();
      if (!current) {
        setSession(null);
        setUser(null);
        return;
      }

      const now = Date.now();
      let nextSession = current;

      if (now > current.accessExpiresAt) {
        nextSession = await container.refreshSession.execute(current.refreshToken);
      }

      const foundUser = await container.getUserById.execute(nextSession.userId);
      if (!foundUser) {
        await container.logoutUser.execute();
        setSession(null);
        setUser(null);
        return;
      }

      setSession(nextSession);
      setUser(foundUser);
    } catch {
      await container.logoutUser.execute();
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(async (input: LoginInput) => {
    const nextSession = await container.loginUser.execute(input);
    const nextUser = await container.getUserById.execute(nextSession.userId);
    if (!nextUser) {
      throw new Error('No se pudo cargar el usuario autenticado.');
    }

    setSession(nextSession);
    setUser(nextUser);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await container.registerUser.execute(input);
    const nextSession = await container.loginUser.execute({ email: input.email, password: input.password });
    const nextUser = await container.getUserById.execute(nextSession.userId);
    if (!nextUser) {
      throw new Error('No se pudo iniciar sesion luego del registro.');
    }

    setSession(nextSession);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    await container.logoutUser.execute();
    setSession(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      if (!user) {
        throw new Error('No hay usuario autenticado.');
      }

      const updated = await container.updateUserProfile.execute(user.id, input);
      setUser(updated);
    },
    [user]
  );

  const refresh = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      const next = await container.refreshSession.execute(session.refreshToken);
      setSession(next);
    } catch {
      await container.logoutUser.execute();
      setSession(null);
      setUser(null);
    }
  }, [session]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisibilityChange = () => {
        setIsAppActive(document.visibilityState === 'visible');
      };

      onVisibilityChange();
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    const subscription = AppState.addEventListener('change', (state) => {
      setIsAppActive(state === 'active');
    });

    setIsAppActive(AppState.currentState === 'active');
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!session || !isAppActive) {
      return;
    }

    let cancelled = false;
    let isRefreshing = false;

    const tick = async () => {
      if (cancelled || isRefreshing) {
        return;
      }

      const now = Date.now();
      if (now <= session.accessExpiresAt - ACCESS_REFRESH_WINDOW_MS) {
        return;
      }

      isRefreshing = true;
      try {
        const next = await container.refreshSession.execute(session.refreshToken);
        if (!cancelled) {
          setSession(next);
        }
      } catch {
        if (!cancelled) {
          await container.logoutUser.execute();
          setSession(null);
          setUser(null);
        }
      } finally {
        isRefreshing = false;
      }
    };

    tick();
    const interval = setInterval(() => {
      void tick();
    }, SESSION_HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAppActive, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      updateProfile,
      logout,
      refresh,
    }),
    [user, session, isLoading, login, register, updateProfile, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return value;
}
