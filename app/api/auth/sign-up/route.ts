import { NextRequest } from 'next/server';
import { signUp } from '@/lib/auth';
import { rateLimitSignUpByIpDistributed } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  // Per-IP signup rate limit. 4 signups / hour stops bot farms from
  // squatting accounts faster than email verification can react. The
  // distributed limiter shares state across Vercel instances when
  // Upstash is configured.
  const ip = clientIp(req);
  const limit = await rateLimitSignUpByIpDistributed(ip);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 60_000));
    return Response.json(
      { error: `Too many signups from this address. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
      { status: 429 }
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, email, password } = body;

  if (!name || !email || !password) {
    return Response.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  try {
    const identity = await signUp(name, email, password);
    return Response.json({ success: true, identity });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Sign up failed';
    return Response.json({ error: message }, { status: 400 });
  }
}
