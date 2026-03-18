import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useColorSchemeCore } from 'react-native';

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
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        setPreferenceState('system');
      });
  }, []);

  const setPreference = (value: SchemePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {
      // Persist failure should not block theme updates.
    });
  };

  const value = useMemo(
    () => ({
      preference,
      setPreference,
    }),
    [preference]
  );

  return createElement(ColorSchemeContext.Provider, { value }, children);
}

export function useColorSchemePreference() {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error('useColorSchemePreference must be used inside ColorSchemeProvider');
  }

  return context;
}

export const useColorScheme = (): SchemeValue => {
  const coreScheme = useColorSchemeCore();
  const context = useContext(ColorSchemeContext);
  const systemScheme: SchemeValue = coreScheme === 'dark' ? 'dark' : 'light';

  if (!context || context.preference === 'system') {
    return systemScheme;
  }

  return context.preference;
};
