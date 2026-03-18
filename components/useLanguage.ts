import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
    detectSystemLanguage,
    interpolate,
    type Language,
    type LanguagePreference,
    MESSAGES,
    type TranslationKey,
} from '@/src/i18n/messages';

interface LanguageContextValue {
    preference: LanguagePreference;
    setPreference: (value: LanguagePreference) => void;
}

const STORAGE_KEY = '@bandaro/language-preference';
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [preference, setPreferenceState] = useState<LanguagePreference>('system');

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((stored) => {
                if (stored === 'system' || stored === 'es' || stored === 'en') {
                    setPreferenceState(stored);
                }
            })
            .catch(() => {
                setPreferenceState('system');
            });
    }, []);

    const setPreference = (value: LanguagePreference) => {
        setPreferenceState(value);
        AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {
            // Ignore persistence errors.
        });
    };

    const value = useMemo(
        () => ({
            preference,
            setPreference,
        }),
        [preference]
    );

    return createElement(LanguageContext.Provider, { value }, children);
}

export function useLanguagePreference() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguagePreference must be used inside LanguageProvider');
    }

    return context;
}

export function useLanguage(): Language {
    const context = useContext(LanguageContext);
    const systemLanguage = detectSystemLanguage();

    if (!context || context.preference === 'system') {
        return systemLanguage;
    }

    return context.preference;
}

export function useI18n() {
    const language = useLanguage();
    const { preference, setPreference } = useLanguagePreference();

    const t = (key: TranslationKey, params?: Record<string, string | number>) => {
        const template = MESSAGES[language][key] ?? key;
        return interpolate(template, params);
    };

    return {
        language,
        preference,
        setPreference,
        t,
    };
}
