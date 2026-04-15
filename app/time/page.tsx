'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { formatDuration, parseDuration, minutesToDecimal } from '@/lib/time';

// ── Types ──────────────────────────────────────────────────────────

type TimeEntry = {
  id: string;
  description: string;
  duration: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  billable: boolean;
  hourlyRate: number | null;
  taskId: string | null;
  task: { id: string; title: string } | null;
  environmentId: string;
  environment: { id: string; name: string };
  createdAt: string;
};

type EnvOption = { id: string; name: string };
type TaskOption = { id: string; title: string };

type SummaryData = {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalRevenue: number;
  utilizationRate: number;
  byDay: { date: string; hours: number }[];
  byEnvironment: { envName: string; hours: number }[];
  byTask: { taskTitle: string; hours: number }[];
};

// ── Helpers ────────────────────────────────────────────────────────

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortDay(d: Date): string {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][
    d.getDay() === 0 ? 6 : d.getDay() - 1
  ];
}

function formatDate(d: Date): string {
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
}

function weekLabel(dates: Date[]): string {
  if (dates.length === 0) return '';
  const s = dates[0];
  const e = dates[6];
  return `${formatDate(s)} - ${formatDate(e)}, ${e.getFullYear()}`;
}

const TIMER_KEY = 'grid_timer_state';

type TimerState = {
  running: boolean;
  startedAt: number | null;
  elapsed: number; // seconds accumulated before current run
  description: string;
  taskId: string;
  environmentId: string;
  billable: boolean;
};

function loadTimerState(): TimerState {
  if (typeof window === 'undefined') return { running: false, startedAt: null, elapsed: 0, description: '', taskId: '', environmentId: '', billable: true };
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { running: false, startedAt: null, elapsed: 0, description: '', taskId: '', environmentId: '', billable: true };
}

