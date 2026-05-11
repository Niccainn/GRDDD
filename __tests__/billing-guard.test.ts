import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma + checkLimit so the guard is exercised without a DB.
// The mocks must hoist above the imports, so we use vi.mock with a
// factory and import after.
vi.mock('@/lib/db', () => ({
  prisma: {
    subscription: { findUnique: vi.fn() },
    usageRecord: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/billing/usage', () => ({
  checkLimit: vi.fn(),
}));

import { enforceLimitOrResponse } from '../lib/billing/guard';
import { checkLimit } from '../lib/billing/usage';

describe('enforceLimitOrResponse', () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    vi.mocked(checkLimit).mockReset();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
  });

  it('returns null in beta mode (no STRIPE_SECRET_KEY)', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const r = await enforceLimitOrResponse('id_1', 'executions');
    expect(r).toBeNull();
    expect(checkLimit).not.toHaveBeenCalled();
  });

  it('returns null when usage is under the cap', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_anything';
    vi.mocked(checkLimit).mockResolvedValue({
      allowed: true,
      current: 5,
      limit: 100,
      plan: 'FREE',
    });
    const r = await enforceLimitOrResponse('id_2', 'executions');
    expect(r).toBeNull();
  });

  it('returns 429 with upgrade hint when FREE user hits cap', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_anything';
    vi.mocked(checkLimit).mockResolvedValue({
      allowed: false,
      current: 100,
      limit: 100,
      plan: 'FREE',
    });
    const r = await enforceLimitOrResponse('id_3', 'executions');
    expect(r).not.toBeNull();
    expect(r!.status).toBe(429);
    const body = await r!.json();
    expect(body).toMatchObject({
      error: 'Usage limit exceeded',
      metric: 'executions',
      current: 100,
      limit: 100,
      plan: 'FREE',
      upgrade: 'PRO',
    });
  });

  it('suggests TEAM as the next tier when PRO user hits cap', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_anything';
    vi.mocked(checkLimit).mockResolvedValue({
      allowed: false,
      current: 2000,
      limit: 2000,
      plan: 'PRO',
    });
    const r = await enforceLimitOrResponse('id_4', 'nova_queries');
    const body = await r!.json();
    expect(body.upgrade).toBe('TEAM');
  });

  it('returns null upgrade for TEAM users at cap (no higher SKU)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_anything';
    vi.mocked(checkLimit).mockResolvedValue({
      allowed: false,
      current: 10000,
      limit: 10000,
      plan: 'TEAM',
    });
    const r = await enforceLimitOrResponse('id_5', 'executions');
    const body = await r!.json();
    expect(body.upgrade).toBeNull();
  });
});
