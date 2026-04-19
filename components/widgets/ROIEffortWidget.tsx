'use client';

import { useEffect, useState } from 'react';
import Widget from './Widget';

type SystemROI = {
  id: string;
  name: string;
  color: string | null;
  effort: number;   // 0-100 normalized
  returnVal: number; // 0-100 normalized
  executions: number;
  healthScore: number | null;
  workflows: number;
  goalProgress: number;
};

type ROIEffortWidgetProps = {
  environmentId: string;
};

function quadrantColor(effort: number, returnVal: number): string {
  if (returnVal >= 50 && effort < 50) return '#15AD70';   // High return, low effort
  if (returnVal >= 50 && effort >= 50) return '#5B9AFF';  // High return, high effort
  if (returnVal < 50 && effort < 50) return 'rgba(255,255,255,0.25)'; // Low/Low
  return '#F7C700'; // Low return, high effort
}

function quadrantLabel(effort: number, returnVal: number): string {
  if (returnVal >= 50 && effort < 50) return 'Sweet spot';
  if (returnVal >= 50 && effort >= 50) return 'Powerhouse';
  if (returnVal < 50 && effort < 50) return 'Dormant';
  return 'Review';
}

export default function ROIEffortWidget({ environmentId }: ROIEffortWidgetProps) {
  const [systems, setSystems] = useState<SystemROI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch environment dashboard data to derive ROI metrics
    // We use the existing systems data from the dashboard API
    fetch(`/api/environments/${environmentId}/dashboard`)
      .then(r => r.json())
      .then(data => {
        if (!data?.systems) { setLoading(false); return; }

        const sysList = data.systems as {
          id: string;
          name: string;
          color: string | null;
          healthScore: number | null;
          workflows: number;
          activeWorkflows: number;
          executions: number;
        }[];

        const goals = (data.goals || []) as {
          systemName: string;
          progress: number | null;
        }[];

        // Compute per-system metrics
        const maxExec = Math.max(1, ...sysList.map(s => s.executions));
        const maxWorkflows = Math.max(1, ...sysList.map(s => s.workflows));

        const computed: SystemROI[] = sysList.map(sys => {
          // Effort: based on executions and workflows (activity level)
          const effortRaw = (sys.executions / maxExec) * 60 + (sys.workflows / maxWorkflows) * 40;

          // Return: based on health score and goal progress
          const sysGoals = goals.filter(g => g.systemName === sys.name);
          const avgGoalProgress = sysGoals.length > 0
            ? sysGoals.reduce((sum, g) => sum + (g.progress ?? 0), 0) / sysGoals.length
            : 50;
          const health = sys.healthScore ?? 50;
          const returnRaw = health * 0.5 + avgGoalProgress * 0.5;

          return {
            id: sys.id,
            name: sys.name,
            color: sys.color,
            effort: Math.min(100, Math.round(effortRaw)),
            returnVal: Math.min(100, Math.round(returnRaw)),
            executions: sys.executions,
            healthScore: sys.healthScore,
            workflows: sys.workflows,
            goalProgress: Math.round(avgGoalProgress),
          };
        });

        setSystems(computed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  // Sort by ROI score (return / max(effort, 1))
  const ranked = [...systems].sort((a, b) => {
    const roiA = a.returnVal / Math.max(a.effort, 1);
    const roiB = b.returnVal / Math.max(b.effort, 1);
    return roiB - roiA;
  });

  return (
    <Widget title="RETURN / EFFORT">
      {loading ? (
        <div className="h-48 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : systems.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            Add systems to see ROI analysis.
          </p>
        </div>
      ) : (
        <div>
          {/* Scatter plot */}
          <div
            className="relative rounded-xl mb-4"
            style={{
              height: '200px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {/* Quadrant labels */}
            <span className="absolute text-[8px] font-light" style={{ top: '8px', left: '8px', color: 'var(--text-3)' }}>
              High Return / Low Effort
            </span>
            <span className="absolute text-[8px] font-light" style={{ top: '8px', right: '8px', color: 'var(--text-3)' }}>
              High Return / High Effort
            </span>
            <span className="absolute text-[8px] font-light" style={{ bottom: '8px', left: '8px', color: 'var(--text-3)' }}>
              Low / Low
            </span>
            <span className="absolute text-[8px] font-light" style={{ bottom: '8px', right: '8px', color: 'var(--text-3)' }}>
              Low Return / High Effort
            </span>

            {/* Axis lines */}
            <div className="absolute" style={{
              top: '50%', left: '10%', right: '10%',
              height: '1px', background: 'rgba(255,255,255,0.06)',
            }} />
            <div className="absolute" style={{
              left: '50%', top: '10%', bottom: '10%',
              width: '1px', background: 'rgba(255,255,255,0.06)',
            }} />

            {/* Axis labels */}
            <span className="absolute text-[8px]" style={{
              bottom: '2px', left: '50%', transform: 'translateX(-50%)',
              color: 'var(--text-3)',
            }}>
              Effort &rarr;
            </span>
            <span className="absolute text-[8px]" style={{
              left: '2px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
              color: 'var(--text-3)',
              transformOrigin: 'left center',
            }}>
              Return &uarr;
            </span>

            {/* System dots */}
            {systems.map(sys => {
              const x = 10 + (sys.effort / 100) * 80; // 10-90% horizontal
              const y = 10 + ((100 - sys.returnVal) / 100) * 80; // 10-90% vertical (inverted)
              const dotColor = sys.color || quadrantColor(sys.effort, sys.returnVal);

              return (
                <div
                  key={sys.id}
                  className="absolute flex flex-col items-center group"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Dot */}
                  <div
                    className="rounded-full transition-transform group-hover:scale-150"
                    style={{
                      width: '10px',
                      height: '10px',
                      background: dotColor,
                      boxShadow: `0 0 8px ${dotColor}40`,
                    }}
                  />
                  {/* Label */}
                  <span
                    className="text-[8px] font-light mt-1 whitespace-nowrap"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {sys.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Ranked list */}
          <div className="space-y-1.5">
            {ranked.map((sys, i) => {
              const roi = sys.returnVal / Math.max(sys.effort, 1);
              const dotColor = sys.color || quadrantColor(sys.effort, sys.returnVal);

              return (
                <div
                  key={sys.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <span className="text-[10px] font-light w-4" style={{ color: 'var(--text-3)' }}>
                    {i + 1}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: dotColor }}
                  />
                  <span className="text-xs font-light flex-1" style={{ color: 'var(--text-1)' }}>
                    {sys.name}
                  </span>
                  <span
                    className="text-[10px] font-light px-1.5 py-0.5 rounded"
                    style={{
                      color: quadrantColor(sys.effort, sys.returnVal),
                      background: `${quadrantColor(sys.effort, sys.returnVal)}10`,
                    }}
                  >
                    {quadrantLabel(sys.effort, sys.returnVal)}
                  </span>
                  <span className="text-xs tabular-nums font-light" style={{ color: 'var(--text-2)' }}>
                    {roi.toFixed(1)}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Widget>
  );
}
