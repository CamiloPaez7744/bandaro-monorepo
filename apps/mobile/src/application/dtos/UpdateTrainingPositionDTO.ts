export interface UpdateTrainingPositionDTO {
    name?: string;
    description?: string;
    category?: 'corto' | 'largo' | 'reverso' | 'banda-banda' | 'sistema';
    difficulty?: number;
    targetShots?: number;
    isPublic?: boolean;
}
