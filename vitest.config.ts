import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            include: [
                'src/domain/**/*.{ts,tsx}',
                'src/application/**/*.{ts,tsx}',
                'src/infrastructure/**/*.{ts,tsx}',
                'src/hooks/useDriveSearch.ts',
                'src/hooks/useDriveOperations.ts',
                'src/hooks/useRecordTitleController.ts',
                'src/utils/validationUtils.ts',
                'src/utils/clinicalContentSanitizer.ts',
                'src/utils/settingsStorage.ts',
                'src/utils/storageAdapter.ts',
            ],
            exclude: [
                'src/tests/**',
                'src/**/*.test.{ts,tsx}',
                'src/vite-env.d.ts',
            ],
            thresholds: {
                statements: 65,
                branches: 55,
                functions: 64,
                lines: 66,
            },
        },
    },
});
