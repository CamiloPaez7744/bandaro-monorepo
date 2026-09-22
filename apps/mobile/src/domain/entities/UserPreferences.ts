export interface UserPreferences {
    userId: string;
    theme: 'light' | 'dark' | 'system';
    language: 'es' | 'en';
    defaultTarget: number;
    notifications: boolean;
    updatedAt: string;
}
