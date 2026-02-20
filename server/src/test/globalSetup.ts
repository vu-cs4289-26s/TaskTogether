import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Vitest globalSetup — runs once before all test files.
 * Pushes the Prisma schema to the test database.
 */
export async function setup() {
  // Load .env.test so DATABASE_URL is available for prisma db push
  config({ path: resolve(process.cwd(), '.env.test') });

  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    throw new Error('TEST_DATABASE_URL is not set');
  }

  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'pipe',
  });
}
