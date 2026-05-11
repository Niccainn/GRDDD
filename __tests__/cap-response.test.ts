import { describe, it, expect } from 'vitest';
import { readCapResponse } from '../lib/billing/cap-response';

function res(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('readCapResponse', () => {
  it('returns null for non-429 responses', async () => {
    expect(await readCapResponse(res(200, { ok: true }))).toBeNull();
    expect(await readCapResponse(res(500, { error: 'boom' }))).toBeNull();
  });

  it('returns null for 429s that are not the cap shape (e.g. rate-limiter)', async () => {
    expect(await readCapResponse(res(429, { error: 'Rate limited' }))).toBeNull();
  });

  it('parses a Free user hitting the executions cap', async () => {
    const r = await readCapResponse(
      res(429, {
        error: 'Usage limit exceeded',
        metric: 'executions',
        current: 100,
        limit: 100,
        plan: 'FREE',
        upgrade: 'PRO',
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.metric).toBe('executions');
    expect(r!.upgrade).toBe('PRO');
    // Display labels: FREE → "Operator", PRO → "Team".
    expect(r!.message).toContain('Operator cap reached');
    expect(r!.message).toContain('Upgrade to Team');
    expect(r!.message).toContain('100/100 executions');
  });

  it('parses an Atrium-query cap with the friendly metric label', async () => {
    const r = await readCapResponse(
      res(429, {
        error: 'Usage limit exceeded',
        metric: 'nova_queries',
        current: 500,
        limit: 500,
        plan: 'PRO',
        upgrade: 'TEAM',
      }),
    );
    expect(r!.message).toContain('Team cap reached');
    expect(r!.message).toContain('Upgrade to Enterprise');
    expect(r!.message).toContain('Atrium queries');
  });

  it('falls back to "Contact support" when there is no higher tier', async () => {
    const r = await readCapResponse(
      res(429, {
        error: 'Usage limit exceeded',
        metric: 'executions',
        current: 10000,
        limit: 10000,
        plan: 'TEAM',
        upgrade: null,
      }),
    );
    expect(r!.message).toContain('Enterprise cap reached');
    expect(r!.message).toContain('Contact support');
  });

  it('survives malformed bodies', async () => {
    expect(await readCapResponse(res(429, 'not an object'))).toBeNull();
    expect(await readCapResponse(res(429, null))).toBeNull();
    expect(
      await readCapResponse(
        res(429, { error: 'Usage limit exceeded', metric: 123 }),
      ),
    ).toBeNull();
  });
});
