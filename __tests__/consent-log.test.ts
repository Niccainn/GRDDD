import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * GDPR Art. 7 audit trail. These tests lock two invariants we must
 * never regress:
 *   1. The raw IP is never written to the DB — only a hashed form.
 *   2. userAgent is truncated before insert so the DB can't be used
 *      to fingerprint a user in perpetuity.
 *   3. Policy version bumps produce NEW rows; they never mutate an
 *      existing row (append-only).
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    consentLog: { create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('../lib/db', () => ({ prisma: prismaMock }));
vi.mock('../lib/observability/errors', () => ({ logError: vi.fn() }));

beforeEach(() => {
  prismaMock.consentLog.create.mockReset();
  prismaMock.consentLog.findMany.mockReset();
  process.env.GRID_ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcy1sb25nIQ==';
});

describe('recordConsent', () => {
  it('writes an append-only row with the current policy version', async () => {
    prismaMock.consentLog.create.mockResolvedValue({ id: 'c1' });
    const { recordConsent, POLICY_VERSION } = await import('../lib/consent/log');
    await recordConsent({
      identityId: 'id_1',
      kind: 'signup_tos_privacy',
      granted: true,
      ip: '1.2.3.4',
      userAgent: 'Mozilla/5.0 Test',
    });
    expect(prismaMock.consentLog.create).toHaveBeenCalledTimes(1);
    const call = prismaMock.consentLog.create.mock.calls[0][0];
    expect(call.data.policyVersion).toBe(POLICY_VERSION);
    expect(call.data.kind).toBe('signup_tos_privacy');
    expect(call.data.granted).toBe(true);
  });

  it('hashes the IP so raw addresses never reach the DB', async () => {
    prismaMock.consentLog.create.mockResolvedValue({ id: 'c1' });
    const { recordConsent } = await import('../lib/consent/log');
    await recordConsent({
      identityId: 'id_1',
      kind: 'signup_tos_privacy',
      granted: true,
      ip: '203.0.113.42',
    });
    const call = prismaMock.consentLog.create.mock.calls[0][0];
    expect(call.data.ipHash).toBeTruthy();
    expect(call.data.ipHash).not.toBe('203.0.113.42');
    // Hash should be a hex string of bounded length
    expect(call.data.ipHash).toMatch(/^[0-9a-f]+$/);
    expect(call.data.ipHash.length).toBeLessThanOrEqual(64);
  });

  it('truncates userAgent at 200 chars to prevent fingerprint persistence', async () => {
    prismaMock.consentLog.create.mockResolvedValue({ id: 'c1' });
    const { recordConsent } = await import('../lib/consent/log');
    const hugeUa = 'Mozilla/5.0 ' + 'x'.repeat(500);
    await recordConsent({
      identityId: 'id_1',
      kind: 'signup_tos_privacy',
      granted: true,
      userAgent: hugeUa,
    });
    const call = prismaMock.consentLog.create.mock.calls[0][0];
    expect(call.data.userAgent).toHaveLength(200);
  });

  it('accepts missing identityId (pre-account waitlist consent)', async () => {
    prismaMock.consentLog.create.mockResolvedValue({ id: 'c1' });
    const { recordConsent } = await import('../lib/consent/log');
    await recordConsent({
      identityId: null,
      kind: 'signup_tos_privacy',
      granted: true,
    });
    expect(prismaMock.consentLog.create).toHaveBeenCalledTimes(1);
  });

  it('never throws when the DB insert fails — consent logging is best-effort', async () => {
    prismaMock.consentLog.create.mockRejectedValue(new Error('DB unreachable'));
    const { recordConsent } = await import('../lib/consent/log');
    // If this throws, user-facing sign-up would break. It must not.
    await expect(
      recordConsent({
        identityId: 'id_1',
        kind: 'signup_tos_privacy',
        granted: true,
      }),
    ).resolves.toBeUndefined();
  });

  it('serialises metadata as a JSON string', async () => {
    prismaMock.consentLog.create.mockResolvedValue({ id: 'c1' });
    const { recordConsent } = await import('../lib/consent/log');
    await recordConsent({
      identityId: 'id_1',
      kind: 'marketing_email',
      granted: true,
      metadata: { variant: 'banner-A', ref: 'twitter' },
    });
    const call = prismaMock.consentLog.create.mock.calls[0][0];
    expect(typeof call.data.metadata).toBe('string');
    expect(JSON.parse(call.data.metadata)).toEqual({ variant: 'banner-A', ref: 'twitter' });
  });
});
