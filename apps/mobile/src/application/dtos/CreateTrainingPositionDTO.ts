export interface CreateTrainingPositionDTO {
    name: string;
    description?: string;
    source: 'simulator' | 'photo';
    photoUrl?: string;
    snapshotId?: string;
    category: 'corto' | 'largo' | 'reverso' | 'banda-banda' | 'sistema';
    difficulty: number;
    targetShots: number;
    isPublic?: boolean;
}
