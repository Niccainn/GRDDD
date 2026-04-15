import { signOut } from '@/lib/auth';

export async function POST() {
  await signOut();
  const res = Response.json({ success: true });
  const headers = new Headers(res.headers);
  // Clear the onboarding cookie so a fresh sign-in re-evaluates
  // whether the user has completed onboarding.
  headers.append(
    'Set-Cookie',
    'grid_onboarded=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
  );
  return new Response(res.body, { status: res.status, headers });
}
