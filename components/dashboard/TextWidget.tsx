'use client';

import { renderMarkdown } from '@/lib/markdown';
import type { Widget } from '@/lib/dashboards';

type Props = { widget: Widget };

export default function TextWidget({ widget }: Props) {
  const content = widget.config.content ?? '';
  const html = renderMarkdown(content);

  return (
    <div className="h-full flex flex-col px-5 py-4 overflow-auto">
      <p className="text-xs font-light mb-3" style={{ color: 'var(--text-3)' }}>{widget.title}</p>
      {content ? (
        <div
          className="text-xs font-light leading-relaxed prose-sm"
          style={{ color: 'var(--text-2)' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-xs font-light flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
          No content -- configure in edit mode
        </p>
      )}
    </div>
  );
}
