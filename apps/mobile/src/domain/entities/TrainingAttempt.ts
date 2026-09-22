export interface TrainingAttempt {
    id: string;
    sessionId: string;
    userId: string;
    positionId: string;
    made: boolean;
    shotNumber: number;
    createdAt: string;
}
