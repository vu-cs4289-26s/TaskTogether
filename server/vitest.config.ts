import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // globalSetup runs once before all test files (db push)
    globalSetup: ['./src/test/globalSetup.ts'],
    // setupFiles runs before each test file (env vars + table cleanup)
    setupFiles: ['./src/test/setup.ts'],
    // maxWorkers: 1 ensures test files run one at a time (no DB race conditions)
    // Each file gets its own fork (fresh Prisma singleton)
    pool: 'forks',
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
