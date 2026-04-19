'use client';

import { useEffect, useState, useCallback } from 'react';

const TIMER_KEY = 'grid_timer_state';

type TimerState = {
  running: boolean;
  startedAt: number | null;
  elapsed: number;
  description: string;
  taskId: string;
  environmentId: string;
  billable: boolean;
};

function loadTimerState(): TimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export default function FloatingTimer() {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [display, setDisplay] = useState('');

  const tick = useCallback(() => {
    const state = loadTimerState();
    if (!state?.running) {
      setTimer(null);
      setDisplay('');
      return;
    }
    setTimer(state);
    let totalSec = state.elapsed;
    if (state.startedAt) {
      totalSec += Math.floor((Date.now() - state.startedAt) / 1000);
    }
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    setDisplay(`${h}:${m}:${s}`);
  }, []);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const stop = async () => {
    const state = loadTimerState();
    if (!state) return;

    let totalSec = state.elapsed;
    if (state.startedAt) {
      totalSec += Math.floor((Date.now() - state.startedAt) / 1000);
    }
    const minutes = Math.ceil(totalSec / 60);

    if (minutes > 0 && state.environmentId) {
      await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: state.description,
          duration: minutes,
          date: new Date().toISOString().slice(0, 10),
          billable: state.billable,
          taskId: state.taskId || undefined,
          environmentId: state.environmentId,
          startTime: state.startedAt ? new Date(state.startedAt).toISOString() : undefined,
          endTime: new Date().toISOString(),
        }),
      });
    }

    localStorage.removeItem(TIMER_KEY);
    setTimer(null);
    setDisplay('');
  };

  if (!timer || !timer.running) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg backdrop-blur-xl transition-all"
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C8F26B' }} />
      <span
        className="text-sm font-light tabular-nums"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: 'var(--text-1)' }}
      >
        {display}
      </span>
      {timer.description && (
        <span className="text-xs font-light max-w-[120px] truncate" style={{ color: 'var(--text-3)' }}>
          {timer.description}
        </span>
      )}
      <button
        onClick={stop}
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all hover:scale-110"
        style={{ background: '#FF6B6B', color: '#fff' }}
        title="Stop timer"
      >
        &#9632;
      </button>
    </div>
  );
}
