import { getAuthIdentityOrNull } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limited' }, { status: 429 });
  }

  // Return a lightweight "what changed" response
  // The client uses the timestamp to decide whether to refetch relevant data
  return Response.json({
    ts: Date.now(),
  });
}
