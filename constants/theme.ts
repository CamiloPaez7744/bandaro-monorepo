export const theme = {
    colors: {
        primary: '#0d5e2f',
        accent: '#14b8a6',
        background: '#f6f8f7',
        card: '#ffffff',
        text: '#0f172a',
        muted: '#64748b',
        border: '#dbe7de',
        danger: '#dc2626',
    },
    spacing: {
        xs: 6,
        sm: 10,
        md: 16,
        lg: 24,
    },
    radius: {
        md: 12,
        lg: 18,
    },
};

export const darkPalette = {
    primary: '#0d5e2f',
    accent: '#14b8a6',
    background: '#112118',
    card: '#1a2f24',
    text: '#e5efe9',
    muted: '#9db0a6',
    border: '#274a39',
    danger: '#f87171',
};

export function getPalette(colorScheme: 'light' | 'dark' | null | undefined) {
    return colorScheme === 'dark' ? darkPalette : theme.colors;
}
