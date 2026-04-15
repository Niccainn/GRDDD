'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatFileSize, isImageType, getFileIcon, getFileCategory } from '@/lib/files';

type AttachmentItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
  identity: { id: string; name: string };
};

type AttachmentListProps = {
  entityType: string;
  entityId: string;
  editable?: boolean;
  refreshKey?: number;
};

const CATEGORY_COLOR: Record<string, string> = {
  image: '#7193ED',
  document: '#BF9FF1',
  spreadsheet: '#15AD70',
  archive: '#F7C700',
  other: 'rgba(255,255,255,0.3)',
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AttachmentList({ entityType, entityId, editable, refreshKey }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/attachments?entityType=${entityType}&entityId=${entityId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAttachments(data); setLoaded(true); });
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    await fetch(`/api/attachments?id=${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    load();
  }

  if (!loaded) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map(i => (
          <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--glass)' }} />
        ))}
      </div>
    );
  }

  if (attachments.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {attachments.map(att => {
        const category = getFileCategory(att.mimeType);
        const color = CATEGORY_COLOR[category];
        const isImage = isImageType(att.mimeType);

        return (
          <a
            key={att.id}
            href={att.path}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-xl p-3 flex items-center gap-3 transition-all duration-150 hover:scale-[1.01]"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {/* Thumbnail or icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                background: `${color}12`,
                border: `1px solid ${color}25`,
                color,
              }}
            >
              {isImage ? (
                <img
                  src={att.path}
                  alt={att.filename}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: getFileIcon(att.mimeType) }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-light truncate"
                style={{ color: 'var(--text-1)' }}
                title={att.filename}
              >
                {att.filename}
              </p>
              <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                {formatFileSize(att.size)} · {timeAgo(att.createdAt)}
              </p>
            </div>

            {/* Delete button */}
            {editable && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(att.id); }}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: confirmDelete === att.id ? 'rgba(255,87,87,0.2)' : 'rgba(255,255,255,0.08)',
                  color: confirmDelete === att.id ? '#FF5757' : 'var(--text-3)',
                }}
                title={confirmDelete === att.id ? 'Click again to confirm' : 'Delete'}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            )}
          </a>
        );
      })}
    </div>
  );
}