function saveTimerState(state: TimerState) {
  if (typeof window !== 'undefined') localStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

function clearTimerState() {
  if (typeof window !== 'undefined') localStorage.removeItem(TIMER_KEY);
}

// ── Page ───────────────────────────────────────────────────────────

export default function TimeTrackingPage() {
  const [tab, setTab] = useState<'timesheet' | 'timer' | 'reports'>('timesheet');
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(weekOffset);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [environments, setEnvironments] = useState<EnvOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadEntries = useCallback(() => {
    const from = dateKey(weekDates[0]);
    const to = dateKey(weekDates[6]);
    fetch(`/api/time?dateFrom=${from}&dateTo=${to}`)
      .then(r => r.json())
      .then(d => { setEntries(Array.isArray(d) ? d : []); setLoaded(true); })
      .catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    loadEntries();
    fetch('/api/environments').then(r => r.json()).then(d => setEnvironments(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/tasks').then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d?.tasks ?? [];
      setTasks(list.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })));
    }).catch(() => {});
  }, [loadEntries]);

  const tabs = [
    { key: 'timesheet' as const, label: 'Timesheet' },
    { key: 'timer' as const, label: 'Timer' },
    { key: 'reports' as const, label: 'Reports' },
  ];

  return (
    <div className="min-h-screen p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: 'var(--text-1)' }}>
            Time Tracking
          </h1>
          <p className="text-sm font-light mt-1" style={{ color: 'var(--text-3)' }}>
            Track hours, manage timesheets, analyze utilization
          </p>
        </div>
      </div>

      {/* Tab nav + week nav */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--glass)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-sm font-light rounded-lg transition-all"
              style={{
                background: tab === t.key ? 'var(--glass-deep)' : 'transparent',
                color: tab === t.key ? 'var(--text-1)' : 'var(--text-3)',
                border: tab === t.key ? '1px solid var(--glass-border)' : '1px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'timesheet' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
            >
              &lt;
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-lg text-sm font-light transition-all"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            >
              {weekOffset === 0 ? 'This Week' : weekLabel(weekDates)}
            </button>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
            >
              &gt;
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {tab === 'timesheet' && (
        <TimesheetTab
          entries={entries}
          weekDates={weekDates}
          environments={environments}
          tasks={tasks}
          loaded={loaded}
          onReload={loadEntries}
        />
      )}
      {tab === 'timer' && (
        <TimerTab
          environments={environments}
          tasks={tasks}
          onEntryCreated={loadEntries}
        />
      )}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}

// ── Timesheet Tab ──────────────────────────────────────────────────

type TimesheetRow = {
  key: string;
  taskId: string;
  taskTitle: string;
  environmentId: string;
  envName: string;
  billable: boolean;
  cells: Record<string, { entryId: string | null; minutes: number }>;
};

function TimesheetTab({
  entries, weekDates, environments, tasks, loaded, onReload,
}: {
  entries: TimeEntry[];
  weekDates: Date[];
  environments: EnvOption[];
  tasks: TaskOption[];
  loaded: boolean;
  onReload: () => void;
}) {
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTaskId, setNewTaskId] = useState('');
  const [newEnvId, setNewEnvId] = useState('');

  // Build rows from entries
  useEffect(() => {
    const rowMap: Record<string, TimesheetRow> = {};
    for (const e of entries) {
      const key = e.taskId || `env-${e.environmentId}`;
      if (!rowMap[key]) {
        rowMap[key] = {
          key,
          taskId: e.taskId || '',
          taskTitle: e.task?.title || e.description || 'General',
          environmentId: e.environmentId,
          envName: e.environment?.name || '',
          billable: e.billable,
          cells: {},
        };
      }
      const dk = e.date.slice(0, 10);
      if (!rowMap[key].cells[dk]) {
        rowMap[key].cells[dk] = { entryId: e.id, minutes: 0 };
      }
      rowMap[key].cells[dk].minutes += e.duration;
      if (!rowMap[key].cells[dk].entryId) {
        rowMap[key].cells[dk].entryId = e.id;
      }
    }
    setRows(Object.values(rowMap));
  }, [entries]);

  const saveCell = async (row: TimesheetRow, dk: string, value: string) => {
    const minutes = parseDuration(value);
    const cell = row.cells[dk];

    if (cell?.entryId && minutes > 0) {
      await fetch(`/api/time/${cell.entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: minutes }),
      });
    } else if (cell?.entryId && minutes === 0) {
      await fetch(`/api/time/${cell.entryId}`, { method: 'DELETE' });
    } else if (!cell?.entryId && minutes > 0) {
      await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: minutes,
          date: dk,
          taskId: row.taskId || undefined,
          environmentId: row.environmentId,
          billable: row.billable,
          description: row.taskTitle,
        }),
      });
    }
    onReload();
  };

  const addRow = () => {
    if (!newEnvId) return;
    const env = environments.find(e => e.id === newEnvId);
    const task = tasks.find(t => t.id === newTaskId);
    const key = newTaskId || `new-${Date.now()}`;
    setRows(prev => [...prev, {
      key,
      taskId: newTaskId,
      taskTitle: task?.title || 'General',
      environmentId: newEnvId,
      envName: env?.name || '',
      billable: true,
      cells: {},
    }]);
    setAdding(false);
    setNewTaskId('');
    setNewEnvId('');
  };

  // Compute column totals
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;
  for (const row of rows) {
    for (const dk of weekDates.map(dateKey)) {
      const m = row.cells[dk]?.minutes || 0;
      colTotals[dk] = (colTotals[dk] || 0) + m;
      grandTotal += m;
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Loading timesheet...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-light">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <th className="text-left px-4 py-3 font-light" style={{ color: 'var(--text-3)', minWidth: 200 }}>
                Task / Project
              </th>
              {weekDates.map(d => (
                <th key={dateKey(d)} className="text-center px-2 py-3 font-light" style={{ color: 'var(--text-3)', minWidth: 80 }}>
                  <div>{shortDay(d)}</div>
                  <div className="text-xs opacity-60">{d.getDate()}</div>
                </th>
              ))}
              <th className="text-center px-3 py-3 font-light" style={{ color: 'var(--text-2)', minWidth: 70 }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              let rowTotal = 0;
              return (
                <tr key={row.key} style={{ borderBottom: '1px solid var(--glass-border)' }} className="group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updated = rows.map(r =>
                            r.key === row.key ? { ...r, billable: !r.billable } : r
                          );
                          setRows(updated);
                        }}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: row.billable ? '#15AD70' : 'rgba(255,255,255,0.2)' }}
                        title={row.billable ? 'Billable' : 'Non-billable'}
                      />
                      <div>
                        <span style={{ color: 'var(--text-1)' }}>{row.taskTitle}</span>
                        <span className="ml-2 text-xs" style={{ color: 'var(--text-3)' }}>{row.envName}</span>
                      </div>
                    </div>
                  </td>
                  {weekDates.map(d => {
                    const dk = dateKey(d);
                    const m = row.cells[dk]?.minutes || 0;
                    rowTotal += m;
                    return (
                      <td key={dk} className="text-center px-1 py-2">
                        <CellInput
                          value={m}
                          onSave={(val) => saveCell(row, dk, val)}
                        />
                      </td>
                    );
                  })}
                  <td className="text-center px-3 py-3 font-normal" style={{ color: 'var(--text-1)' }}>
                    {minutesToDecimal(rowTotal)}
                  </td>
                </tr>
              );
            })}

            {/* Daily totals row */}
            <tr style={{ borderTop: '2px solid var(--glass-border)' }}>
              <td className="px-4 py-3 font-normal" style={{ color: 'var(--text-2)' }}>
                Daily Total
              </td>
              {weekDates.map(d => {
                const dk = dateKey(d);
                return (
                  <td key={dk} className="text-center px-2 py-3 font-normal" style={{ color: 'var(--text-2)' }}>
                    {minutesToDecimal(colTotals[dk] || 0)}
                  </td>
                );
              })}
              <td className="text-center px-3 py-3 font-normal text-base" style={{ color: 'var(--text-1)' }}>
                {minutesToDecimal(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="text-sm font-light px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
            style={{ color: 'var(--text-3)', background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}
          >
            + Add row
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <select
              value={newEnvId}
              onChange={e => setNewEnvId(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-light"
              style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            >
              <option value="">Select environment</option>
              {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select
              value={newTaskId}
              onChange={e => setNewTaskId(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-light"
              style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            >
              <option value="">General (no task)</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button
              onClick={addRow}
              className="px-3 py-1.5 rounded-lg text-sm font-light transition-all"
              style={{ background: '#15AD70', color: '#fff' }}
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewTaskId(''); setNewEnvId(''); }}
              className="px-3 py-1.5 rounded-lg text-sm font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cell Input ─────────────────────────────────────────────────────

function CellInput({ value, onSave }: { value: number; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const display = value > 0 ? minutesToDecimal(value) : '';

  const startEdit = () => {
    setText(display);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const commit = () => {
    setEditing(false);
    if (text !== display) {
      onSave(text);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-16 text-center text-sm px-1 py-1 rounded-md outline-none"
        style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="w-16 h-8 text-sm rounded-md transition-all hover:border-opacity-100"
      style={{
        color: value > 0 ? 'var(--text-1)' : 'var(--text-3)',
        background: value > 0 ? 'var(--glass-deep)' : 'transparent',
        border: '1px solid transparent',
      }}
    >
      {display || '-'}
    </button>
  );
}

// ── Timer Tab ──────────────────────────────────────────────────────

function TimerTab({
  environments, tasks, onEntryCreated,
}: {
  environments: EnvOption[];
  tasks: TaskOption[];
  onEntryCreated: () => void;
}) {
  const [timer, setTimer] = useState<TimerState>(loadTimerState);
  const [display, setDisplay] = useState('00:00:00');
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const updateDisplay = useCallback(() => {
    const state = loadTimerState();
    let totalSec = state.elapsed;
    if (state.running && state.startedAt) {
      totalSec += Math.floor((Date.now() - state.startedAt) / 1000);
    }
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    setDisplay(`${h}:${m}:${s}`);
  }, []);

  useEffect(() => {
    updateDisplay();
    intervalRef.current = setInterval(updateDisplay, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [updateDisplay]);

  const start = () => {
    const state: TimerState = {
      ...timer,
      running: true,
      startedAt: Date.now(),
    };
    setTimer(state);
    saveTimerState(state);
  };

  const stop = async () => {
    let totalSec = timer.elapsed;
    if (timer.startedAt) {
      totalSec += Math.floor((Date.now() - timer.startedAt) / 1000);
    }
    const minutes = Math.ceil(totalSec / 60);

    const state: TimerState = {
      ...timer,
      running: false,
      startedAt: null,
      elapsed: totalSec,
    };
    setTimer(state);
    saveTimerState(state);

    // Create time entry if there's tracked time and an environment
    if (minutes > 0 && timer.environmentId) {
      await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: timer.description,
          duration: minutes,
          date: new Date().toISOString().slice(0, 10),
          billable: timer.billable,
          taskId: timer.taskId || undefined,
          environmentId: timer.environmentId,
          startTime: timer.startedAt ? new Date(timer.startedAt).toISOString() : undefined,
          endTime: new Date().toISOString(),
        }),
      });
      onEntryCreated();
      reset();
    }
  };

  const reset = () => {
    const state: TimerState = {
      running: false,
      startedAt: null,
      elapsed: 0,
      description: timer.description,
      taskId: timer.taskId,
      environmentId: timer.environmentId,
      billable: timer.billable,
    };
    setTimer(state);
    clearTimerState();
    setDisplay('00:00:00');
  };

  const updateField = (field: keyof TimerState, value: string | boolean) => {
    const state = { ...timer, [field]: value };
    setTimer(state);
    saveTimerState(state);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
        {/* Timer display */}
        <div
          className="text-6xl font-light tracking-wider mb-8"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: 'var(--text-1)' }}
        >
          {display}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {!timer.running ? (
            <button
              onClick={start}
              className="px-6 py-2.5 rounded-xl text-sm font-light transition-all hover:scale-105"
              style={{ background: '#15AD70', color: '#fff' }}
            >
              Start
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-6 py-2.5 rounded-xl text-sm font-light transition-all hover:scale-105"
              style={{ background: '#FF6B6B', color: '#fff' }}
            >
              Stop
            </button>
          )}
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl text-sm font-light transition-all hover:scale-105"
            style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
          >
            Reset
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-light mb-1" style={{ color: 'var(--text-3)' }}>Description</label>
            <input
              type="text"
              value={timer.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="What are you working on?"
              className="w-full px-3 py-2 rounded-xl text-sm font-light outline-none"
              style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-light mb-1" style={{ color: 'var(--text-3)' }}>Environment</label>
              <select
                value={timer.environmentId}
                onChange={e => updateField('environmentId', e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm font-light outline-none"
                style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
              >
                <option value="">Select environment</option>
                {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-light mb-1" style={{ color: 'var(--text-3)' }}>Task</label>
              <select
                value={timer.taskId}
                onChange={e => updateField('taskId', e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm font-light outline-none"
                style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
              >
                <option value="">No task</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={timer.billable}
              onChange={e => updateField('billable', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-light" style={{ color: 'var(--text-2)' }}>Billable</span>
          </label>
        </div>
      </div>

      {!timer.environmentId && timer.running && (
        <p className="text-center text-xs mt-3 font-light" style={{ color: '#F7C700' }}>
          Select an environment to save the time entry when you stop
        </p>
      )}
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────

function ReportsTab() {
  const [period, setPeriod] = useState('week');
  const [summary, setSummary] = useState<SummaryData | null>(null);

  useEffect(() => {
    fetch(`/api/time/summary?period=${period}`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => {});
  }, [period]);

  const periods = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
  ];

  if (!summary) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Loading reports...</p>
      </div>
    );
  }

  const maxDayHours = Math.max(...summary.byDay.map(d => d.hours), 1);
  const maxEnvHours = Math.max(...(summary.byEnvironment.length ? summary.byEnvironment.map(e => e.hours) : [1]));

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="px-4 py-2 text-sm font-light rounded-xl transition-all"
            style={{
              background: period === p.key ? 'var(--glass-deep)' : 'var(--glass)',
              color: period === p.key ? 'var(--text-1)' : 'var(--text-3)',
              border: `1px solid ${period === p.key ? 'var(--glass-border)' : 'transparent'}`,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Hours" value={summary.totalHours.toFixed(1)} suffix="h" />
        <StatCard label="Billable Hours" value={summary.billableHours.toFixed(1)} suffix="h" color="#15AD70" />
        <StatCard label="Non-billable" value={summary.nonBillableHours.toFixed(1)} suffix="h" color="var(--text-3)" />
        <StatCard label="Revenue" value={`$${summary.totalRevenue.toFixed(0)}`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours by day */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-sm font-light mb-4" style={{ color: 'var(--text-2)' }}>Hours by Day</h3>
          <div className="flex items-end gap-2 h-40">
            {summary.byDay.length === 0 ? (
              <p className="text-sm font-light w-full text-center" style={{ color: 'var(--text-3)' }}>
                No data
              </p>
            ) : (
              summary.byDay.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: 120 }}>
                    <div
                      className="w-full max-w-[32px] rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(2, (d.hours / maxDayHours) * 120)}px`,
                        background: 'linear-gradient(180deg, #15AD70, rgba(21,173,112,0.3))',
                      }}
                    />
                  </div>
                  <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                    {d.date.slice(8)}
                  </span>
                  <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
                    {d.hours}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hours by environment */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-sm font-light mb-4" style={{ color: 'var(--text-2)' }}>Hours by Project</h3>
          <div className="space-y-3">
            {summary.byEnvironment.length === 0 ? (
              <p className="text-sm font-light text-center" style={{ color: 'var(--text-3)' }}>
                No data
              </p>
            ) : (
              summary.byEnvironment.map(e => (
                <div key={e.envName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-light" style={{ color: 'var(--text-1)' }}>{e.envName}</span>
                    <span className="font-light" style={{ color: 'var(--text-2)' }}>{e.hours}h</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(e.hours / maxEnvHours) * 100}%`,
                        background: 'linear-gradient(90deg, #7193ED, rgba(113,147,237,0.4))',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Utilization + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization ring */}
        <div className="rounded-2xl p-6 flex flex-col items-center justify-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-sm font-light mb-6" style={{ color: 'var(--text-2)' }}>Utilization Rate</h3>
          <UtilizationRing rate={summary.utilizationRate} />
          <p className="text-sm font-light mt-4" style={{ color: 'var(--text-3)' }}>
            {summary.billableHours.toFixed(1)}h billable / {summary.totalHours.toFixed(1)}h total
          </p>
        </div>

        {/* Hours by task */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-sm font-light mb-4" style={{ color: 'var(--text-2)' }}>Hours by Task</h3>
          <div className="space-y-3">
            {summary.byTask.length === 0 ? (
              <p className="text-sm font-light text-center" style={{ color: 'var(--text-3)' }}>
                No task data
              </p>
            ) : (
              summary.byTask.slice(0, 8).map(t => {
                const maxTaskH = Math.max(...summary.byTask.map(x => x.hours), 1);
                return (
                  <div key={t.taskTitle}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-light truncate mr-2" style={{ color: 'var(--text-1)' }}>{t.taskTitle}</span>
                      <span className="font-light flex-shrink-0" style={{ color: 'var(--text-2)' }}>{t.hours}h</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(t.hours / maxTaskH) * 100}%`,
                          background: 'linear-gradient(90deg, #15AD70, rgba(21,173,112,0.4))',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared Components ──────────────────────────────────────────────

function StatCard({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
      <p className="text-xs font-light mb-2" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="text-3xl font-light" style={{ color: color || 'var(--text-1)' }}>
        {value}
        {suffix && <span className="text-lg ml-0.5" style={{ color: 'var(--text-3)' }}>{suffix}</span>}
      </p>
    </div>
  );
}

function UtilizationRing({ rate }: { rate: number }) {
  const r = 60;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? '#15AD70' : rate >= 50 ? '#F7C700' : '#FF6B6B';

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-light" style={{ color: 'var(--text-1)' }}>{rate.toFixed(0)}%</span>
      </div>
    </div>
  );
}
