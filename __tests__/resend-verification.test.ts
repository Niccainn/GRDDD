import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    identity: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/email-verification', () => ({
  sendVerificationEmail: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimitDistributed: vi.fn().mockResolvedValue({ allowed: true, resetAt: 0, remaining: 9 }),
}));
vi.mock('@/lib/crypto/email-hash', () => ({
  hashEmail: (e: string) => `hash:${e}`,
}));

import { POST } from '../app/api/auth/resend-verification/route';
import { prisma } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email-verification';
import { rateLimitDistributed } from '@/lib/rate-limit';

function makeReq(body: unknown, ip = '127.0.0.1') {
  return new Request('http://localhost/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest;
}

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.mocked(prisma.identity.findUnique).mockReset();
    vi.mocked(sendVerificationEmail).mockReset();
    vi.mocked(rateLimitDistributed).mockResolvedValue({ allowed: true, resetAt: 0, remaining: 9 });
  });

  it('rejects malformed email up front', async () => {
    const r = await POST(makeReq({ email: 'not-an-email' }));
    expect(r.status).toBe(400);
  });

  // Cast helper — the route only reads { id, name, emailVerifiedAt } from
  // the Identity, not the full Prisma row, so the test mock is narrower
  // than the generated type. Casting here keeps the tests focused.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stubIdentity = (row: any) => vi.mocked(prisma.identity.findUnique).mockResolvedValue(row);

  it('returns enumeration-safe success when email is unknown', async () => {
    stubIdentity(null);
    const r = await POST(makeReq({ email: 'nobody@example.com' }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('returns enumeration-safe success when email is already verified', async () => {
    stubIdentity({ id: 'id_v', name: 'V', emailVerifiedAt: new Date() });
    const r = await POST(makeReq({ email: 'verified@example.com' }));
    expect(r.status).toBe(200);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('sends verification email when account exists and is unverified', async () => {
    stubIdentity({ id: 'id_u', name: 'U', emailVerifiedAt: null });
    const r = await POST(makeReq({ email: 'pending@example.com' }));
    expect(r.status).toBe(200);
    expect(sendVerificationEmail).toHaveBeenCalledWith('id_u', 'U', 'pending@example.com');
  });

  it('throttles by IP with explicit 429', async () => {
    vi.mocked(rateLimitDistributed).mockResolvedValueOnce({
      allowed: false,
      resetAt: Date.now() + 5 * 60_000,
      remaining: 0,
    });
    const r = await POST(makeReq({ email: 'a@b.com' }));
    expect(r.status).toBe(429);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('hides per-email throttle behind the safe-success shape', async () => {
    // First call (IP) allowed, second call (email) throttled.
    vi.mocked(rateLimitDistributed)
      .mockResolvedValueOnce({ allowed: true, resetAt: 0, remaining: 9 })
      .mockResolvedValueOnce({ allowed: false, resetAt: Date.now() + 5 * 60_000, remaining: 0 });
    const r = await POST(makeReq({ email: 'spam-target@example.com' }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});
