import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/db/seed.ts',
                'src/db/run_schema.ts',
                'src/db/migrations/**',
                'src/db/schema.ts',
                'src/db/base50Data.ts',
                'src/index.ts',
            ],
            thresholds: {
                lines: 90,
                functions: 90,
                branches: 70,
                statements: 90,
            },
        },
    },
});
