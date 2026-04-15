'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDuration, parseDuration } from '@/lib/time';

type TimeEntry = {
  id: string;
  description: string;
  duration: number;
  date: string;
  billable: boolean;
};

export default function TaskTimeLog({ taskId, environmentId }: { taskId: string; environmentId: string }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(() => {
    fetch(`/api/time?taskId=${taskId}`)
      .then(r => r.json())
      .then(d => setEntries(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);

  const submit = async () => {
    const mins = parseDuration(duration);
    if (mins <= 0) return;

    await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duration: mins,
        description,
        date,
        taskId,
        environmentId,
        billable: true,
      }),
    });
    setDuration('');
    setDescription('');
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/time/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Time logged</span>
          <span className="text-sm font-light ml-2" style={{ color: 'var(--text-1)' }}>
            {formatDuration(totalMinutes)}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-light px-3 py-1 rounded-lg transition-all"
          style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
        >
          {showForm ? 'Cancel' : 'Log time'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-3 p-3 rounded-lg" style={{ background: 'var(--glass-deep)' }}>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="e.g. 1h 30m"
              className="px-2 py-1.5 rounded-lg text-xs font-light outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-xs font-light outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
          </div>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-2 py-1.5 rounded-lg text-xs font-light outline-none"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
          />
          <button
            onClick={submit}
            className="px-3 py-1.5 rounded-lg text-xs font-light transition-all"
            style={{ background: '#15AD70', color: '#fff' }}
          >
            Save
          </button>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.slice(0, 5).map(e => (
            <div
              key={e.id}
              className="flex items-center justify-between text-xs font-light px-2 py-1.5 rounded-lg group"
              style={{ background: 'var(--glass-deep)' }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-1)' }}>{formatDuration(e.duration)}</span>
                {e.description && (
                  <span style={{ color: 'var(--text-3)' }}>{e.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-3)' }}>{e.date?.slice(0, 10)}</span>
                <button
                  onClick={() => remove(e.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  style={{ color: '#FF6B6B' }}
                >
                  x
                </button>
              </div>
            </div>
          ))}
          {entries.length > 5 && (
            <p className="text-xs font-light text-center" style={{ color: 'var(--text-3)' }}>
              +{entries.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
