import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type SchemePreference = 'system' | 'light' | 'dark';
type SchemeValue = 'light' | 'dark';

interface ColorSchemeContextValue {
  preference: SchemePreference;
  setPreference: (value: SchemePreference) => void;
}

const STORAGE_KEY = '@billar/color-scheme-preference';

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<SchemePreference>('system');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    } catch {
      setPreferenceState('system');
    }
  }, []);

  const setPreference = (value: SchemePreference) => {
    setPreferenceState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignore localStorage failures in private mode.
    }
  };

  const contextValue = useMemo(
    () => ({
      preference,
      setPreference,
    }),
    [preference]
  );

  return createElement(ColorSchemeContext.Provider, { value: contextValue }, children);
}

export function useColorSchemePreference() {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error('useColorSchemePreference must be used inside ColorSchemeProvider');
  }

  return context;
}

export function useColorScheme(): SchemeValue {
  const context = useContext(ColorSchemeContext);

  if (!context || context.preference === 'system') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  return context.preference;
}
