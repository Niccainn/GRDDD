'use client';

import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

export default function EmbedWidget({ widget }: Props) {
  const url = widget.config.url ?? '';

  return (
    <div className="h-full flex flex-col px-2 py-2 overflow-hidden">
      {url ? (
        <iframe
          src={url}
          className="flex-1 w-full rounded-xl border-0"
          style={{ background: 'rgba(0,0,0,0.2)' }}
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            No URL configured -- set one in edit mode
          </p>
        </div>
      )}
    </div>
  );
}
