'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ActivityButton from '@/components/ActivityButton';

type ActionItem = {
  id: string;
  text: string;
  status: string;
  promotedToType: string | null;
  promotedToId: string | null;
  order: number;
};

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: string;
  attendees: string | null;
  videoLink: string | null;
  location: string | null;
  transcript: string | null;
  summary: string | null;
  recordingUrl: string | null;
  environment: { id: string; name: string; slug: string; color: string | null } | null;
  creator: { id: string; name: string } | null;
  actionItems: ActionItem[];
};

const PROMOTE_HREF: Record<string, string> = {
  TASK: '/tasks',
  SIGNAL: '/inbox',
  GOAL: '/goals',
  PROJECT: '/projects',
};

function parseAttendees(raw: string | null): string[] {
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch { return []; }
}

function formatWhen(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  return `${s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    fetch(`/api/meetings/${id}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Not found');
        return r.json();
      })
      .then(setMeeting)
      .catch(e => setError(e.message))
      .finally(() => setLoaded(true));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function runProcess() {
    setProcessing(true);
    const res = await fetch(`/api/meetings/${id}/process`, { method: 'POST' });
    setProcessing(false);
    if (res.ok) setMeeting(await res.json());
  }

  async function promote(aid: string, target: 'TASK' | 'SIGNAL' | 'GOAL') {
    const res = await fetch(`/api/meetings/${id}/action-items/${aid}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) load();
    else if (body.error) alert(body.error);
  }

  async function updateItem(aid: string, patch: Partial<ActionItem>) {
    await fetch(`/api/meetings/${id}/action-items/${aid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    load();
  }

  const attendees = useMemo(() => parseAttendees(meeting?.attendees ?? null), [meeting?.attendees]);

  if (!loaded) {
    return <div className="p-6"><div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} /></div>;
  }
  if (error || !meeting) {
    return <div className="p-6"><p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>{error ?? 'Not found.'} <Link href="/meetings" className="underline">Back</Link></p></div>;
  }

  const hasIntel = Boolean(meeting.transcript || meeting.summary);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/meetings" className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>← Meetings</Link>
        <div className="flex items-center gap-3">
          <ActivityButton entityType="meeting" entityId={meeting.id} entityLabel={meeting.title} />
          <button onClick={async () => {
            if (!confirm('Delete this meeting?')) return;
            const res = await fetch(`/api/meetings/${meeting.id}`, { method: 'DELETE' });
            if (res.ok) router.push('/meetings');
          }} className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>Delete</button>
        </div>
      </div>

      {/* Hero */}
      <div className="glass-deep rounded-2xl p-5 md:p-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {meeting.environment && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meeting.environment.color || 'var(--text-3)' }} />
              <Link href={`/environments/${meeting.environment.slug}`} className="text-[10px] tracking-wider uppercase font-light hover:text-white/70" style={{ color: 'var(--text-3)' }}>
                {meeting.environment.name}
              </Link>
            </span>
          )}
          <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
            {formatWhen(meeting.startTime, meeting.endTime)}
          </span>
          {meeting.status === 'DONE' && <span className="tag tag-status-on-track">Done</span>}
          {meeting.status === 'CANCELLED' && <span className="tag tag-priority-urgent">Cancelled</span>}
        </div>
        <h1 className="text-2xl md:text-3xl font-extralight leading-tight mb-2" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          {meeting.title}
        </h1>
        {meeting.description && (
          <p className="text-sm font-light max-w-2xl mb-3" style={{ color: 'var(--text-2)' }}>{meeting.description}</p>
        )}
        {attendees.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {attendees.map(a => (
              <span key={a} className="text-[10px] font-light px-2 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
                {a}
              </span>
            ))}
          </div>
        )}

        {!hasIntel && (
          <div className="mt-5 pt-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div>
              <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
                No transcript yet. Run intelligence to capture summary + action items.
              </p>
              <p className="text-[10px] font-light mt-1" style={{ color: 'var(--text-3)' }}>
                Alpha: mock transcription generates a realistic sample from the meeting title + attendees.
              </p>
            </div>
            <button
              onClick={runProcess}
              disabled={processing}
              className="text-xs font-light px-3 py-1.5 rounded-full transition-all whitespace-nowrap disabled:opacity-50"
              style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}
            >
              {processing ? 'Processing…' : 'Run intelligence'}
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      {meeting.summary && (
        <div className="glass-deep rounded-2xl p-5 animate-fade-in">
          <h3 className="text-[10px] tracking-[0.14em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
            Summary
          </h3>
          <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-1)' }}>
            {meeting.summary}
          </p>
        </div>
      )}

      {/* Action items — the wedge */}
      {meeting.actionItems.length > 0 && (
        <div className="glass-deep rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] tracking-[0.14em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
              Action items
            </h3>
            <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
              Promote to make Nova execute
            </span>
          </div>
          <ul className="space-y-2">
            {meeting.actionItems.map(a => {
              const isPromoted = a.status === 'PROMOTED';
              const isDone = a.status === 'DONE';
              const isDismissed = a.status === 'DISMISSED';
              return (
                <li key={a.id}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                  <button
                    aria-label={isDone ? 'Mark open' : 'Mark done'}
                    onClick={() => updateItem(a.id, { status: isDone ? 'OPEN' : 'DONE' })}
                    className="mt-1 w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all"
                    style={{
                      borderColor: isDone ? '#C8F26B' : 'var(--glass-border)',
                      background: isDone ? '#C8F26B22' : 'transparent',
                    }}
                  >
                    {isDone && <span className="text-[9px]" style={{ color: '#C8F26B' }}>✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light" style={{
                      color: isDone || isDismissed ? 'var(--text-3)' : 'var(--text-1)',
                      textDecoration: isDone || isDismissed ? 'line-through' : 'none',
                    }}>
                      {a.text}
                    </p>
                    {isPromoted && a.promotedToType && a.promotedToId && (
                      <Link href={a.promotedToType === 'GOAL' ? `/goals/${a.promotedToId}` : PROMOTE_HREF[a.promotedToType]}
                        className="inline-flex items-center gap-1.5 text-[10px] font-light mt-1 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.2)', color: '#C8F26B' }}>
                        Promoted to {a.promotedToType.toLowerCase()} →
                      </Link>
                    )}
                  </div>
                  {!isPromoted && !isDismissed && (
                    <div className="flex items-center gap-1 shrink-0">
                      {(['TASK', 'SIGNAL', 'GOAL'] as const).map(target => (
                        <button key={target}
                          onClick={() => promote(a.id, target)}
                          className="text-[10px] font-light px-2 py-1 rounded-full transition-all hover:bg-white/[0.04]"
                          style={{ border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
                          → {target.toLowerCase()}
                        </button>
                      ))}
                      <button onClick={() => updateItem(a.id, { status: 'DISMISSED' })}
                        className="text-[10px] font-light px-2 py-1 rounded-full transition-colors hover:text-white/70"
                        style={{ color: 'var(--text-3)' }}>
                        ×
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Transcript */}
      {meeting.transcript && (
        <div className="glass-deep rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] tracking-[0.14em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
              Transcript
            </h3>
            <button onClick={runProcess} disabled={processing}
              className="text-[10px] font-light transition-colors hover:text-white/70" style={{ color: 'var(--text-3)' }}>
              {processing ? 'Reprocessing…' : 'Reprocess'}
            </button>
          </div>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
            {meeting.transcript.split('\n\n').map((block, i) => {
              // Each block looks like: **Speaker** — text
              const match = block.match(/^\*\*(.+?)\*\*\s*—\s*([\s\S]+)$/);
              if (!match) {
                return <p key={i} className="text-sm font-light" style={{ color: 'var(--text-2)' }}>{block}</p>;
              }
              const [, speaker, text] = match;
              return (
                <div key={i}>
                  <div className="text-[10px] tracking-wider uppercase font-light mb-0.5" style={{ color: 'var(--text-3)' }}>
                    {speaker}
                  </div>
                  <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
