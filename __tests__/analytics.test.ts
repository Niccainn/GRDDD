import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent } from '../lib/analytics';

/**
 * trackEvent is fire-and-forget. The contract we care about:
 *   1. It posts to /api/analytics/event
 *   2. It sends the expected JSON shape (event name, metadata, timestamp)
 *   3. It NEVER throws or rejects — analytics must not break UI flow
 */

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('trackEvent', () => {
  it('posts to the analytics endpoint with expected shape', () => {
    fetchMock.mockResolvedValue({ ok: true });
    trackEvent('funnel.sign_up_completed', { foo: 'bar' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/event',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.event).toBe('funnel.sign_up_completed');
    expect(body.metadata).toEqual({ foo: 'bar' });
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('is fire-and-forget — swallows fetch rejection', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    expect(() => trackEvent('funnel.sign_up_started')).not.toThrow();
    // Drain the microtask so the .catch runs
    await new Promise(r => setTimeout(r, 0));
  });

  it('does not throw when metadata is omitted', () => {
    fetchMock.mockResolvedValue({ ok: true });
    expect(() => trackEvent('funnel.first_review')).not.toThrow();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.metadata).toBeUndefined();
  });
});
