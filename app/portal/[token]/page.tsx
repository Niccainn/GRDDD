'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

type System = { id: string; name: string; description: string; color: string; icon: string; healthScore: number };
type Workflow = { id: string; name: string; description: string; status: string; stages: string; system: { name: string; color: string } };
type Goal = { id: string; title: string; status: string; progress: number | null; target: string; current: string; dueDate: string | null; system: { name: string; color: string } };
type Execution = { id: string; status: string; input: string; createdAt: string; completedAt: string | null; workflow: { name: string } | null; system: { name: string } | null };

type PortalData = {
  title: string;
  brandColor: string;
  brandLogo: string | null;
  systems?: System[];
  workflows?: Workflow[];
  goals?: Goal[];
  executions?: Execution[];
};

const statusColor: Record<string, string> = {
  ACTIVE: '#C8F26B', COMPLETED: '#C8F26B', DONE: '#C8F26B', ON_TRACK: '#C8F26B',
  DRAFT: 'rgba(255,255,255,0.3)', PAUSED: '#F7C700', AT_RISK: '#F7C700',
  RUNNING: '#7193ED', IN_PROGRESS: '#7193ED', BEHIND: '#FF6B6B', FAILED: '#FF6B6B',
};

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 410 ? 'This portal link has expired.' : 'Portal not found.');
        return r.json();
      })
      .then(d => setData(d))
      .catch(e => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080C' }}>
        <div className="text-center">
          <p className="text-lg font-light mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>{error}</p>
          <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>Contact the workspace owner for a new link.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080C' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const accent = data.brandColor;

  return (
    <div className="min-h-screen" style={{ background: '#08080C' }}>
      {/* Header */}
      <header className="px-8 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          {data.brandLogo && <Image src={data.brandLogo} alt="" width={120} height={32} className="h-8 w-auto" />}
          <h1 className="text-lg font-light" style={{ color: 'rgba(255,255,255,0.9)' }}>{data.title}</h1>
          <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
            Client Portal
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        {/* Systems */}
        {data.systems && data.systems.length > 0 && (
          <section>
            <h2 className="text-xs font-light tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>SYSTEMS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.systems.map(s => (
                <div key={s.id} className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>{s.name}</span>
                    <span className="ml-auto text-xs font-light" style={{ color: s.healthScore >= 80 ? '#C8F26B' : s.healthScore >= 50 ? '#F7C700' : '#FF6B6B' }}>
                      {s.healthScore}%
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Goals */}
        {data.goals && data.goals.length > 0 && (
          <section>
            <h2 className="text-xs font-light tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>GOALS</h2>
            <div className="space-y-2">
              {data.goals.map(g => (
                <div key={g.id} className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>{g.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${statusColor[g.status] ?? accent}14`, color: statusColor[g.status] ?? accent }}>
                      {g.status.toLowerCase().replace('_', ' ')}
                    </span>
                    {g.dueDate && (
                      <span className="ml-auto text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Due {new Date(g.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {g.progress !== null && (
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, g.progress)}%`, background: statusColor[g.status] ?? accent }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Workflows */}
        {data.workflows && data.workflows.length > 0 && (
          <section>
            <h2 className="text-xs font-light tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>WORKFLOWS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.workflows.map(wf => {
                const stages = wf.stages ? JSON.parse(wf.stages) : [];
                return (
                  <div key={wf.id} className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: wf.system?.color ?? accent }} />
                      <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>{wf.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto"
                        style={{ background: `${statusColor[wf.status] ?? accent}14`, color: statusColor[wf.status] ?? accent }}>
                        {wf.status.toLowerCase()}
                      </span>
                    </div>
                    {wf.description && (
                      <p className="text-xs font-light mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{wf.description}</p>
                    )}
                    {stages.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {stages.map((s: string, i: number) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent executions */}
        {data.executions && data.executions.length > 0 && (
          <section>
            <h2 className="text-xs font-light tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>RECENT ACTIVITY</h2>
            <div className="space-y-1.5">
              {data.executions.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor[e.status] ?? accent }} />
                  <span className="text-xs font-light truncate flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {e.workflow?.name ?? e.system?.name ?? 'Execution'}
                  </span>
                  <span className="text-[10px]" style={{ color: statusColor[e.status] ?? accent }}>
                    {e.status.toLowerCase()}
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.15)' }}>
          Powered by GRID
        </p>
      </footer>
    </div>
  );
}
