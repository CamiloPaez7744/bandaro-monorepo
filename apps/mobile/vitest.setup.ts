import { vi } from 'vitest';

if (typeof require !== 'undefined' && require.extensions) {
    require.extensions['.png'] = (module: any) => {
        module.exports = 1;
    };
    require.extensions['.jpg'] = (module: any) => {
        module.exports = 1;
    };
    require.extensions['.jpeg'] = (module: any) => {
        module.exports = 1;
    };
}

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
    default: {
        getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
        setItem: vi.fn(async (key: string, value: string) => {
            storage.set(key, value);
        }),
        removeItem: vi.fn(async (key: string) => {
            storage.delete(key);
        }),
        clear: vi.fn(async () => {
            storage.clear();
        }),
        getAllKeys: vi.fn(async () => Array.from(storage.keys())),
    },
}));

vi.mock('react-native', () => ({
    Platform: {
        OS: 'ios',
        select: (obj: any) => obj.ios || obj.default,
    },
    StyleSheet: {
        create: (styles: any) => styles,
    },
}));
