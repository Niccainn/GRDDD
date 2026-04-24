import { getAuthIdentity } from '@/lib/auth';
import { ensureWorkspace } from '@/lib/ensure-workspace';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const identity = await getAuthIdentity();
    const env = await ensureWorkspace(identity.id);
    // Cache the primary env slug so middleware can one-hop `/` to
    // `/environments/<slug>` on the next visit — no more dashboard
    // flash for users who signed up before we started setting this
    // cookie at session-mint time.
    const cookieStore = await cookies();
    cookieStore.set('grid_env_slug', env.slug, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days; refreshed on every login
    });
    return Response.json({ environmentId: env.id, slug: env.slug });
  } catch {
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
