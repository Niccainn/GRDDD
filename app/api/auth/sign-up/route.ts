import { NextRequest } from 'next/server';
import { signUp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const identity = await signUp(name, email, password);
    return Response.json({ success: true, identity });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Sign up failed';
    return Response.json({ error: message }, { status: 400 });
  }
}
