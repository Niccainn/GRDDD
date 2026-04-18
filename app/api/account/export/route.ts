import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GDPR Article 20 — Right to data portability.
 *
 *   GET /api/account/export
 *
 * Returns the full tenant-scoped data set for the authenticated
 * identity as a machine-readable JSON blob. "Portability" means the
 * user can take this file and import it into another system — so
 * the format is schema-stable and documented inline.
 *
 * What's included:
 *   - Identity row (minus password hash, session tokens, verification tokens)
 *   - Every Environment the user owns + their memberships
 *   - Systems, Workflows (+stages JSON), Signals, Goals, Tasks,
 *     Executions, SystemAgents, MasteryInsights the user owns
 *   - Integrations (metadata only — credentials explicitly excluded)
 *   - App errors scoped to the identity or their envs
 *
 * What's explicitly NOT included (and why):
 *   - `passwordHash` — never leaves the server in plaintext or hash form
 *   - `credentialsEnc`, `refreshTokenEnc` on integrations — encrypted
 *     API tokens stay encrypted; re-export them by reconnecting the
 *     integration in the new system
 *   - `anthropicKeyEnc` on environments — same rationale
 *   - Active session rows — transient, security-sensitive
 *   - Email verification tokens — transient
 *
 * Rate limited: 3 exports per hour per identity (export is heavy but
 * legitimate use is infrequent).
 */

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimit(`account-export:${identity.id}`, 3, 60 * 60_000);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  // Fetch everything the user owns in parallel where safe.
  const [identityRow, environments] = await Promise.all([
    prisma.identity.findUnique({
      where: { id: identity.id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        type: true,
        name: true,
        email: true,
        authId: true,
        emailVerifiedAt: true,
      },
    }),
    prisma.environment.findMany({
      where: { ownerId: identity.id, deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        icon: true,
        brandName: true,
        brandColor: true,
        brandLogo: true,
        brandTone: true,
        brandAudience: true,
        brandValues: true,
        brandKeywords: true,
        brandVoiceDont: true,
        brandBio: true,
        parentEnvironmentId: true,
        // anthropicKeyPreview is the safe-to-display suffix; the
        // encrypted key itself is excluded by design.
        anthropicKeyPreview: true,
        anthropicKeyAddedAt: true,
        anthropicKeySource: true,
      },
    }),
  ]);

  if (!identityRow) return Response.json({ error: 'Identity not found' }, { status: 404 });

  const envIds = environments.map(e => e.id);

  const [
    systems,
    workflows,
    signals,
    goals,
    tasks,
    executions,
    systemAgents,
    masteryInsights,
    integrations,
    memberships,
    appErrors,
  ] = envIds.length === 0
    ? Array(11).fill([])
    : await Promise.all([
        prisma.system.findMany({ where: { environmentId: { in: envIds } } }),
        prisma.workflow.findMany({ where: { environmentId: { in: envIds } } }),
        prisma.signal.findMany({ where: { environmentId: { in: envIds } } }),
        prisma.goal.findMany({ where: { environmentId: { in: envIds } } }),
        prisma.task.findMany({ where: { environmentId: { in: envIds } } }),
        prisma.execution.findMany({
          where: { system: { environmentId: { in: envIds } } },
          select: {
            id: true, createdAt: true, status: true, input: true, output: true,
            currentStage: true, completedAt: true, systemId: true, workflowId: true,
          },
        }),
        prisma.systemAgent.findMany({
          where: { system: { environmentId: { in: envIds } } },
        }),
        prisma.masteryInsight.findMany({ where: { environmentId: { in: envIds } } }),
        prisma.integration.findMany({
          where: { environmentId: { in: envIds } },
          select: {
            id: true, createdAt: true, updatedAt: true, provider: true, displayName: true,
            accountLabel: true, authType: true, credentialsPreview: true, expiresAt: true,
            status: true, lastSyncedAt: true, environmentId: true,
            // NOTE: credentialsEnc + refreshTokenEnc are explicitly
            // excluded. Users re-auth at the new system.
          },
        }),
        prisma.environmentMembership.findMany({ where: { environmentId: { in: envIds } } }),
        prisma.appError.findMany({
          where: {
            OR: [
              { identityId: identity.id },
              { environmentId: { in: envIds } },
            ],
          },
          take: 500, // bound the export size
          orderBy: { createdAt: 'desc' },
        }),
      ]);

  const bundle = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    notice:
      'This file contains your Grid data as of the export timestamp. Encrypted credentials (API keys, OAuth tokens) are excluded — reconnect integrations at the destination.',
    identity: identityRow,
    environments,
    memberships,
    systems,
    workflows,
    signals,
    goals,
    tasks,
    executions,
    systemAgents,
    masteryInsights,
    integrations,
    appErrors,
  };

  // Return as a downloadable attachment so the browser saves the
  // file with a sensible name rather than rendering 2MB of JSON.
  const filename = `grid-export-${identity.id}-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
