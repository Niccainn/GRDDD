'use client';

/**
 * ValueMeterWidget — retroactive value proof for the tenant.
 *
 * Fetches the rolling 7-day summary from /api/value-metering and
 * shows it as a compact block: hours saved, executions run, signals
 * triaged, tasks completed. The hours-saved number uses conservative
 * heuristics (see route) so the headline never feels inflated.
 *
 * Zero-cost rationale: this widget is the primary retention /
 * upgrade-conversion lever. Users who see "5 hours saved this week"
 * have a concrete reason to continue. No ads, no LLM, just reads
 * against existing DB rows once per dashboard load.
 */

import { useEffect, useState } from 'react';

type MeterData = {
  windowDays: number;
  executions: number;
  tasksCompleted: number;
  signalsHandled: number;
  signalsTotal: number;
  signalTriagedPct: number | null;
  scaffoldsThisWeek: number;
  minutesSaved: number;
  hoursSaved: number;
  asOf: string;
};

export default function ValueMeterWidget({
  environmentId,
  className,
}: {
  environmentId: string;
  className?: string;
}) {
  const [data, setData] = useState<MeterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/value-metering?environmentId=${encodeURIComponent(environmentId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  if (loading) {
    return (
      <div
        className={`rounded-2xl p-5 ${className ?? ''}`}
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
      >
        <div className="h-20 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
      </div>
    );
  }

  if (!data) return null;

  const hasActivity = data.executions + data.tasksCompleted + data.signalsHandled > 0;

  return (
    <div
      className={`rounded-2xl p-5 ${className ?? ''}`}
      style={{
        background: 'var(--glass)',
        backdropFilter: 'blur(40px)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] tracking-[0.16em] uppercase font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Last 7 days
        </p>
        <p className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
          as of {new Date(data.asOf).toLocaleString()}
        </p>
      </div>

      {!hasActivity ? (
        <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          No activity yet this week. Run a workflow or triage a signal to start seeing savings.
        </p>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-4xl font-extralight" style={{ color: 'var(--brand)' }}>
              {data.hoursSaved}h
            </p>
            <p
              className="text-[11px] tracking-wide mt-1"
              style={{ color: 'var(--text-3)' }}
            >
              saved this week
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Executions" value={data.executions} color="#BF9FF1" />
            <Metric label="Signals triaged" value={data.signalsHandled} color="#7193ED" />
            <Metric label="Tasks completed" value={data.tasksCompleted} color="#C8F26B" />
            <Metric label="Scaffolds" value={data.scaffoldsThisWeek} color="#F7C700" />
          </div>

          {data.signalTriagedPct !== null && data.signalsTotal > 0 && (
            <div className="mt-4">
              <div
                className="h-[2px] rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${data.signalTriagedPct}%`,
                    background: 'var(--brand)',
                    transition: 'width 400ms ease',
                  }}
                />
              </div>
              <p className="text-[10px] font-light mt-2" style={{ color: 'var(--text-3)' }}>
                {data.signalTriagedPct}% of {data.signalsTotal} signals handled
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{ background: `${color}08`, border: `1px solid ${color}20` }}
    >
      <p className="text-lg font-extralight" style={{ color }}>
        {value}
      </p>
      <p
        className="text-[10px] tracking-[0.1em] uppercase mt-0.5"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </p>
    </div>
  );
}
