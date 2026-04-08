'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ChartDay = { date: string; completed: number; failed: number; running: number };
type RecentExec = {
  id: string;
  status: string;
  input: string;
  output: string | null;
  workflowName: string | null;
  currentStage: number | null;
  createdAt: string;
  completedAt: string | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SystemExecutionChart({ systemId }: { systemId: string }) {
  const [chart, setChart] = useState<ChartDay[]>([]);
  const [recent, setRecent] = useState<RecentExec[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<ChartDay | null>(null);

  useEffect(() => {
    fetch(`/api/systems/${systemId}/executions`)
      .then(r => r.json())
      .then(data => {
        setChart(data.chart);
        setRecent(data.recent);
        setTotal(data.total);
        setLoaded(true);
      });
  }, [systemId]);

  const maxVal = Math.max(...chart.map(d => d.completed + d.failed + d.running), 1);

  const successRate = recent.length > 0
    ? Math.round((recent.filter(e => e.status === 'COMPLETED').length / recent.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total runs', value: loaded ? total : '—', color: 'rgba(255,255,255,0.6)' },
          { label: 'Success rate', value: loaded ? (successRate !== null ? `${successRate}%` : '—') : '—', color: successRate !== null && successRate >= 80 ? '#15AD70' : successRate !== null && successRate >= 60 ? '#F7C700' : 'rgba(255,255,255,0.3)' },
          { label: 'Running', value: loaded ? recent.filter(e => e.status === 'RUNNING').length : '—', color: '#F7C700' },
        ].map(s => (
          <div key={s.label} className="px-4 py-3 rounded-xl text-center"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            <p className="text-xl font-extralight" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      {loaded && chart.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>EXECUTIONS / 14 DAYS</p>
            {hoveredDay && (
              <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {new Date(hoveredDay.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                {' · '}{hoveredDay.completed + hoveredDay.failed + hoveredDay.running} run{(hoveredDay.completed + hoveredDay.failed + hoveredDay.running) !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-end gap-1 h-16">
            {chart.map((day, i) => {
              const total = day.completed + day.failed + day.running;
              const height = total === 0 ? 2 : Math.max(4, (total / maxVal) * 56);
              const isHovered = hoveredDay?.date === day.date;

              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end cursor-pointer"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}>
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: `${height}px`,
                      background: total === 0
                        ? 'rgba(255,255,255,0.05)'
                        : day.failed > 0
                          ? `linear-gradient(to top, #FF6B6B ${(day.failed / total) * 100}%, #15AD70 0%)`
                          : '#15AD70',
                      opacity: isHovered ? 1 : 0.7,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
              {new Date(chart[0]?.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>Today</span>
          </div>
        </div>
      )}

      {/* Recent executions */}
      <div>
        <p className="text-xs tracking-[0.12em] mb-3" style={{ color: 'var(--text-3)' }}>
          RECENT RUNS
        </p>
        {!loaded ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--glass)' }} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center py-8 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>No executions yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recent.slice(0, 8).map(exec => (
              <div key={exec.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: exec.status === 'COMPLETED' ? '#15AD70' : exec.status === 'RUNNING' ? '#F7C700' : '#FF6B6B' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {exec.workflowName ?? exec.input}
                  </p>
                  {exec.status === 'RUNNING' && exec.currentStage !== null && (
                    <p className="text-xs" style={{ color: '#F7C700' }}>Stage {exec.currentStage + 1}</p>
                  )}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                  {timeAgo(exec.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
