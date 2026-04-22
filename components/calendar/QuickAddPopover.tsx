'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { isoDateFor } from '@/lib/calendar/buckets';

type CreatedItem =
  | { kind: 'task'; id: string; title: string; dueDate: string; priority: string }
  | { kind: 'meeting'; id: string; title: string; startTime: string; endTime: string; location?: string; videoLink?: string };

type Props = {
  year: number;
  month: number;
  day: number;
  environmentId: string | null;
  onClose: () => void;
  onCreated?: (item: CreatedItem) => void;
};

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#7193ED' },
  { value: 'NORMAL', label: 'Normal', color: 'rgba(255,255,255,0.35)' },
  { value: 'HIGH', label: 'High', color: '#F7C700' },
  { value: 'URGENT', label: 'Urgent', color: '#FF6B6B' },
];

function pad(n: number) { return String(n).padStart(2, '0'); }

function defaultTimes(year: number, month: number, day: number) {
  const start = new Date(year, month, day, 9, 0);
  const end = new Date(year, month, day, 10, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { startVal: fmt(start), endVal: fmt(end) };
}

export default function QuickAddPopover({ year, month, day, environmentId, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<'task' | 'meeting'>('task');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('NORMAL');

  const { startVal, endVal } = defaultTimes(year, month, day);
  const [startTime, setStartTime] = useState(startVal);
  const [endTime, setEndTime] = useState(endVal);
  const [location, setLocation] = useState('');
  const [videoLink, setVideoLink] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = useCallback(async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!environmentId) { setError('No environment selected'); return; }
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'task') {
        const dueDate = isoDateFor(year, month, day);
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), priority, dueDate, environmentId }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data?.error ?? 'Failed to create'); setSubmitting(false); return; }
        onCreated?.({ kind: 'task', id: data.id ?? data.task?.id ?? 'new', title: title.trim(), dueDate, priority });
      } else {
        if (!startTime || !endTime) { setError('Start and end time required'); setSubmitting(false); return; }
        const res = await fetch('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            location: location.trim() || undefined,
            videoLink: videoLink.trim() || undefined,
            environmentId,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data?.error ?? 'Failed to create'); setSubmitting(false); return; }
        onCreated?.({
          kind: 'meeting',
          id: data.meeting?.id ?? 'new',
          title: title.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          location: location.trim() || undefined,
          videoLink: videoLink.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setSubmitting(false);
    }
  }, [title, priority, mode, startTime, endTime, location, videoLink, year, month, day, environmentId, onCreated, onClose]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      submit();
    }
  }, [onClose, submit]);

  const dateLabel = new Date(year, month, day).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-1)',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Schedule for ${dateLabel}`}
      onKeyDown={onKeyDown}
      className="rounded-2xl p-4 w-[320px] shadow-2xl"
      style={{
        background: 'rgba(16,16,22,0.96)',
        backdropFilter: 'blur(40px)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
      }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        {/* Mode switcher */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--glass-border)' }}
        >
          {(['task', 'meeting'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className="text-[10px] font-light px-3 py-1.5 capitalize transition-colors"
              style={{
                background: mode === m ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: mode === m
                  ? m === 'meeting' ? '#E879F9' : '#7193ED'
                  : 'var(--text-3)',
              }}
            >
              {m === 'meeting' ? '◎ Meeting' : '# Task'}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-light" style={{ color: 'var(--text-2)' }}>{dateLabel}</span>
      </div>

      {/* Title */}
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={mode === 'meeting' ? 'Meeting title' : 'What needs doing?'}
        disabled={submitting}
        aria-label={mode === 'meeting' ? 'Meeting title' : 'Task title'}
        className="w-full text-sm font-light px-3 py-2.5 rounded-lg outline-none mb-3"
        style={inputStyle}
      />

      {mode === 'task' ? (
        <div className="flex gap-1 mb-3" role="radiogroup" aria-label="Priority">
          {PRIORITIES.map(p => {
            const active = priority === p.value;
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPriority(p.value)}
                className="flex-1 text-[10px] font-light py-1.5 rounded-md transition-all"
                style={{
                  background: active ? `${p.color}1a` : 'transparent',
                  border: `1px solid ${active ? p.color : 'rgba(255,255,255,0.06)'}`,
                  color: active ? p.color : 'var(--text-3)',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Start</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                disabled={submitting}
                className="w-full text-xs font-light px-2.5 py-2 rounded-lg outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>End</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                disabled={submitting}
                className="w-full text-xs font-light px-2.5 py-2 rounded-lg outline-none"
                style={inputStyle}
              />
            </div>
          </div>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location (optional)"
            disabled={submitting}
            className="w-full text-xs font-light px-2.5 py-2 rounded-lg outline-none"
            style={inputStyle}
          />
          <input
            type="url"
            value={videoLink}
            onChange={e => setVideoLink(e.target.value)}
            placeholder="Video link (optional)"
            disabled={submitting}
            className="w-full text-xs font-light px-2.5 py-2 rounded-lg outline-none"
            style={inputStyle}
          />
        </div>
      )}

      {error && (
        <p className="text-[11px] font-light mb-2" style={{ color: '#FF6B6B' }}>{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onClose}
          disabled={submitting}
          className="flex-1 text-xs font-light py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-3)' }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting || !title.trim()}
          className="flex-1 text-xs font-light py-2 rounded-lg disabled:opacity-40"
          style={{
            background: mode === 'meeting' ? 'rgba(232,121,249,0.15)' : 'var(--brand)',
            border: mode === 'meeting' ? '1px solid rgba(232,121,249,0.3)' : 'none',
            color: mode === 'meeting' ? '#E879F9' : '#000',
          }}
        >
          {submitting ? 'Saving…' : mode === 'meeting' ? 'Schedule ↵' : 'Add ↵'}
        </button>
      </div>
    </div>
  );
}
