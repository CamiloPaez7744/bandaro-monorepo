export interface Session {
    userId: string;
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: number;
    refreshExpiresAt: number;
}
