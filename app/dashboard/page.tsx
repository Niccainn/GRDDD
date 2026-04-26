'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import GlobalNovaBar from '@/components/GlobalNovaBar';
import WelcomeBanner from '@/components/WelcomeBanner';
import SampleDataBanner from '@/components/SampleDataBanner';
import OnlineIndicator from '@/components/OnlineIndicator';
import { useAuth } from '@/components/AuthProvider';
import ReviewNudgeBanner from '@/components/ReviewNudgeBanner';

// Lazy-load below-fold widgets to reduce LCP
const CrossDomainInsights = dynamic(() => import('@/components/CrossDomainInsights'), { ssr: false });
const ActivitySummary = dynamic(() => import('@/components/ActivitySummary'), { ssr: false });
const LiveScaffoldWidget = dynamic(() => import('@/components/widgets/LiveScaffoldWidget'), { ssr: false });
const ValueMeterWidget = dynamic(() => import('@/components/widgets/ValueMeterWidget'), { ssr: false });
const OnboardingChecklist = dynamic(() => import('@/components/OnboardingChecklist'), { ssr: false });

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
  COMPLETED: '#C8F26B',
  RUNNING: '#7193ED',
  FAILED: '#FF6B6B',
  CANCELLED: 'rgba(255,255,255,0.25)',
};

// Mini sparkline — pure CSS/SVG, no library needed
function Sparkline({ data, color, height = 24 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={height} className="opacity-40" style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(points.split(' ').pop()!.split(',')[0])} cy={parseFloat(points.split(' ').pop()!.split(',')[1])} r="2" fill={color} />
    </svg>
  );
}


