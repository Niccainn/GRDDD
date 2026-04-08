import { NextRequest } from 'next/server';
import { signIn } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const identity = await signIn(email, password);
    return Response.json({ success: true, identity });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Sign in failed';
    return Response.json({ error: message }, { status: 401 });
  }
}
