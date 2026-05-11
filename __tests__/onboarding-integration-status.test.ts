import { describe, it, expect } from 'vitest';
import { activeProviderIds } from '../lib/onboarding/integration-status';

describe('activeProviderIds — welcome-wizard connect-step parser', () => {
  it('returns provider IDs of ACTIVE integrations from the real API shape', () => {
    const payload = {
      environmentId: 'env_abc',
      integrations: [
        { provider: 'google_workspace', status: 'ACTIVE' },
        { provider: 'google_calendar', status: 'EXPIRED' },
        { provider: 'slack', status: 'ACTIVE' },
        { provider: 'notion', status: 'REVOKED' },
      ],
    };
    expect(activeProviderIds(payload)).toEqual(['google_workspace', 'slack']);
  });

  it('returns empty list when no integrations are connected', () => {
    expect(activeProviderIds({ integrations: [] })).toEqual([]);
  });

  it('survives the legacy/buggy top-level-array shape', () => {
    // The pre-fix WelcomeClient assumed this shape and tripped on it.
    // The parser must not crash if the API ever reverts.
    expect(activeProviderIds([{ provider: 'slack', status: 'ACTIVE' }])).toEqual([]);
  });

  it('survives missing fields', () => {
    expect(
      activeProviderIds({
        integrations: [
          { provider: 'slack' }, // no status
          { status: 'ACTIVE' }, // no provider
          null,
          'garbage',
          { provider: 123, status: 'ACTIVE' }, // wrong provider type
        ],
      }),
    ).toEqual([]);
  });

  it('returns empty list for null/undefined payloads', () => {
    expect(activeProviderIds(null)).toEqual([]);
    expect(activeProviderIds(undefined)).toEqual([]);
    expect(activeProviderIds('not an object')).toEqual([]);
  });
});
