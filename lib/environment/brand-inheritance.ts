/**
 * Brand DNA inheritance for parent/child environments.
 *
 * Multi-brand operators (one agency, many client cells) want a shared
 * nucleus at the parent level with per-child overrides. This helper
 * resolves the effective brand fields by walking the parent chain
 * once — child values win, parent fills the gaps, no cycles.
 *
 * Permissions and row-level data remain scoped per env. Only brand
 * copy (tone / audience / values / keywords / voice-don't / bio)
 * inherits. Everything else (anthropic keys, integrations, members)
 * is per-env.
 */

import { prisma } from '../db';

export type BrandNucleus = {
  brandName: string | null;
  brandColor: string | null;
  brandLogo: string | null;
  brandTone: string | null;
  brandAudience: string | null;
  brandValues: string | null;
  brandKeywords: string | null;
  brandVoiceDont: string | null;
  brandBio: string | null;
};

const BRAND_FIELDS: (keyof BrandNucleus)[] = [
  'brandName',
  'brandColor',
  'brandLogo',
  'brandTone',
  'brandAudience',
  'brandValues',
  'brandKeywords',
  'brandVoiceDont',
  'brandBio',
];

type EnvRow = BrandNucleus & { id: string; parentEnvironmentId: string | null };

const MAX_DEPTH = 5; // sanity cap — no legitimate hierarchy needs more

export async function resolveBrandNucleus(environmentId: string): Promise<BrandNucleus> {
  const chain: EnvRow[] = [];
  const visited = new Set<string>();
  let currentId: string | null = environmentId;

  while (currentId && chain.length < MAX_DEPTH) {
    if (visited.has(currentId)) break; // cycle guard
    visited.add(currentId);
    const row: EnvRow | null = await prisma.environment.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        parentEnvironmentId: true,
        brandName: true,
        brandColor: true,
        brandLogo: true,
        brandTone: true,
        brandAudience: true,
        brandValues: true,
        brandKeywords: true,
        brandVoiceDont: true,
        brandBio: true,
      },
    });
    if (!row) break;
    chain.push(row);
    currentId = row.parentEnvironmentId;
  }

  return mergeChain(chain);
}

/**
 * Pure merge step, exposed for unit tests. Child (index 0) wins, each
 * parent fills remaining blanks in order. Any field not set by any
 * env is null.
 */
export function mergeChain(chain: EnvRow[]): BrandNucleus {
  const out = {} as BrandNucleus;
  for (const field of BRAND_FIELDS) {
    out[field] = null;
    for (const row of chain) {
      const v = row[field];
      if (v !== null && v !== undefined && v !== '') {
        out[field] = v;
        break;
      }
    }
  }
  return out;
}
