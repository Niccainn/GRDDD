import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * When RESEND_API_KEY is unset, sendEmail used to silently skip and
 * return { ok: true, skipped: true }. The forgot-password route
 * returns 200 regardless (enumeration safety), so users saw "check
 * your email" forever. This test locks the behaviour that email
 * failures now call logError so ops sees them.
 */

const { logErrorMock } = vi.hoisted(() => ({ logErrorMock: vi.fn() }));

vi.mock('../lib/observability/errors', () => ({
  logError: logErrorMock,
}));

beforeEach(() => {
  logErrorMock.mockReset();
  delete process.env.RESEND_API_KEY;
  vi.resetModules();
});

describe('sendEmail failure observability', () => {
  it('logs a warn-level AppError entry when RESEND_API_KEY is unset', async () => {
    const { sendEmail } = await import('../lib/email');
    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Reset your password',
      html: '<p>Reset</p>',
    });

    expect(result.ok).toBe(true); // preserves enumeration safety
    expect(result.skipped).toBe(true);
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    const call = logErrorMock.mock.calls[0][0];
    expect(call.scope).toBe('email');
    expect(call.level).toBe('warn');
    expect(call.context.reason).toBe('unconfigured');
    // Never logs the full address — only the domain.
    expect(call.context.toDomain).toBe('example.com');
    expect(JSON.stringify(call)).not.toContain('user@example.com');
  });

  it('logs error-level on send_threw and never leaks the recipient', async () => {
    process.env.RESEND_API_KEY = 'fake-key-for-test';
    // Mock resend to throw
    vi.doMock('resend', () => ({
      Resend: class {
        emails = {
          send: async () => { throw new Error('network down'); },
        };
      },
    }));
    const { sendEmail } = await import('../lib/email');
    const result = await sendEmail({
      to: 'alice@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
    });

    expect(result.ok).toBe(false);
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    const call = logErrorMock.mock.calls[0][0];
    expect(call.level).toBe('error');
    expect(call.context.reason).toBe('send_threw');
    expect(JSON.stringify(call)).not.toContain('alice@example.com');
  });
});
