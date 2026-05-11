/**
 * Pure parser for /api/integrations responses, used by the welcome
 * wizard's connect step to know which integrations the user has wired
 * up so the "Let Atrium build it" CTA can unlock.
 *
 * Why this lives in its own file:
 *   The previous implementation inline-parsed the response wrong
 *   (assumed a top-level array; the API returns { integrations: [] }
 *   with each row keyed on `provider` and `status`, not `connected`
 *   and `id`). That bug silently kept the wizard's connect button
 *   disabled forever — every cold sign-up that picked a wedge with
 *   integrations got stuck on the connect screen.
 *
 *   Putting the parse in a pure function lets a unit test lock the
 *   API contract: if the API ever changes shape or status semantics,
 *   the test fails before users do.
 */

export function activeProviderIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as { integrations?: unknown };
  const list = Array.isArray(data.integrations) ? data.integrations : [];
  const out: string[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { provider?: unknown; status?: unknown };
    if (typeof r.provider === 'string' && r.status === 'ACTIVE') {
      out.push(r.provider);
    }
  }
  return out;
}
