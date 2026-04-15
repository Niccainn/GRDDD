/**
 * /marketplace — Workflow Marketplace listing
 *
 * The "app store" for running AGI-executable workflows. Every card is
 * a one-click runnable WorkflowSpec sourced from the built-in template
 * registry (and, in Phase 3, from tenant-authored specs).
 *
 * This page is deliberately dense: the whole point of the Agentic
 * Work OS story is that you can see at a glance WHAT the system will
 * run on your behalf. Nothing should feel hidden.
 */
import Link from 'next/link';
import { listWorkflows, summarize, availableCategories } from '@/lib/workflows';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  schedule: 'Scheduled',
  webhook: 'Webhook',
  signal: 'Reactive',
};

const TRIGGER_COLOR: Record<string, string> = {
  manual: '#94a3b8',
  schedule: '#60a5fa',
  webhook: '#f472b6',
  signal: '#fbbf24',
};

export default async function MarketplacePage() {
  const identity = await getAuthIdentityOrNull();
  if (!identity) redirect('/sign-in');

  const specs = listWorkflows().map(summarize);
  const categories = availableCategories();

  return (
    <div className="min-h-screen ambient-bg px-6 py-16">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
            Agentic Work OS · Workflow Marketplace
          </p>
          <h1 className="text-3xl font-light mb-2" style={{ color: 'var(--text-1)' }}>
            What Nova will run for you
          </h1>
          <p className="text-sm max-w-xl font-light" style={{ color: 'var(--text-3)' }}>
            Every workflow is a multi-stage program the kernel executes end-to-end.
            Pick one, click Run, watch it work. Each run feeds back into Nova's
            per-tenant memory — so next week's scan is sharper than this week's.
          </p>
        </header>

        {categories.length > 0 && (
          <nav className="flex flex-wrap gap-2 mb-8">
            {categories.map((c) => (
              <span
                key={c}
                className="px-3 py-1.5 text-[11px] font-light rounded-full"
                style={{
                  background: 'var(--glass-1, rgba(255,255,255,0.04))',
                  border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                  color: 'var(--text-2)',
                }}
              >
                {c}
              </span>
            ))}
          </nav>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {specs.map((s) => (
            <Link
              key={s.slug}
              href={`/marketplace/${s.slug}`}
              className="glass-panel p-6 transition-all hover:translate-y-[-2px]"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-light truncate" style={{ color: 'var(--text-1)' }}>
                    {s.name}
                  </h2>
                  <p className="text-xs mt-1 font-light" style={{ color: 'var(--text-3)' }}>
                    {s.category} · {s.stageCount} stages · v{s.version}
                  </p>
                </div>
                <span
                  className="px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full ml-3 flex-shrink-0"
                  style={{
                    background: `${TRIGGER_COLOR[s.triggerType]}18`,
                    color: TRIGGER_COLOR[s.triggerType],
                    border: `1px solid ${TRIGGER_COLOR[s.triggerType]}40`,
                  }}
                >
                  {TRIGGER_LABEL[s.triggerType]}
                </span>
              </div>
              <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {s.tagline}
              </p>
              {s.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {s.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full font-light"
                      style={{
                        color: 'var(--text-3)',
                        background: 'var(--glass-1, rgba(255,255,255,0.03))',
                        border: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {specs.length === 0 && (
          <p className="text-sm text-center py-20 font-light" style={{ color: 'var(--text-3)' }}>
            No workflows registered yet.
          </p>
        )}
      </div>
    </div>
  );
}
