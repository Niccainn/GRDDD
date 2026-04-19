'use client';

/**
 * QuickAddPopover — click a day on the calendar, type a title, enter,
 * task is created with dueDate set to that day at 9:00 local.
 *
 * Design choices:
 *   - Minimal surface: title + priority + environment (prefilled). No
 *     date field — the popover IS anchored to the day that's already
 *     implicit.
 *   - Enter submits, Esc closes (native cancel instinct). Both are
 *     intercepted so the browser's default form behaviour never
 *     navigates away.
 *   - Posts to /api/tasks with dueDate, then calls `onCreated(task)`
 *     so the parent can optimistically add the new event to its local
 *     state without a round-trip.
 *   - Self-focuses the title input on mount so keyboard users don't
 *     have to click it.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { isoDateFor } from '@/lib/calendar/buckets';

type Props = {
  year: number;
  month: number;
  day: number;
  environmentId: string | null;
  onClose: () => void;
  onCreated?: (task: { id: string; title: string; dueDate: string; priority: string }) => void;
};

const PRIORITIES: { value: string; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: '#7193ED' },
  { value: 'NORMAL', label: 'Normal', color: 'rgba(255,255,255,0.35)' },
  { value: 'HIGH', label: 'High', color: '#F7C700' },
  { value: 'URGENT', label: 'Urgent', color: '#FF6B6B' },
];

export default function QuickAddPopover({
  year, month, day, environmentId, onClose, onCreated,
}: Props) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the title field as soon as the popover mounts. Keyboard
    // users who just pressed Enter on a day shouldn't also have to Tab.
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!environmentId) {
      setError('No environment selected');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const dueDate = isoDateFor(year, month, day);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), priority, dueDate, environmentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to create');
        setSubmitting(false);
        return;
      }
      onCreated?.({ id: data.id ?? data.task?.id ?? 'new', title: title.trim(), dueDate, priority });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setSubmitting(false);
    }
  }, [title, priority, year, month, day, environmentId, onCreated, onClose]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [onClose, submit],
  );

  const dateLabel = new Date(year, month, day).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add task for ${dateLabel}`}
      onKeyDown={onKeyDown}
      className="rounded-2xl p-4 w-[300px] shadow-2xl"
      style={{
        background: 'rgba(16,16,22,0.96)',
        backdropFilter: 'blur(40px)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>New task</span>
        <span className="text-[11px] font-light" style={{ color: 'var(--text-2)' }}>{dateLabel}</span>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What needs doing?"
        disabled={submitting}
        aria-label="Task title"
        className="w-full text-sm font-light px-3 py-2.5 rounded-lg outline-none"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-1)',
        }}
      />

      <div className="flex gap-1 mt-3" role="radiogroup" aria-label="Priority">
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

      {error && (
        <p className="text-[11px] font-light mt-2" style={{ color: '#FF6B6B' }}>
          {error}
        </p>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={onClose}
          disabled={submitting}
          className="flex-1 text-xs font-light py-2 rounded-lg"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-3)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting || !title.trim()}
          className="flex-1 text-xs font-light py-2 rounded-lg disabled:opacity-40"
          style={{
            background: 'var(--brand)',
            color: '#000',
          }}
        >
          {submitting ? 'Adding…' : 'Add ↵'}
        </button>
      </div>
    </div>
  );
}