export default function OperatePage() {
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [executions, setExecutions] = useState<ExecutionItem[]>([]);
  const [wfStats, setWfStats] = useState<WfStats | null>(null);
  const [avgHealth, setAvgHealth] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedTab, setFeedTab] = useState<'activity' | 'runs'>('runs');
  const [novaInitialQuery, setNovaInitialQuery] = useState<string | undefined>();
  const [primaryEnvId, setPrimaryEnvId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  // Server-truth onboarding flag. Identity.onboardedAt is the
  // authoritative source — prior code trusted a client-only
  // localStorage key that the /welcome wizard never set, so every
  // onboarded user saw the "complete your setup" nudge forever.
  // Progress state moved to the OnboardingChecklist component, which
  // derives step completion from real account state (name, env, key,
  // system, integration) rather than a separate flag. Kept here only
  // to preserve the existing setDisplayName / operate-data flow.

  // Greeting name — pulled directly from the auth provider so a Display
  // Name change in /settings/profile reflects on the dashboard without
  // a full reload. useAuth() already subscribes to the live /api/auth/me
  // identity; the operate-data response is cached longer and could drift.
  const { user: authUser, refresh: refreshAuth } = useAuth();
  const greetingName = (() => {
    const raw = (authUser?.name ?? displayName ?? '').trim();
    if (!raw) return null;
    // Use the first word only — reads as a personal greeting
    // ("Good morning, Nicole") rather than ("Good morning, Nicole
    // Cain") or an unwieldy company name. User can still see full
    // name in Settings / Profile.
    return raw.split(/\s+/)[0];
  })();

  // Click-to-edit on the greeting name. If Identity.name is wrong
  // (user typed their team/company name during signup), clicking the
  // name opens an inline editor right where they see it. Saves via
  // PATCH /api/settings/profile then refreshAuth() so the whole app
  // picks up the change without a hard reload.
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const startEditName = useCallback(() => {
    setNameDraft(authUser?.name ?? '');
    setEditingName(true);
  }, [authUser?.name]);
  const saveName = useCallback(async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      refreshAuth();
    } catch { /* ignore — user can retry */ }
    setSavingName(false);
    setEditingName(false);
  }, [nameDraft, refreshAuth]);

  const handleWelcomePrompt = useCallback((query: string) => {
    setNovaInitialQuery(query);
  }, []);

  useEffect(() => {
    // Be defensive: auth failures (401) and DB failures (500) both
    // return empty or non-JSON bodies. A blind `.json()` here throws
    // a SyntaxError that blanks the whole page. Guard on `r.ok` and
    // wrap the parse in try/catch so one bad response doesn't kill
    // the render.
    fetch('/api/operate-data')
      .then(async r => {
        if (!r.ok) throw new Error(`operate-data ${r.status}`);
        const text = await r.text();
        try { return JSON.parse(text); } catch { throw new Error('operate-data: non-JSON body'); }
      })
      .then(d => {
        setSystems(d.systems ?? []);
        setActivity(d.activity ?? []);
        setExecutions(d.executions ?? []);
        setWfStats(d.workflows ?? null);
        setAvgHealth(d.avgHealth ?? null);
        setDisplayName(d.user?.displayName ?? d.user?.firstName ?? null);
        if ((d.activity ?? []).length > 0) setFeedTab('activity');
      })
      .catch(() => {
        // Leave state at defaults; the render path handles loaded-but-empty.
      })
      .finally(() => setLoaded(true));

    // Fetch the user's primary env so the scaffold widget has a target.
    fetch('/api/environments')
      .then(async r => {
        if (!r.ok) return null;
        const text = await r.text();
        try { return JSON.parse(text); } catch { return null; }
      })
      .then(body => {
        // Accept both shapes: legacy `[{id}]` and current `{environments: [...]}`.
        const envs = Array.isArray(body) ? body : Array.isArray(body?.environments) ? body.environments : [];
        if (envs.length > 0) setPrimaryEnvId(envs[0].id);
      })
      .catch(() => {});
  }, []);

  function healthColor(score: number | null) {
    if (score === null) return 'rgba(255,255,255,0.2)';
    if (score >= 80) return '#C8F26B';
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
  const stalledCount = wfStats?.stalled?.length ?? 0;
  const failedRuns = executions.filter(e => e.status === 'FAILED').length;

  // Build a human-readable status line
  function getStatusLine() {
    if (!loaded) return 'Loading···';
    const parts: string[] = [];
    if (driftSystems.length > 0) parts.push(`${driftSystems.length} system${driftSystems.length > 1 ? 's' : ''} need${driftSystems.length === 1 ? 's' : ''} attention`);
    if (stalledCount > 0) parts.push(`${stalledCount} stalled workflow${stalledCount > 1 ? 's' : ''}`);
    if (failedRuns > 0) parts.push(`${failedRuns} failed run${failedRuns > 1 ? 's' : ''}`);
    if (parts.length === 0) return 'Everything is running smoothly.';
    return parts.join(' · ');
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      {/* /dashboard is the cross-environment home — greeting,
          Nova prompt, get-started wedge, recent activity, and
          summary widgets. Used to auto-redirect to the user's
          first environment via DashboardEnvironmentRedirect, which
          buried this page entirely. Removed: env detail is one
          sidebar click away. */}
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="stat-number tracking-tight mb-1 flex items-center gap-2 flex-wrap">
            <span>{getGreeting()}</span>
            {editingName ? (
              <span className="inline-flex items-center gap-2">
                <span>,</span>
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  placeholder="your name"
                  className="bg-transparent outline-none border-b px-1 min-w-[6ch]"
                  style={{
                    borderColor: 'var(--brand)',
                    color: 'var(--brand)',
                    fontSize: 'inherit',
                    fontWeight: 'inherit',
                    letterSpacing: 'inherit',
                    fontFamily: 'inherit',
                  }}
                  disabled={savingName}
                />
              </span>
            ) : greetingName ? (
              <button
                onClick={startEditName}
                title="Click to edit the name Nova uses for you"
                className="transition-opacity hover:opacity-80 cursor-pointer"
                style={{ font: 'inherit', letterSpacing: 'inherit', color: 'inherit', background: 'transparent', border: 'none', padding: 0 }}
              >
                , {greetingName}
              </button>
            ) : (
              <button
                onClick={startEditName}
                className="text-sm font-light px-3 py-1 rounded-full ml-2 align-middle"
                style={{
                  background: 'var(--brand-soft)',
                  border: '1px solid var(--brand-border)',
                  color: 'var(--brand)',
                }}
              >
                + add your name
              </button>
            )}
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {getStatusLine()}
          </p>
        </div>
        {loaded && (
          <div className="flex items-center gap-2">
            <OnlineIndicator />
            {driftSystems.length > 0 ? (
              <Link href="/systems" className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-full transition-all"
                style={{ background: 'rgba(247,199,0,0.08)', border: '1px solid rgba(247,199,0,0.2)', color: '#F7C700' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#F7C700' }} />
                {driftSystems.length} drift alert{driftSystems.length !== 1 ? 's' : ''}
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.2)', color: '#C8F26B' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C8F26B' }} />
                All systems stable
              </span>
            )}
          </div>
        )}
      </div>

      {/* Welcome banner — shown once after onboarding */}
      <WelcomeBanner onPromptClick={handleWelcomePrompt} />
      <SampleDataBanner />

      {/* Onboarding checklist — Notion/ClickUp/Monday pattern. Floats
          bottom-right, dismissible, minimisable to a pill, resumable.
          Replaces the prior inline blocking nudge and the forced
          /welcome redirect in middleware. The user can use the app
          freely; setup progress shows as an overlay until complete.
          Hides itself automatically when all steps are done. */}
      <OnboardingChecklist />

      {/* Global Nova bar */}
      <div data-tour="nova-bar">
        <GlobalNovaBar initialQuery={novaInitialQuery} />
      </div>

      {/* Review nudge — shown when unreviewed executions exist */}
      <ReviewNudgeBanner />

      {/* Stat bar — only show when there's actual data to display */}
      {loaded && (systems.length > 0 || executions.length > 0) && (
        <div data-tour="stat-bar" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Link href="/systems" className="glass-deep px-5 py-4 group transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs transition-colors group-hover:text-white/50" style={{ color: 'var(--text-3)' }}>Overall Health</p>
              <Sparkline data={avgHealth !== null ? [avgHealth - 12, avgHealth - 8, avgHealth - 5, avgHealth - 9, avgHealth - 3, avgHealth - 1, avgHealth] : []} color={healthColor(avgHealth)} />
            </div>
            <p className="stat-number" style={{ color: healthColor(avgHealth) }}>
              {avgHealth !== null ? `${avgHealth}%` : '—'}
            </p>
          </Link>
          <Link href="/workflows" className="glass-deep px-5 py-4 group transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs transition-colors group-hover:text-white/50" style={{ color: 'var(--text-3)' }}>Automations Running</p>
            </div>
            <p className="stat-number" style={{ color: '#C8F26B' }}>{wfStats?.active ?? 0}</p>
          </Link>
          <Link href="/executions" className="glass-deep px-5 py-4 group transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs transition-colors group-hover:text-white/50" style={{ color: 'var(--text-3)' }}>Tasks Completed</p>
              <Sparkline data={(() => { const b = Array.from({ length: 7 }, () => 0); const now = Date.now(); executions.forEach(ex => { const d = 6 - Math.min(Math.floor((now - new Date(ex.createdAt).getTime()) / 86400000), 6); b[d]++; }); return b; })()} color="rgba(255,255,255,0.5)" />
            </div>
            <p className="stat-number" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {executions.length > 0 ? executions.length : '0'}
            </p>
          </Link>
          <Link href="/workflows" className="glass-deep px-5 py-4 group transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs transition-colors group-hover:text-white/50" style={{ color: 'var(--text-3)' }}>Needs Attention</p>
            </div>
            <p className="stat-number" style={{ color: (wfStats?.paused ?? 0) > 0 ? '#F7C700' : 'rgba(255,255,255,0.2)' }}>
              {wfStats?.paused ?? 0}
            </p>
          </Link>
        </div>
      )}

      {/* Getting Started — shown when workspace is empty */}
      {loaded && systems.length === 0 && executions.length === 0 && (
        <div className="mb-8 glass-deep p-6">
          <p className="text-xs tracking-[0.12em] font-light mb-4" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
            GET STARTED
          </p>
          <div className="space-y-2">
            <Link href="/systems"
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group"
              style={{ background: 'rgba(200,242,107,0.04)', border: '1px solid rgba(200,242,107,0.12)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(200,242,107,0.1)', border: '1px solid rgba(200,242,107,0.2)' }}>
                <span className="stat-number text-sm" style={{ color: 'var(--brand)' }}>1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>Create a system</p>
                <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                  Map a business function — Marketing, Operations, Content
                </p>
              </div>
              <span className="text-xs font-light opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--brand)' }}>
                Start →
              </span>
            </Link>

            <Link href="/integrations"
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group"
              style={{ background: 'rgba(113,147,237,0.04)', border: '1px solid rgba(113,147,237,0.12)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(113,147,237,0.1)', border: '1px solid rgba(113,147,237,0.2)' }}>
                <span className="stat-number text-sm" style={{ color: 'var(--info)' }}>2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>Connect an integration</p>
                <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                  Link Slack, Notion, Google, or 100+ other tools
                </p>
              </div>
              <span className="text-xs font-light opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--info)' }}>
                Browse →
              </span>
            </Link>

            <Link href="/workflows"
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group"
              style={{ background: 'rgba(191,159,241,0.04)', border: '1px solid rgba(191,159,241,0.12)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(191,159,241,0.1)', border: '1px solid rgba(191,159,241,0.2)' }}>
                <span className="stat-number text-sm" style={{ color: 'var(--nova)' }}>3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>Run your first workflow</p>
                <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                  Build a multi-stage AI pipeline and see Nova in action
                </p>
              </div>
              <span className="text-xs font-light opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--nova)' }}>
                Build →
              </span>
            </Link>
          </div>

          {/* Or — one-prompt scaffold. Only shown when an env exists. */}
          {primaryEnvId && (
            <>
              <div className="flex items-center gap-3 mt-6 mb-4">
                <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
                <span className="text-[10px] tracking-[0.16em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
                  Or skip ahead
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
              </div>
              <LiveScaffoldWidget
                environmentId={primaryEnvId}
                onCommitted={() => {
                  // Soft refresh — easiest way to pick up new rows.
                  if (typeof window !== 'undefined') window.location.reload();
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Value meter — show concrete proof of what GRID did this week */}
      {loaded && primaryEnvId && systems.length > 0 && (
        <ValueMeterWidget environmentId={primaryEnvId} className="mb-8" />
      )}

      {/* Cross-Domain Intelligence */}
      {loaded && <CrossDomainInsights className="mb-8" />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Systems panel */}
        <div data-tour="systems-panel" className="col-span-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>SYSTEMS</p>
            <Link href="/systems" className="text-xs font-light transition-colors"
              style={{ color: 'var(--text-3)' }}>
              Manage →
            </Link>
          </div>
          <div className="space-y-2">
            {!loaded ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--glass)' }} />
              ))
            ) : systems.length === 0 ? (
              <div className="flex flex-col items-center py-10 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>No systems yet</p>
                <Link href="/systems" className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Create one →</Link>
              </div>
            ) : (
              systems.map(s => (
                <Link key={s.id} href={`/systems/${s.id}`}
                  className="glass flex items-center gap-2 px-3 py-2.5 group transition-all">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color ?? 'rgba(255,255,255,0.3)' }} />
                  <span className="flex-1 text-xs font-light truncate group-hover:text-white transition-colors"
                    style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {s.name}
                  </span>
                  {s.healthScore !== null && (
                    <span className="text-[10px] font-light tabular-nums flex-shrink-0"
                      style={{ color: healthColor(s.healthScore) }}>
                      {Math.round(s.healthScore)}%
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Stalled */}
          {loaded && wfStats && wfStats.stalled.length > 0 && (
            <div className="mt-6">
              <p className="text-xs tracking-[0.12em] mb-3" style={{ color: 'var(--text-3)' }}>STALLED</p>
              <div className="space-y-1.5">
                {wfStats.stalled.map(w => (
                  <Link key={w.id} href={`/workflows/${w.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg group transition-all"
                    style={{ background: 'rgba(247,199,0,0.04)', border: '1px solid rgba(247,199,0,0.15)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F7C700' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-light truncate group-hover:text-white transition-colors"
                        style={{ color: 'rgba(255,255,255,0.7)' }}>{w.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{w.systemName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          {loaded && (
            <div className="mt-6 space-y-1.5">
              <p className="text-xs tracking-[0.12em] mb-3" style={{ color: 'var(--text-3)' }}>JUMP TO</p>
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

          {/* Activity summary */}
          <div className="mt-6">
            <ActivitySummary />
          </div>
        </div>

        {/* Activity / Runs feed */}
        <div className="col-span-1 md:col-span-2">
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
                {tab === 'runs' ? `Recent Work${executions.length > 0 ? ` (${executions.length})` : ''}` : `AI Activity${activity.length > 0 ? ` (${activity.length})` : ''}`}
              </button>
            ))}
            <Link href={feedTab === 'runs' ? '/executions' : '/nova'}
              className="ml-auto text-xs font-light transition-colors"
              style={{ color: 'var(--text-3)' }}>
              View all →
            </Link>
          </div>

          {/* Runs feed */}
          {feedTab === 'runs' && (
            !loaded ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
                ))}
              </div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl"
                style={{ border: '1px dashed var(--glass-border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.15)' }}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                    <path d="M3 2.5L12 7.5L3 12.5V2.5Z" stroke="#C8F26B" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No runs yet</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Open a workflow and click ▶ Run</p>
                <Link href="/workflows" className="text-xs font-light px-4 py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.2)', color: '#C8F26B' }}>
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
                      className="glass flex items-center gap-4 px-4 py-3 group transition-all">
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
                          <span className="text-xs" style={{ color: ex.validationScore >= 0.8 ? '#C8F26B' : ex.validationScore >= 0.6 ? '#F7C700' : '#FF6B6B' }}>
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
                  style={{ color: 'rgba(255,255,255,0.2)', border: '1px solid var(--glass-border)' }}>
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
                  <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl"
                style={{ border: '1px dashed var(--glass-border)' }}>
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
                  Activity shows up here once you run something
                </p>
                <p className="text-xs mb-4 text-center max-w-sm" style={{ color: 'var(--text-3)' }}>
                  Every Nova action, every workflow run, every override writes to this feed so the team can see what the system actually does.
                </p>
                <Link
                  href="/systems"
                  className="text-xs font-light px-4 py-2 rounded-lg"
                  style={{
                    background: 'rgba(191,159,241,0.08)',
                    border: '1px solid rgba(191,159,241,0.2)',
                    color: '#BF9FF1',
                  }}
                >
                  Open a system →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {activity.map(item => (
                  <div key={item.id} className="glass px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.systemColor && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.systemColor }} />
                        )}
                        <Link href={item.systemId ? `/systems/${item.systemId}` : '#'}
                          onClick={e => e.stopPropagation()}
                          className="text-xs font-light transition-colors hover:text-white/60 flex-shrink-0"
                          style={{ color: 'var(--text-3)' }}>
                          {item.systemName}
                        </Link>
                        <span style={{ color: 'var(--text-3)' }}>·</span>
                        <p className="text-xs font-light truncate italic" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          "{item.query}"
                        </p>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                    {item.response && (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-3)' }}>
                        {item.response.replace(/[#*`]/g, '').slice(0, 200)}
                      </p>
                    )}
                    {/* Token count hidden — not meaningful to humans */}
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
