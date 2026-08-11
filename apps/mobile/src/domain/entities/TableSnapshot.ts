export interface TableSnapshotBall {
    label: 'white' | 'yellow' | 'red';
    x: number;
    y: number;
}

export interface TableSnapshot {
    id: string;
    balls: TableSnapshotBall[];
    createdAt: string;
}
