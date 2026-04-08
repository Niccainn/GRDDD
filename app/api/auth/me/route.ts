import { getAuthIdentityOrNull } from '@/lib/auth';

export async function GET() {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  return Response.json({ authenticated: true, identity });
}
