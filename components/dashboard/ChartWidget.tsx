'use client';

import { useEffect, useState } from 'react';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ChartWidget({ widget }: Props) {
  const [data, setData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const chartType = widget.config.chartType ?? 'bar';
  const color = widget.config.color ?? '#7193ED';

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        setData(d.executionsByDay ?? [0, 0, 0, 0, 0, 0, 0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const max = Math.max(...data, 1);

  // Generate day labels ending at today
  const today = new Date().getDay();
  const labels = Array.from({ length: 7 }, (_, i) => {
    const idx = (today - 6 + i + 7) % 7;
    return DAY_LABELS[idx === 0 ? 6 : idx - 1];
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-24 w-full mx-5 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    );
  }

  if (chartType === 'line') {
    const w = 100;
    const h = 60;
    const points = data.map((v, i) => {
      const px = (i / (data.length - 1)) * w;
      const py = h - (v / max) * (h - 10) - 5;
      return `${px},${py}`;
    });
    const areaPoints = `0,${h} ${points.join(' ')} ${w},${h}`;

    return (
      <div className="h-full flex flex-col px-5 py-4">
        <p className="text-xs font-light mb-3" style={{ color: 'var(--text-3)' }}>{widget.title}</p>
        <div className="flex-1 flex items-end">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <polygon points={areaPoints} fill={`${color}15`} />
            <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            {data.map((v, i) => {
              const px = (i / (data.length - 1)) * w;
              const py = h - (v / max) * (h - 10) - 5;
              return <circle key={i} cx={px} cy={py} r="2" fill={color} />;
            })}
          </svg>
        </div>
        <div className="flex justify-between mt-2">
          {labels.map((l, i) => (
            <span key={i} className="text-[9px] font-light" style={{ color: 'var(--text-3)' }}>{l}</span>
          ))}
        </div>
      </div>
    );
  }

  // Bar chart (default)
  return (
    <div className="h-full flex flex-col px-5 py-4">
      <p className="text-xs font-light mb-3" style={{ color: 'var(--text-3)' }}>{widget.title}</p>
      <div className="flex-1 flex items-end gap-1.5">
        {data.map((v, i) => {
          const pct = max > 0 ? (v / max) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative flex items-end" style={{ height: '100%' }}>
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{
                    height: `${Math.max(pct, 4)}%`,
                    background: `linear-gradient(to top, ${color}, ${color}88)`,
                    boxShadow: `0 0 12px ${color}30`,
                  }}
                />
              </div>
              <span className="text-[9px] font-light" style={{ color: 'var(--text-3)' }}>{labels[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
