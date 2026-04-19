'use client';

import { useEffect, useState } from 'react';
import { useEnvironmentWorkspace } from '@/lib/contexts/environment-workspace';
import Link from 'next/link';

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  assignee: { name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  BACKLOG: 'rgba(255,255,255,0.2)', TODO: '#7193ED', IN_PROGRESS: '#BF9FF1',
  REVIEW: '#F7C700', DONE: '#C8F26B', CANCELLED: 'rgba(255,255,255,0.15)',
};

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: '#FF5757', HIGH: '#F7C700', NORMAL: 'rgba(255,255,255,0.3)', LOW: 'rgba(255,255,255,0.15)',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function EnvironmentCalendarPage() {
  const { environmentId } = useEnvironmentWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  useEffect(() => {
    fetch(`/api/tasks?environmentId=${environmentId}`)
      .then(r => r.json())
      .then(d => {
        const withDue = (d.tasks || []).filter((t: Task) => t.dueDate);
        setTasks(withDue);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [environmentId]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  // Group tasks by date
  const tasksByDate = new Map<string, Task[]>();
  tasks.forEach(t => {
    if (!t.dueDate) return;
    const key = new Date(t.dueDate).toISOString().split('T')[0];
    if (!tasksByDate.has(key)) tasksByDate.set(key, []);
    tasksByDate.get(key)!.push(t);
  });

  // Build calendar grid (6 weeks max)
  const cells: { day: number; inMonth: boolean; date: Date }[] = [];
  // Previous month trailing days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  }
  // Next month leading days
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl md:text-2xl font-extralight tracking-tight">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.06]"
              style={{ color: 'var(--text-3)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={goToday} className="text-xs font-light px-2.5 py-1 rounded-lg transition-all hover:bg-white/[0.06]"
              style={{ color: 'var(--text-3)' }}>
              Today
            </button>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.06]"
              style={{ color: 'var(--text-3)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
        <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          {loaded ? `${tasks.length} task${tasks.length !== 1 ? 's' : ''} with due dates` : 'Loading...'}
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
          {DAYS.map(d => (
            <div key={d} className="px-2 py-2.5 text-center">
              <span className="text-[10px] tracking-[0.1em] font-light" style={{ color: 'var(--text-3)' }}>{d.toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dateKey = cell.date.toISOString().split('T')[0];
            const dayTasks = tasksByDate.get(dateKey) || [];
            const isToday = isSameDay(cell.date, today);

            return (
              <div key={i}
                className="min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 transition-all"
                style={{
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--glass-border)' : 'none',
                  borderBottom: i < 35 ? '1px solid var(--glass-border)' : 'none',
                  background: isToday ? 'rgba(200,242,107,0.03)' : cell.inMonth ? 'transparent' : 'rgba(0,0,0,0.15)',
                }}>
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-light w-6 h-6 flex items-center justify-center rounded-full ${isToday ? '' : ''}`}
                    style={{
                      color: isToday ? 'white' : cell.inMonth ? 'var(--text-2)' : 'var(--text-3)',
                      background: isToday ? 'var(--brand)' : 'transparent',
                      opacity: cell.inMonth ? 1 : 0.4,
                    }}>
                    {cell.day}
                  </span>
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] px-1 rounded" style={{ color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)' }}>
                      +{dayTasks.length - 2}
                    </span>
                  )}
                </div>

                {/* Task pills (max 2 visible) */}
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 2).map(task => (
                    <Link key={task.id} href={`/tasks/${task.id}`}
                      className="block px-1.5 py-0.5 rounded text-[10px] font-light truncate transition-all hover:opacity-80"
                      style={{
                        background: `${STATUS_COLOR[task.status]}15`,
                        color: STATUS_COLOR[task.status],
                        borderLeft: `2px solid ${PRIORITY_COLOR[task.priority]}`,
                      }}>
                      {task.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
