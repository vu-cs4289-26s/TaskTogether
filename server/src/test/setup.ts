import { PrismaClient } from '@prisma/client';

// Redirect Prisma to the test DB for the entire test run.
// This must happen before any module imports prisma (i.e. before the app loads).
const testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl) {
  throw new Error('TEST_DATABASE_URL is not set. Run tests with .env.test loaded.');
}
process.env.DATABASE_URL = testDbUrl;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

const prisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

async function cleanDatabase(retries = 3): Promise<void> {
  try {
    // Individual deletes in FK-safe order avoid lock contention from TRUNCATE CASCADE
    await prisma.notification.deleteMany();
    await prisma.taskCompletion.deleteMany();
    await prisma.taskAssignment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.householdDeleteVote.deleteMany();
    await prisma.householdInvite.deleteMany();
    await prisma.householdMember.deleteMany();
    await prisma.household.deleteMany();
    await prisma.user.deleteMany();
  } catch (err: unknown) {
    // Retry on deadlock (PostgreSQL code P0001 / 40P01) or transient errors
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 200));
      return cleanDatabase(retries - 1);
    }
    throw err;
  }
}

// Clean all tables before each test so every test starts with a blank slate.
// Sequential deletes (not a batch transaction) reduce lock contention from
// concurrent fire-and-forget operations finishing from the previous test.
beforeEach(async () => {
  // Allow up to 500ms for fire-and-forget async ops from the previous test to settle
  await new Promise((r) => setTimeout(r, 500));
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
