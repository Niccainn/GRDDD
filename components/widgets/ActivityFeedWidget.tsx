'use client';

import Widget from './Widget';

type NovaLog = {
  id: string;
  input: string;
  output: string;
  tokens: number | null;
  createdAt: string;
  systemName: string | null;
  systemColor: string | null;
};

type Signal = {
  id: string;
  title: string;
  source: string;
  priority: string;
  status: string;
  createdAt: string;
  systemName: string | null;
};

type ActivityFeedWidgetProps = {
  novaLogs: NovaLog[];
  signals: Signal[];
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'URGENT': return 'var(--danger)';
    case 'HIGH': return 'var(--warning)';
    default: return 'var(--text-3)';
  }
}

export default function ActivityFeedWidget({ novaLogs, signals }: ActivityFeedWidgetProps) {
  type FeedItem =
    | { type: 'nova'; data: NovaLog }
    | { type: 'signal'; data: Signal };

  const items: FeedItem[] = [
    ...novaLogs.map((log) => ({ type: 'nova' as const, data: log })),
    ...signals.map((sig) => ({ type: 'signal' as const, data: sig })),
  ]
    .sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())
    .slice(0, 8);

  return (
    <Widget title="ACTIVITY">
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>No recent activity</p>
        )}
        {items.map((item) => {
          if (item.type === 'nova') {
            const log = item.data;
            return (
              <div key={`nova-${log.id}`} className="flex items-start gap-2.5">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: 'var(--brand)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {log.systemName && (
                      <span
                        className="text-[10px] font-light"
                        style={{ color: log.systemColor || 'var(--text-3)' }}
                      >
                        {log.systemName}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
                      {timeAgo(log.createdAt)}
                    </span>
                  </div>
                  <p
                    className="text-xs font-light truncate mt-0.5"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {log.input}
                  </p>
                </div>
              </div>
            );
          } else {
            const sig = item.data;
            return (
              <div key={`sig-${sig.id}`} className="flex items-start gap-2.5">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: priorityColor(sig.priority) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {sig.systemName && (
                      <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                        {sig.systemName}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
                      {sig.source}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
                      {timeAgo(sig.createdAt)}
                    </span>
                  </div>
                  <p
                    className="text-xs font-light truncate mt-0.5"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {sig.title}
                  </p>
                </div>
              </div>
            );
          }
        })}
      </div>
    </Widget>
  );
}
