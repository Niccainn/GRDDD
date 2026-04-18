import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

beforeEach(() => {
  process.env.GRID_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  vi.resetModules();
});

describe('IMPLEMENTED_SYNC_PROVIDERS', () => {
  it('contains the four providers we actually shipped fetchers for', async () => {
    const { IMPLEMENTED_SYNC_PROVIDERS } = await import(
      '../lib/integrations/sync/dispatcher'
    );
    expect(IMPLEMENTED_SYNC_PROVIDERS.has('notion')).toBe(true);
    expect(IMPLEMENTED_SYNC_PROVIDERS.has('slack')).toBe(true);
    expect(IMPLEMENTED_SYNC_PROVIDERS.has('hubspot')).toBe(true);
    // Both naming conventions for gcal — the registry inconsistency is
    // real and the dispatcher handles it on purpose.
    expect(IMPLEMENTED_SYNC_PROVIDERS.has('google_calendar')).toBe(true);
    expect(IMPLEMENTED_SYNC_PROVIDERS.has('google-calendar')).toBe(true);
  });
});

describe('decryptCredentials', () => {
  it('returns null when ciphertext is malformed — never throws', async () => {
    const { decryptCredentials } = await import('../lib/integrations/sync/dispatcher');
    const result = decryptCredentials({
      id: 'int_x',
      provider: 'notion',
      credentialsEnc: 'not-real-ciphertext',
    });
    expect(result).toBeNull();
  });

  it('round-trips plaintext via the real encryption layer', async () => {
    const { encryptString } = await import('../lib/crypto/key-encryption');
    const { decryptCredentials } = await import('../lib/integrations/sync/dispatcher');

    const token = 'ntn_real-ish-access-token';
    const result = decryptCredentials({
      id: 'int_x',
      provider: 'notion',
      credentialsEnc: encryptString(token),
    });
    expect(result?.accessToken).toBe(token);
    expect(result?.refreshToken).toBeUndefined();
  });

  it('handles an optional refresh token', async () => {
    const { encryptString } = await import('../lib/crypto/key-encryption');
    const { decryptCredentials } = await import('../lib/integrations/sync/dispatcher');
    const creds = decryptCredentials({
      id: 'int_x',
      provider: 'google_calendar',
      credentialsEnc: encryptString('access-x'),
      refreshTokenEnc: encryptString('refresh-y'),
    });
    expect(creds?.accessToken).toBe('access-x');
    expect(creds?.refreshToken).toBe('refresh-y');
  });
});

describe('dispatchSync routing', () => {
  it('refuses providers without a fetcher without calling anything', async () => {
    const { encryptString } = await import('../lib/crypto/key-encryption');
    const { dispatchSync } = await import('../lib/integrations/sync/dispatcher');

    // Global fetch should NOT be called for an unimplemented provider.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await dispatchSync(
      {
        id: 'int_x',
        provider: 'bamboohr', // in the client list but no sync fetcher
        credentialsEnc: encryptString('tok'),
      },
      new Date(0),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_implemented');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
