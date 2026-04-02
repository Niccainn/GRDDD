'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import GlobalNovaBar from '@/components/GlobalNovaBar';

type SystemData = {
  id: string;
  name: string;
  color: string | null;
  environmentName: string;
  healthScore: number | null;
  activeWorkflows: number;
  totalWorkflows: number;
  totalExecutions: number;
  lastActivity: string;
};

type ActivityItem = {
  id: string;
  systemId: string | null;
  systemName: string;
  systemColor: string | null;
  query: string;
  response: string;
  tokens: number | null;
  createdAt: string;
};

type ExecutionItem = {
  id: string;
  status: string;
  input: string;
  createdAt: string;
  completedAt: string | null;
  system: { id: string; name: string; color: string | null };
  workflow: { id: string; name: string } | null;
  validationScore: number | null;
};

type WfStats = {
  total: number;
  active: number;
  draft: number;
  paused: number;
  stalled: { id: string; name: string; systemName: string }[];
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#15AD70',
  RUNNING: '#7193ED',
  FAILED: '#FF6B6B',
  CANCELLED: 'rgba(255,255,255,0.25)',
};

export default function OperatePage() {
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [executions, setExecutions] = useState<ExecutionItem[]>([]);
  const [wfStats, setWfStats] = useState<WfStats | null>(null);
  const [avgHealth, setAvgHealth] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedTab, setFeedTab] = useState<'activity' | 'runs'>('runs');

  useEffect(() => {
    fetch('/api/operate-data')
      .then(r => r.json())
      .then(d => {
        setSystems(d.systems);
        setActivity(d.activity);
        setExecutions(d.executions ?? []);
        setWfStats(d.workflows);
        setAvgHealth(d.avgHealth);
        setLoaded(true);
        // Default to activity tab if there's nova activity, else runs
        if ((d.activity ?? []).length > 0) setFeedTab('activity');
      });
  }, []);

  function healthColor(score: number | null) {
    if (score === null) return 'rgba(255,255,255,0.2)';
    if (score >= 80) return '#15AD70';
    if (score >= 60) return '#F7C700';
    return '#FF6B6B';
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function duration(start: string, end: string | null) {
    if (!end) return null;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m`;
  }

  const driftSystems = systems.filter(s => s.healthScore !== null && s.healthScore < 70);

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Operate</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {loaded ? `${systems.length} system${systems.length !== 1 ? 's' : ''} · ${wfStats?.active ?? 0} active workflows` : 'Loading···'}
          </p>
        </div>
        {loaded && (
          <div className="flex items-center gap-2">
            {driftSystems.length > 0 ? (
              <Link href="/systems" className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-full transition-all"
                style={{ background: 'rgba(247,199,0,0.08)', border: '1px solid rgba(247,199,0,0.2)', color: '#F7C700' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#F7C700' }} />
                {driftSystems.length} drift alert{driftSystems.length !== 1 ? 's' : ''}
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(21,173,112,0.08)', border: '1px solid rgba(21,173,112,0.2)', color: '#15AD70' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#15AD70' }} />
                All systems stable
              </span>
            )}
          </div>
        )}
      </div>

      {/* Global Nova bar */}
      <GlobalNovaBar />

      {/* Stat bar */}
      {loaded && (
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Avg Health', value: avgHealth !== null ? `${avgHealth}%` : '—', color: healthColor(avgHealth), href: '/systems' },
            { label: 'Active Workflows', value: wfStats?.active ?? 0, color: '#15AD70', href: '/workflows' },
            { label: 'Total Runs', value: executions.length > 0 ? `${executions.length}+` : '0', color: 'rgba(255,255,255,0.5)', href: '/executions' },
            { label: 'Stalled', value: wfStats?.paused ?? 0, color: wfStats?.paused ? '#F7C700' : 'rgba(255,255,255,0.2)', href: '/workflows' },
          ].map(stat => (
            <Link key={stat.label} href={stat.href}
              className="px-5 py-4 rounded-xl group transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-2 transition-colors group-hover:text-white/50" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
              <p className="text-2xl font-extralight" style={{ color: stat.color }}>{stat.value}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Systems panel */}
        <div className="col-span-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>SYSTEMS</p>
            <Link href="/systems" className="text-xs font-light transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>
              Manage →
            </Link>
          </div>
          <div className="space-y-2">
            {!loaded ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface)' }} />
              ))
            ) : systems.length === 0 ? (
              <div className="flex flex-col items-center py-10 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No systems yet</p>
                <Link href="/systems" className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Create one →</Link>
              </div>
            ) : (
              systems.map(s => (
                <Link key={s.id} href={`/systems/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg group transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color ?? 'rgba(255,255,255,0.3)' }} />
                  <span className="flex-1 text-sm font-light truncate group-hover:text-white transition-colors"
                    style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {s.name}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.activeWorkflows > 0 && (
                      <span className="text-xs" style={{ color: '#15AD70' }}>{s.activeWorkflows} active</span>
                    )}
                    {s.healthScore !== null && (
                      <span className="text-xs font-light tabular-nums"
                        style={{ color: healthColor(s.healthScore) }}>
                        {Math.round(s.healthScore)}%
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Stalled */}
          {loaded && wfStats && wfStats.stalled.length > 0 && (
            <div className="mt-6">
              <p className="text-xs tracking-[0.12em] mb-3" style={{ color: 'var(--text-tertiary)' }}>STALLED</p>
              <div className="space-y-1.5">
                {wfStats.stalled.map(w => (
                  <Link key={w.id} href={`/workflows/${w.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg group transition-all"
                    style={{ background: 'rgba(247,199,0,0.04)', border: '1px solid rgba(247,199,0,0.15)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F7C700' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-light truncate group-hover:text-white transition-colors"
                        style={{ color: 'rgba(255,255,255,0.7)' }}>{w.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{w.systemName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          {loaded && (
            <div className="mt-6 space-y-1.5">
              <p className="text-xs tracking-[0.12em] mb-3" style={{ color: 'var(--text-tertiary)' }}>QUICK ACCESS</p>
              {[
                { label: 'Inbox', href: '/inbox', icon: '✉' },
                { label: 'Reports', href: '/reports', icon: '⊡' },
                { label: 'Analytics', href: '/analytics', icon: '∿' },
                { label: 'Audit log', href: '/audit', icon: '☰' },
              ].map(link => (
                <Link key={link.href + link.label} href={link.href}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg group transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid transparent' }}>
                  <span className="text-xs w-4 text-center flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>{link.icon}</span>
                  <span className="text-xs font-light group-hover:text-white/60 transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity / Runs feed */}
        <div className="col-span-2">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 mb-4">
            {(['runs', 'activity'] as const).map(tab => (
              <button key={tab} onClick={() => setFeedTab(tab)}
                className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: feedTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: `1px solid ${feedTab === tab ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                  color: feedTab === tab ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                }}>
                {tab === 'runs' ? `Runs${executions.length > 0 ? ` (${executions.length})` : ''}` : `Nova Activity${activity.length > 0 ? ` (${activity.length})` : ''}`}
              </button>
            ))}
            <Link href={feedTab === 'runs' ? '/executions' : '/nova'}
              className="ml-auto text-xs font-light transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>
              View all →
            </Link>
          </div>

          {/* Runs feed */}
          {feedTab === 'runs' && (
            !loaded ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
                ))}
              </div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl"
                style={{ border: '1px dashed var(--border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(21,173,112,0.08)', border: '1px solid rgba(21,173,112,0.15)' }}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                    <path d="M3 2.5L12 7.5L3 12.5V2.5Z" stroke="#15AD70" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No runs yet</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Open a workflow and click ▶ Run</p>
                <Link href="/workflows" className="text-xs font-light px-4 py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(21,173,112,0.08)', border: '1px solid rgba(21,173,112,0.2)', color: '#15AD70' }}>
                  Go to workflows →
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {executions.map(ex => {
                  const dur = duration(ex.createdAt, ex.completedAt);
                  const color = STATUS_COLOR[ex.status] ?? 'rgba(255,255,255,0.3)';
                  return (
                    <Link key={ex.id} href={`/executions/${ex.id}`}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl group transition-all"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      {/* Status dot */}
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ex.status === 'RUNNING' ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: color }} />

                      {/* Input */}
                      <p className="flex-1 text-sm font-light truncate group-hover:text-white transition-colors"
                        style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {ex.input}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {ex.validationScore !== null && (
                          <span className="text-xs" style={{ color: ex.validationScore >= 0.8 ? '#15AD70' : ex.validationScore >= 0.6 ? '#F7C700' : '#FF6B6B' }}>
                            {Math.round(ex.validationScore * 100)}%
                          </span>
                        )}
                        {ex.system.color && (
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: ex.system.color }} />
                        )}
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{ex.system.name}</span>
                        {dur && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>{dur}</span>}
                        <span className="text-xs w-14 text-right" style={{ color: 'rgba(255,255,255,0.18)' }}>{timeAgo(ex.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })}
                <Link href="/executions"
                  className="flex items-center justify-center w-full py-2.5 text-xs font-light rounded-xl transition-all mt-1"
                  style={{ color: 'rgba(255,255,255,0.2)', border: '1px solid var(--border)' }}>
                  View all executions →
                </Link>
              </div>
            )
          )}

          {/* Nova Activity feed */}
          {feedTab === 'activity' && (
            !loaded ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl"
                style={{ border: '1px dashed var(--border)' }}>
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No activity yet</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Open a system and ask Nova something</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activity.map(item => (
                  <div key={item.id} className="px-5 py-4 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.systemColor && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.systemColor }} />
                        )}
                        <Link href={item.systemId ? `/systems/${item.systemId}` : '#'}
                          onClick={e => e.stopPropagation()}
                          className="text-xs font-light transition-colors hover:text-white/60 flex-shrink-0"
                          style={{ color: 'var(--text-tertiary)' }}>
                          {item.systemName}
                        </Link>
                        <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                        <p className="text-xs font-light truncate italic" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          "{item.query}"
                        </p>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                    {item.response && (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                        {item.response.replace(/[#*`]/g, '').slice(0, 200)}
                      </p>
                    )}
                    {item.tokens && (
                      <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.1)' }}>
                        {item.tokens.toLocaleString()} tokens
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
