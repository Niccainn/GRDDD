import { getAuthIdentity } from '@/lib/auth';
import { ensureWorkspace } from '@/lib/ensure-workspace';

export async function POST() {
  try {
    const identity = await getAuthIdentity();
    const env = await ensureWorkspace(identity.id);
    return Response.json({ environmentId: env.id });
  } catch {
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
