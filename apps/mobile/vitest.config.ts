import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    plugins: [
        {
            name: 'png-loader-mock',
            load(id) {
                if (id.endsWith('.png')) {
                    return 'module.exports = 1; export default 1;';
                }
            },
        },
    ],
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, './') },
        ],
    },
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: [
                'src/domain/**/*.ts',
                'src/application/**/*.ts',
                'src/infrastructure/**/*.ts',
                'src/constants/**/*.ts',
                'src/i18n/**/*.ts',
                'src/presentation/container.ts',
            ],
            exclude: [
                '**/__tests__/**',
                '**/*.d.ts',
                'types/**',
                'src/domain/entities/**',
                'src/domain/repositories/**',
                'src/application/dtos/**',
            ],
            thresholds: {
                lines: 90,
                functions: 90,
                branches: 75,
                statements: 90,
            },
        },
    },
});
