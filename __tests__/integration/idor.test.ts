import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prismaTest, hasTestDb, resetDb, seedTwoTenants } from '../helpers/db';
import * as ownership from '../../lib/auth/ownership';

/**
 * IDOR sweep — for every "assertOwns*" guard, prove:
 *   - Alice can read her own resource
 *   - Alice CANNOT read Bob's resource (throws 404, not 403)
 *   - A random/nonexistent id rejects
 *
 * The unit-level tests in ownership.test.ts mock prisma and assert the
 * where-clause shape. This file hits a real DB to prove the shape
 * actually enforces tenant isolation end-to-end.
 *
 * Skips gracefully when DATABASE_URL_TEST is not set so local dev
 * without Postgres stays green.
 */

const maybe = hasTestDb ? describe : describe.skip;

maybe('IDOR sweep (integration)', () => {
  let fixture: Awaited<ReturnType<typeof seedTwoTenants>>;

  beforeAll(async () => {
    if (!prismaTest) return;
    await resetDb(prismaTest);
    fixture = await seedTwoTenants(prismaTest);
  });

  afterAll(async () => {
    if (prismaTest) await prismaTest.$disconnect();
  });

  it('assertOwnsEnvironment — allows owner', async () => {
    const env = await ownership.assertOwnsEnvironment(fixture.aliceEnv.id, fixture.alice.id);
    expect(env.id).toBe(fixture.aliceEnv.id);
  });

  it('assertOwnsEnvironment — blocks cross-tenant with 404', async () => {
    try {
      await ownership.assertOwnsEnvironment(fixture.aliceEnv.id, fixture.bob.id);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(Response);
      expect((e as Response).status).toBe(404);
    }
  });

  it('assertOwnsSystem — blocks cross-tenant', async () => {
    try {
      await ownership.assertOwnsSystem(fixture.aliceSystem.id, fixture.bob.id);
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as Response).status).toBe(404);
    }
  });

  it('nonexistent id → 404', async () => {
    try {
      await ownership.assertOwnsEnvironment('env_does_not_exist', fixture.alice.id);
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as Response).status).toBe(404);
    }
  });

  // TODO: extend this pattern to every assertOwns* guard + the
  // `accessibleBy` / `ownedBy` helpers. One describe.each() drives
  // the full matrix once the seed fixture grows.
});
