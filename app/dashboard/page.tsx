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

type WfStats = {
  total: number;
  active: number;
  draft: number;
  paused: number;
  stalled: { id: string; name: string; systemName: string }[];
};

export default function OperatePage() {
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [wfStats, setWfStats] = useState<WfStats | null>(null);
  const [avgHealth, setAvgHealth] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/operate-data')
      .then(r => r.json())
      .then(d => {
        setSystems(d.systems);
        setActivity(d.activity);
        setWfStats(d.workflows);
        setAvgHealth(d.avgHealth);
        setLoaded(true);
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
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const driftSystems = systems.filter(s => s.healthScore !== null && s.healthScore < 70);

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Operate</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {loaded ? `${systems.length} systems · ${wfStats?.active ?? 0} active workflows` : 'Loading···'}
          </p>
        </div>
        {loaded && (
          <div className="flex items-center gap-2">
            {driftSystems.length > 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(247,199,0,0.08)', border: '1px solid rgba(247,199,0,0.2)', color: '#F7C700' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#F7C700' }} />
                {driftSystems.length} drift alert{driftSystems.length !== 1 ? 's' : ''}
              </span>
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

      {/* Global Nova command bar */}
      <GlobalNovaBar />

      {/* Stat bar */}
      {loaded && (
        <div className="grid grid-cols-4 gap-3 mb-10">
          {[
            { label: 'Avg Health', value: avgHealth !== null ? `${avgHealth}%` : '—', color: healthColor(avgHealth) },
            { label: 'Active Workflows', value: wfStats?.active ?? 0, color: '#15AD70' },
            { label: 'Systems', value: systems.length, color: 'rgba(255,255,255,0.6)' },
            { label: 'Stalled', value: wfStats?.paused ?? 0, color: wfStats?.paused ? '#F7C700' : 'rgba(255,255,255,0.2)' },
          ].map(stat => (
            <div key={stat.label} className="px-5 py-4 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
              <p className="text-2xl font-extralight" style={{ color: stat.color }}>{stat.value}</p>
            </div>
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
              Array.from({ length: 4 }).map((_, i) => (
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

          {/* Stalled workflows alert */}
          {loaded && wfStats && wfStats.stalled.length > 0 && (
            <div className="mt-6">
              <p className="text-xs tracking-[0.12em] mb-3" style={{ color: 'var(--text-tertiary)' }}>STALLED</p>
              <div className="space-y-2">
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
        </div>

        {/* Activity feed */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>NOVA ACTIVITY</p>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{activity.length} interactions</span>
          </div>

          {!loaded ? (
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
                <div key={item.id}
                  className="px-5 py-4 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.systemColor && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.systemColor }} />
                      )}
                      <Link href={item.systemId ? `/systems/${item.systemId}` : '#'}
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
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.12)' }}>
                      {item.tokens.toLocaleString()} tokens
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
