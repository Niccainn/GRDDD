'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteButton({
  id,
  type,
  redirectTo,
}: {
  id: string;
  type: 'environments' | 'systems' | 'workflows';
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`grid:${type}-changed`));
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Delete?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,60,60,0.12)', color: '#FF7070', border: '1px solid rgba(255,60,60,0.2)' }}
        >
          {loading ? '···' : 'Yes'}
        </button>
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(false); }}
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}
      // Visible at low opacity by default so users discover it without
      // hovering. Prior behaviour (opacity-0 until hover) was invisible
      // on touch devices and hidden from anyone unfamiliar with the
      // hover-reveal pattern — multiple users reported "there's no
      // delete button."
      className="text-xs font-light transition-colors opacity-50 hover:opacity-100"
      style={{ color: 'rgba(255,120,120,0.7)' }}
      aria-label="Delete"
    >
      Delete
    </button>
  );
}
