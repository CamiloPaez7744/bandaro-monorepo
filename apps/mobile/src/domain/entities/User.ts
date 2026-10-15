export interface User {
    id: string;
    nombre: string;
    alias: string;
    nacionalidad: string;
    countryCode: string;
    avatar: string;
    email: string;
    passwordHash: string;
    createdAt: string;
    currentStreak?: number;
    maxStreak?: number;
    totalXp?: number;
    accuracyAvg?: number;
    tier?: string;
    lastActivityDate?: string | null;
}
