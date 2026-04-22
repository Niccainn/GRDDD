'use client';

/**
 * ProjectsWidget — active multi-step Projects for this Environment.
 * Each row deep-links to the Zapier-style /projects/[id] view.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DataOriginTag from '@/components/widgets/DataOriginTag';
import type { Project } from '@/lib/projects/types';

const STATUS_COLOR: Record<Project['status'], string> = {
  planning: '#7193ED',
  running: '#BF9FF1',
  paused: '#F5D76E',
  awaiting_approval: '#F5D76E',
  done: '#C8F26B',
  failed: '#FF6B6B',
};

export default function ProjectsWidget({ environmentId }: { environmentId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects?envId=${environmentId}`)
      .then(r => r.json())
      .then(d => { setProjects(Array.isArray(d.projects) ? d.projects : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environmentId]);

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] tracking-[0.18em] uppercase font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Live projects
        </p>
        <div className="flex items-center gap-2">
          <DataOriginTag
            sources={['Execution (output.kind=project)']}
            computed="Nova-planned multi-step initiatives. Each step has a tool, a status, and a human-review gate where relevant."
          />
          <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
            {loading ? '' : projects.length === 0 ? 'None yet' : `${projects.length} tracked`}
          </span>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="py-6">
          <p className="text-xs font-light mb-1" style={{ color: 'var(--text-2)' }}>
            Ready for Nova to run a real project?
          </p>
          <p className="text-[11px] font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>
            A project is a multi-tool initiative — design, campaign, onboarding — where Nova plans the steps, opens the tools, and pauses for your review at every checkpoint.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {projects.map(p => {
            const doneCount = p.plan.filter(s => s.status === 'done').length;
            const totalCount = p.plan.length;
            const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
            const color = STATUS_COLOR[p.status];
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>
                    {p.goal}
                  </span>
                  <span className="block text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                    {doneCount}/{totalCount} steps · {p.status.replace('_', ' ')}
                  </span>
                </span>
                <span
                  className="h-1 w-14 rounded-full overflow-hidden flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <span
                    className="h-full block rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
