export interface TrainingSession {
    id: string;
    userId: string;
    positionId: string;
    targetShots: number;
    madeShots: number;
    totalShots: number;
    completed: boolean;
    notes?: string;
    createdAt: string;
}
