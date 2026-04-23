'use client';

/**
 * /projects — cross-environment project index.
 *
 * Lists every live project across all environments the caller can
 * see. Grouped by environment so the user can read the state of
 * every team's work-in-progress in one glance.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Project } from '@/lib/projects/types';
import { PROJECT_TEMPLATES } from '@/lib/projects/templates';

type EnvRow = { id: string; name: string; slug: string; color: string | null };

const STATUS_COLOR: Record<Project['status'], string> = {
  planning: '#7193ED',
  running: '#BF9FF1',
  paused: '#F5D76E',
  awaiting_approval: '#F5D76E',
  done: '#C8F26B',
  failed: '#FF6B6B',
};

export default function ProjectsIndexPage() {
  const [envs, setEnvs] = useState<EnvRow[]>([]);
  const [projectsByEnv, setProjectsByEnv] = useState<Record<string, Project[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await (await fetch('/api/environments')).json();
      const envList: EnvRow[] = Array.isArray(list) ? list : [];
      setEnvs(envList);
      const fetched = await Promise.all(
        envList.map(e =>
          fetch(`/api/projects?envId=${e.id}`)
            .then(r => r.json())
            .then(d => [e.id, Array.isArray(d.projects) ? d.projects : []] as const)
            .catch(() => [e.id, [] as Project[]] as const),
        ),
      );
      const byEnv: Record<string, Project[]> = {};
      for (const [id, ps] of fetched) byEnv[id] = ps;
      setProjectsByEnv(byEnv);
      setLoading(false);
    })();
  }, []);

  const total = Object.values(projectsByEnv).reduce((s, p) => s + p.length, 0);
  const [launching, setLaunching] = useState<string | null>(null);

  async function launchTemplate(templateId: string) {
    if (launching) return;
    const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
    const targetEnv = envs[0];
    if (!template || !targetEnv) return;
    setLaunching(templateId);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentId: targetEnv.id, goal: template.goal }),
      });
      const data = await res.json();
      if (data.project?.id) {
        window.location.href = `/projects/${data.project.id}`;
      } else {
        setLaunching(null);
      }
    } catch {
      setLaunching(null);
    }
  }

  const TEMPLATE_BADGE_COLORS: Record<string, string> = {
    brand: '#BF9FF1',
    marketing: '#E879F9',
    operations: '#7193ED',
    design: '#6395FF',
    finance: '#C8F26B',
    development: '#F5D76E',
  };

  return (
    <div className="px-4 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
        Projects
      </p>
      <h1
        className="text-2xl md:text-3xl font-extralight tracking-tight mb-2"
        style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
      >
        Live work, across every team
      </h1>
      <p className="text-sm font-light mb-8" style={{ color: 'var(--text-3)' }}>
        {loading ? 'Loading…' : `${total} project${total === 1 ? '' : 's'} across ${envs.length} environment${envs.length === 1 ? '' : 's'}`}
      </p>

      {!loading && envs.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            No environments yet. Create one to start a project.
          </p>
        </div>
      )}

      {/* Featured prompts — the five-minute showcase. A new user who
          lands here without any projects yet should be able to run
          one in a single click. Routes through /api/projects with
          the template's canonical goal; the project run page takes
          over from there. */}
      {!loading && envs.length > 0 && total === 0 && (
        <section className="mb-10">
          <p
            className="text-[10px] tracking-[0.18em] uppercase font-light mb-3"
            style={{ color: 'var(--brand)' }}
          >
            Try one of these
          </p>
          <p className="text-sm font-light mb-5" style={{ color: 'var(--text-2)' }}>
            A prompt becomes a plan. Nova executes across real tools with a human
            gate before anything user-visible. One click to launch.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROJECT_TEMPLATES.map(t => {
              const color = TEMPLATE_BADGE_COLORS[t.badge] ?? '#BF9FF1';
              const isLaunching = launching === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => launchTemplate(t.id)}
                  disabled={!!launching}
                  className="text-left rounded-2xl p-5 transition-all disabled:opacity-40"
                  style={{
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: isLaunching ? `inset 0 0 0 1px ${color}30` : 'none',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                      {t.title}
                    </p>
                    <span
                      className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        color,
                        background: `${color}14`,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-xs font-light leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
                    {t.subtitle}
                  </p>
                  <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                    {isLaunching ? 'Nova is planning…' : 'One click to launch →'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!loading && envs.map(env => {
        const ps = projectsByEnv[env.id] ?? [];
        return (
          <section key={env.id} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              {env.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: env.color }} />}
              <Link
                href={`/environments/${env.slug}`}
                className="text-sm font-light"
                style={{ color: 'var(--text-1)' }}
              >
                {env.name}
              </Link>
              <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                {ps.length === 0 ? 'no projects yet' : `${ps.length} project${ps.length === 1 ? '' : 's'}`}
              </span>
            </div>
            {ps.length === 0 ? (
              <div
                className="rounded-xl px-4 py-3 text-xs font-light"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  color: 'var(--text-3)',
                }}
              >
                Open the environment to start one.
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                {ps.map((p, i) => {
                  const doneCount = p.plan.filter(s => s.status === 'done').length;
                  const pct = p.plan.length > 0 ? Math.round((doneCount / p.plan.length) * 100) : 0;
                  const color = STATUS_COLOR[p.status];
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors"
                      style={{
                        borderBottom: i < ps.length - 1 ? '1px solid var(--glass-border)' : 'none',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>{p.goal}</span>
                        <span className="block text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                          {doneCount}/{p.plan.length} steps · {p.status.replace('_', ' ')}
                        </span>
                      </span>
                      <span className="h-1 w-14 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <span className="h-full block rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
