import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit-level ownership tests. These mock `@/lib/db` (prisma) so we can
 * assert each guard:
 *   1. Calls the correct prisma model
 *   2. Composes the correct `where` clause (including soft-delete)
 *   3. Throws a 404 Response (never 403) on miss
 *   4. Returns the row on match
 *
 * The deeper end-to-end IDOR check lives in the integration test suite
 * (requires a real test DB and two seeded identities); this unit layer
 * is a regression gate for the guard logic itself.
 */

// vi.mock is hoisted above imports, so the mock object must be
// constructed inside vi.hoisted() to live in the same scope.
const { prismaMock } = vi.hoisted(() => {
  const m = () => ({ findFirst: vi.fn() });
  return {
    prismaMock: {
      environment: m(),
      system: m(),
      workflow: m(),
      goal: m(),
      signal: m(),
      execution: m(),
      intelligence: m(),
      apiKey: m(),
      webhook: m(),
      budget: m(),
      expense: m(),
      invoice: m(),
    },
  };
});

vi.mock('../lib/db', () => ({ prisma: prismaMock }));

import * as ownership from '../lib/auth/ownership';

const IDENTITY = 'id_owner';
const OTHER = 'id_intruder';
const RESOURCE = 'res_abc';

async function expectUnauthorized(p: Promise<unknown>) {
  try {
    await p;
    throw new Error('expected throw');
  } catch (e) {
    expect(e).toBeInstanceOf(Response);
    const res = e as Response;
    expect(res.status).toBe(404);
    const body = await res.json();
    // Never leak "forbidden"/"unauthorized" — always "Not found".
    expect(body.error).toMatch(/not found/i);
    expect(body.error).not.toMatch(/forbid|unauthor/i);
  }
}

const CASES: Array<[
  keyof typeof prismaMock,
  keyof typeof ownership,
  (id: string, ident: string) => Promise<unknown>,
]> = [
  ['environment', 'assertOwnsEnvironment', ownership.assertOwnsEnvironment],
  ['system', 'assertOwnsSystem', ownership.assertOwnsSystem],
  ['workflow', 'assertOwnsWorkflow', ownership.assertOwnsWorkflow],
  ['goal', 'assertOwnsGoal', ownership.assertOwnsGoal],
  ['signal', 'assertOwnsSignal', ownership.assertOwnsSignal],
  ['execution', 'assertOwnsExecution', ownership.assertOwnsExecution],
  ['intelligence', 'assertOwnsIntelligence', ownership.assertOwnsIntelligence],
  ['apiKey', 'assertOwnsApiKey', ownership.assertOwnsApiKey],
  ['webhook', 'assertOwnsWebhook', ownership.assertOwnsWebhook],
  ['budget', 'assertOwnsBudget', ownership.assertOwnsBudget],
  ['expense', 'assertOwnsExpense', ownership.assertOwnsExpense],
  ['invoice', 'assertOwnsInvoice', ownership.assertOwnsInvoice],
];

beforeEach(() => {
  for (const m of Object.values(prismaMock)) m.findFirst.mockReset();
});

describe('ownership guards — behavioural contract', () => {
  describe.each(CASES)('%s guard', (model, _name, fn) => {
    it('returns the row when prisma finds one', async () => {
      const row = { id: RESOURCE, ownerId: IDENTITY };
      prismaMock[model].findFirst.mockResolvedValue(row);
      const result = await fn(RESOURCE, IDENTITY);
      expect(result).toEqual(row);
    });

    it('throws 404 Response (not 403) when prisma returns null', async () => {
      prismaMock[model].findFirst.mockResolvedValue(null);
      await expectUnauthorized(fn(RESOURCE, OTHER));
    });

    it('passes the identity id into the where clause', async () => {
      prismaMock[model].findFirst.mockResolvedValue({ id: RESOURCE });
      await fn(RESOURCE, IDENTITY);
      const call = prismaMock[model].findFirst.mock.calls[0][0];
      const serialized = JSON.stringify(call);
      expect(serialized).toContain(IDENTITY);
      expect(serialized).toContain(RESOURCE);
    });
  });

  // Soft-delete check is what prevents a deleted-but-undeleted environment
  // from leaking back in through a stale reference.
  describe('soft-delete hardening', () => {
    const SOFT_DELETE_GUARDS: Array<[keyof typeof prismaMock, (id: string, ident: string) => Promise<unknown>]> = [
      ['environment', ownership.assertOwnsEnvironment],
      ['system', ownership.assertOwnsSystem],
      ['workflow', ownership.assertOwnsWorkflow],
      ['goal', ownership.assertOwnsGoal],
      ['signal', ownership.assertOwnsSignal],
      ['execution', ownership.assertOwnsExecution],
      ['intelligence', ownership.assertOwnsIntelligence],
      ['webhook', ownership.assertOwnsWebhook],
      ['budget', ownership.assertOwnsBudget],
      ['invoice', ownership.assertOwnsInvoice],
    ];

    it.each(SOFT_DELETE_GUARDS)('%s guard filters deletedAt: null', async (model, fn) => {
      prismaMock[model].findFirst.mockResolvedValue({ id: RESOURCE });
      await fn(RESOURCE, IDENTITY);
      const call = prismaMock[model].findFirst.mock.calls[0][0];
      expect(JSON.stringify(call)).toContain('"deletedAt":null');
    });
  });
});

describe('ownedBy / accessibleBy helpers', () => {
  it('ownedBy returns a where fragment scoped to ownerId', () => {
    const frag = ownership.ownedBy(IDENTITY);
    expect(frag).toEqual({ environment: { ownerId: IDENTITY, deletedAt: null } });
  });

  it('accessibleBy allows owner OR membership', () => {
    const frag = ownership.accessibleBy(IDENTITY) as {
      environment: { OR: unknown[]; deletedAt: null };
    };
    expect(frag.environment.OR).toHaveLength(2);
    expect(JSON.stringify(frag)).toContain(IDENTITY);
    expect(JSON.stringify(frag)).toContain('memberships');
  });
});

describe('assertCanWriteEnvironment', () => {
  it('accepts owner', async () => {
    prismaMock.environment.findFirst.mockResolvedValue({ id: RESOURCE });
    await expect(
      ownership.assertCanWriteEnvironment(RESOURCE, IDENTITY),
    ).resolves.toBeDefined();
  });

  it('rejects non-owner non-member with 404', async () => {
    prismaMock.environment.findFirst.mockResolvedValue(null);
    await expectUnauthorized(ownership.assertCanWriteEnvironment(RESOURCE, OTHER));
  });

  it('where clause limits roles to ADMIN/CONTRIBUTOR (not VIEWER)', async () => {
    prismaMock.environment.findFirst.mockResolvedValue({ id: RESOURCE });
    await ownership.assertCanWriteEnvironment(RESOURCE, IDENTITY);
    const call = prismaMock.environment.findFirst.mock.calls[0][0];
    const s = JSON.stringify(call);
    expect(s).toContain('ADMIN');
    expect(s).toContain('CONTRIBUTOR');
    expect(s).not.toContain('VIEWER');
  });
});
