'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type MeetingEnv = { id: string; name: string; slug: string; color: string | null };
type MeetingActionItemLite = { id: string; status: string };
type Meeting = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: string;
  videoLink: string | null;
  attendees: string | null;
  transcript: string | null;
  summary: string | null;
  environment: MeetingEnv | null;
  actionItems: MeetingActionItemLite[];
};

type Environment = { id: string; name: string; slug: string; color: string | null };

function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameDay = s.toDateString() === e.toDateString();
  const dateStr = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const sTime = s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const eTime = e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `${dateStr} · ${sTime} – ${eTime}` : `${dateStr} → ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function parseAttendees(raw: string | null): string[] {
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    fetch('/api/meetings')
      .then(r => r.json())
      .then(d => setMeetings(Array.isArray(d.meetings) ? d.meetings : []))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    fetch('/api/environments')
      .then(r => r.json())
      .then(d => setEnvironments(Array.isArray(d.environments) ? d.environments : d ?? []))
      .catch(() => {});
  }, [load]);

  const now = Date.now();
  const upcoming = meetings.filter(m => new Date(m.endTime).getTime() >= now && m.status !== 'CANCELLED');
  const past = meetings.filter(m => new Date(m.endTime).getTime() < now || m.status === 'DONE');
  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            Meetings
          </h1>
          <p className="text-sm font-light mt-1" style={{ color: 'var(--text-3)' }}>
            Every meeting becomes a transcript, a summary, and action items Nova can execute.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
          style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}
        >
          Schedule meeting
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1" role="tablist">
        {(['upcoming', 'past'] as const).map(t => {
          const active = t === tab;
          const count = t === 'upcoming' ? upcoming.length : past.length;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className="text-[11px] font-light px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: `1px solid ${active ? 'var(--glass-border)' : 'transparent'}`,
                color: active ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              {t === 'upcoming' ? 'Upcoming' : 'Past'} · <span className="tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {!loaded && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      )}

      {loaded && visible.length === 0 && (
        <div className="glass-deep rounded-xl p-8 text-center">
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            No {tab} meetings. Schedule one to let Nova capture, summarize, and turn talk into work.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {visible.map(m => {
          const attendees = parseAttendees(m.attendees);
          const openItems = m.actionItems.filter(a => a.status === 'OPEN').length;
          const promoted = m.actionItems.filter(a => a.status === 'PROMOTED').length;
          return (
            <Link
              key={m.id}
              href={`/meetings/${m.id}`}
              className="glass-deep rounded-xl p-4 block transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {m.environment && (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.environment.color || 'var(--text-3)' }} />
                        <span className="text-[10px] tracking-wider uppercase font-light" style={{ color: 'var(--text-3)' }}>
                          {m.environment.name}
                        </span>
                      </span>
                    )}
                    <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                      {formatRange(m.startTime, m.endTime)}
                    </span>
                  </div>
                  <h2 className="text-base font-light leading-snug" style={{ color: 'var(--text-1)' }}>
                    {m.title}
                  </h2>
                  {m.summary && (
                    <p className="text-xs font-light mt-1 line-clamp-2" style={{ color: 'var(--text-2)' }}>
                      {m.summary}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                  {attendees.length > 0 && <span>{attendees.length} attendee{attendees.length === 1 ? '' : 's'}</span>}
                  {m.transcript && <span className="px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(191,159,241,0.1)', border: '1px solid rgba(191,159,241,0.25)', color: 'var(--nova, #BF9FF1)' }}>Transcribed</span>}
                  {openItems > 0 && <span className="px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,215,110,0.1)', border: '1px solid rgba(245,215,110,0.25)', color: '#8a6d00' }}>{openItems} open</span>}
                  {promoted > 0 && <span className="px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>{promoted} promoted</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {showCreate && (
        <CreateMeetingModal
          environments={environments}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateMeetingModal({ environments, onClose, onCreated }: {
  environments: Environment[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [environmentId, setEnvironmentId] = useState(environments[0]?.id ?? '');
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(30);
  const [attendees, setAttendees] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!title.trim()) { setError('Title required'); return; }
    if (!environmentId) { setError('Pick an environment'); return; }
    setSubmitting(true);
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60_000);
    const emails = attendees.split(',').map(s => s.trim()).filter(Boolean);
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendees: emails,
        environmentId,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to create');
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="glass-deep rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-extralight mb-4" style={{ letterSpacing: '-0.02em' }}>
          Schedule meeting
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
          </div>
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Environment</label>
            <select value={environmentId} onChange={e => setEnvironmentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}>
              {environments.length === 0 && <option value="">No environments available</option>}
              {environments.map(env => (
                <option key={env.id} value={env.id} style={{ background: '#0a0a0f' }}>{env.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Starts</label>
              <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
            </div>
            <div>
              <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Duration (min)</label>
              <input type="number" min={5} step={5} value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
            </div>
          </div>
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Attendees (comma-separated emails)</label>
            <input type="text" value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="alice@acme.com, bob@acme.com"
              className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
          </div>
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Agenda (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
          </div>
          {error && <p className="text-xs" style={{ color: '#FF8C69' }}>{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-xs font-light px-3 py-1.5 rounded-full transition-colors"
            style={{ color: 'var(--text-3)' }}>Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="text-xs font-light px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
