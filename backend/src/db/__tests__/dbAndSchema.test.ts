import { describe, expect, it, vi } from 'vitest';

vi.mock('pg', () => {
    return {
        default: {
            Pool: vi.fn().mockImplementation(() => ({
                connect: vi.fn(),
                query: vi.fn(),
                on: vi.fn(),
            })),
        },
    };
});

import { db } from '../index.js';
import * as schema from '../schema.js';

describe('Database Connection & Schema Definitions', () => {
    it('initializes drizzle database instance with schema', () => {
        expect(db).toBeDefined();
        expect(schema).toBeDefined();
    });

    it('validates table schema instances', () => {
        expect(schema.users).toBeDefined();
        expect(schema.sessions).toBeDefined();
        expect(schema.accounts).toBeDefined();
        expect(schema.trainingLevels).toBeDefined();
        expect(schema.trainingNodes).toBeDefined();
        expect(schema.trainingNodePositions).toBeDefined();
        expect(schema.billiardSystems).toBeDefined();
        expect(schema.pedagogyModules).toBeDefined();
        expect(schema.tableSnapshot).toBeDefined();
        expect(schema.ballPosition).toBeDefined();
        expect(schema.shotCatalog).toBeDefined();
        expect(schema.userFavoriteShots).toBeDefined();
    });
});
