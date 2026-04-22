'use client';

/**
 * RenameButton — inline rename affordance for Environments / Systems /
 * Workflows. Uses the same confirm-in-place pattern as DeleteButton so
 * the list row doesn't need to route to a separate edit screen.
 *
 * Fires a matching `grid:{type}-changed` event on success so any
 * listening surface (sidebar, environment switcher, cross-links)
 * refreshes without a full page reload.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RenameButton({
  id,
  type,
  currentName,
}: {
  id: string;
  type: 'environments' | 'systems' | 'workflows';
  currentName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = value.trim();
    if (!next || next === currentName) {
      setEditing(false);
      return;
    }
    setLoading(true);
    try {
      await fetch(`/api/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`grid:${type}-changed`));
      }
      router.refresh();
    } finally {
      setLoading(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1.5"
      >
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
              setValue(currentName);
            }
          }}
          className="text-xs font-light px-2 py-1 rounded focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'white',
            width: 140,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: 'rgba(200,242,107,0.12)',
            color: '#C8F26B',
            border: '1px solid rgba(200,242,107,0.2)',
          }}
        >
          {loading ? '···' : 'Save'}
        </button>
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setEditing(false); setValue(currentName); }}
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
      className="text-xs font-light transition-colors opacity-50 hover:opacity-100"
      style={{ color: 'rgba(200,200,255,0.7)' }}
      aria-label="Rename"
    >
      Rename
    </button>
  );
}
