/**
 * /welcome — onboarding entry, server wrapper.
 *
 * Pre-PR: the welcome page assumed an Environment already existed
 * for the signed-in user, then redirected mid-flow to /systems/<id>.
 * For users arriving via an invite — where the signup flow doesn't
 * auto-create an env — that redirect 404'd and the wizard left them
 * stranded.
 *
 * Now: this server component runs first, ensures the user has at
 * least one Environment, and only then renders the client wizard.
 * The default env is named after the user (or 'My Workspace' if
 * Identity.name is unset) and slugged uniquely.
 *
 * The client form continues to read /api/environments to pick a
 * primary; the new env we create here will be the only result for a
 * fresh account.
 */

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getAuthIdentityOrNull } from '@/lib/auth';
import WelcomeClient from './WelcomeClient';

/** Slugify a string for use as Environment.slug. Same shape as the
 *  /environments createEnvironment server action. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

async function ensureDefaultEnvironment(identityId: string, identityName: string | null) {
  const existing = await prisma.environment.findFirst({
    where: { ownerId: identityId, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const baseName = (identityName?.trim() ? `${identityName.trim()}'s Workspace` : 'My Workspace');
  const baseSlug = slugify(baseName) || 'workspace';

  // Slug uniqueness — append a short suffix if the chosen slug
  // collides with another tenant's. Up to 5 attempts; falls through
  // to a random suffix if all collide.
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const collision = await prisma.environment.findFirst({
      where: { slug },
      select: { id: true },
    });
    if (!collision) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const env = await prisma.environment.create({
    data: {
      name: baseName,
      description: 'Your default workspace — created automatically when you signed in.',
      slug,
      ownerId: identityId,
    },
    select: { id: true },
  });
  return env.id;
}

export default async function WelcomePage() {
  const identity = await getAuthIdentityOrNull();
  if (!identity) redirect('/sign-in?next=/welcome');

  // Best-effort: a failure here shouldn't block the wizard — the
  // client form falls back to whatever env it can find.
  try {
    await ensureDefaultEnvironment(identity.id, identity.name);
  } catch {
    /* non-fatal — the client will surface a friendly empty-state */
  }

  return <WelcomeClient />;
}
