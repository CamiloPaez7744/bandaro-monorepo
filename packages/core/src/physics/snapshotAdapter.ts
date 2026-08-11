import { createBall } from './physics';
import type { Ball, BallId } from './types';
import { DEFAULT_TABLE } from './types';

export interface SnapshotBall {
    label: string;
    x: number;
    y: number;
}

export function snapshotToBalls(snapshotBalls: SnapshotBall[]): Ball[] {
    return snapshotBalls
        .filter((b): b is SnapshotBall & { label: BallId } =>
            b.label === 'white' || b.label === 'yellow' || b.label === 'red',
        )
        .map((b) => createBall(
            b.label,
            b.x * DEFAULT_TABLE.width,
            b.y * DEFAULT_TABLE.height,
        ));
}
