/**
 * Integration-test DB harness.
 *
 * Intended pattern:
 *   - CI spins up a throwaway Postgres (or reuses DATABASE_URL_TEST)
 *   - `beforeAll`  → applies migrations once (prisma migrate deploy)
 *   - `beforeEach` → truncates in reverse FK order
 *   - `seed()`     → builds two isolated identities + environments so
 *                    ownership/IDOR sweeps can assert cross-tenant rejection
 *
 * This file is the scaffold only. The `prismaTest` export requires
 * DATABASE_URL_TEST to be set; tests that import it should `describe.skipIf`
 * when the env var is missing so local dev without Postgres stays green.
 *
 * To run integration tests locally:
 *   docker run -d --name grid-test-db -e POSTGRES_PASSWORD=pw -p 55432:5432 postgres:16
 *   DATABASE_URL_TEST=postgresql://postgres:pw@localhost:55432/postgres npx prisma migrate deploy
 *   DATABASE_URL_TEST=... npm test
 */

import { PrismaClient } from '@prisma/client';

export const hasTestDb = Boolean(process.env.DATABASE_URL_TEST);

export const prismaTest: PrismaClient | null = hasTestDb
  ? new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_TEST! } } })
  : null;

/**
 * Truncate every tenant-scoped table in reverse FK order. Keep this
 * list in sync with new models added to prisma/schema.prisma.
 */
export async function resetDb(p: PrismaClient): Promise<void> {
  // Order matters: most-dependent first.
  await p.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ExecutionReview",
      "ExecutionCheckpoint",
      "ExecutionDecision",
      "Execution",
      "Workflow",
      "Goal",
      "Signal",
      "Task",
      "System",
      "ConsequenceLink",
      "Intelligence",
      "Webhook",
      "Budget",
      "Expense",
      "Invoice",
      "Membership",
      "Environment",
      "ApiKey",
      "Session",
      "Identity"
    RESTART IDENTITY CASCADE;
  `);
}

/**
 * Seed two identities with isolated environments. Returns a fixture
 * bundle used by every tenant-isolation / IDOR test.
 */
export async function seedTwoTenants(p: PrismaClient) {
  const alice = await p.identity.create({
    data: {
      type: 'PERSON',
      email: 'alice@test.grid',
      name: 'Alice',
      passwordHash: 'x',
    },
  });
  const bob = await p.identity.create({
    data: {
      type: 'PERSON',
      email: 'bob@test.grid',
      name: 'Bob',
      passwordHash: 'x',
    },
  });

  const aliceEnv = await p.environment.create({
    data: { name: 'Alice Co', slug: 'alice-co', ownerId: alice.id },
  });
  const bobEnv = await p.environment.create({
    data: { name: 'Bob Inc', slug: 'bob-inc', ownerId: bob.id },
  });

  const aliceSystem = await p.system.create({
    data: { name: 'Marketing', environmentId: aliceEnv.id, creatorId: alice.id },
  });
  const bobSystem = await p.system.create({
    data: { name: 'Sales', environmentId: bobEnv.id, creatorId: bob.id },
  });

  return { alice, bob, aliceEnv, bobEnv, aliceSystem, bobSystem };
}
