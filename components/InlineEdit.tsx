'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InlineEdit({
  id,
  type,
  initialName,
  initialDescription,
}: {
  id: string;
  type: 'environments' | 'systems' | 'workflows';
  initialName: string;
  initialDescription?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    await fetch(`/api/${type}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    });
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs font-light transition-colors"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      >
        Edit
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 mt-4 p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
        className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none w-full"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'white' }}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none w-full resize-none"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'white' }}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
        >
          {loading ? 'Saving···' : 'Save'}
        </button>
        <button
          onClick={() => { setEditing(false); setName(initialName); setDescription(initialDescription ?? ''); }}
          className="text-xs font-light"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
