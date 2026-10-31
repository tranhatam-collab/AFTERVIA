import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Database-backed suites share one Postgres database, so files run serially.
export default defineConfig({
  resolve: {
    alias: {
      '@aftervia/domain': fileURLToPath(new URL('./packages/domain/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'services/**/*.test.ts', 'tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
