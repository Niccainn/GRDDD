'use client';

/**
 * DeleteEnvironmentModal — confirmation gate for sending an env
 * to trash.
 *
 * Why this exists:
 *   The previous DeleteButton showed an inline "Delete?" confirm
 *   that didn't surface what was actually about to disappear. Users
 *   reported deleting envs and being surprised that workflows,
 *   integrations, member access, etc. went too. The Notion / Monday
 *   pattern is a richer modal that fetches an impact summary and
 *   makes the user explicitly type or click through.
 *
 * Design:
 *   - Fetches /api/environments/[id]/impact on open to show real
 *     counts instead of marketing copy.
 *   - Highlights the cross-cutting concerns (members losing access,
 *     integrations disconnecting) at the top because those affect
 *     other people / external systems, not just owned data.
 *   - Confirmation is "type the env name" — same as GitHub's repo-
 *     delete pattern. Prevents accidental click-through.
 *   - On confirm, soft-deletes (sends to trash). The trash page is
 *     where you'd hard-purge.
 *   - Fires `grid:environments-changed` so sidebar + env list
 *     update without a reload.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Impact = {
  members: number;
  integrations: number;
  systems: number;
  workflows: number;
  tasks: number;
  goals: number;
  signals: number;
  documents: number;
};

type Props = {
  environmentId: string;
  environmentName: string;
  redirectTo?: string;
  onClose: () => void;
};

export default function DeleteEnvironmentModal({
  environmentId,
  environmentName,
  redirectTo,
  onClose,
}: Props) {
  const router = useRouter();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/environments/${environmentId}/impact`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return;
        if (d) setImpact(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [environmentId]);

  async function handleSendToTrash() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/environments/${environmentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Map known API-error patterns to user-language. The raw
        // strings ("Cross-origin request blocked", "Unauthorized")
        // are correct from a security perspective but read like
        // dev-tool noise to a user staring at a confirmation modal.
        const raw = String(body.error ?? '');
        const friendly =
          /unauthorized|not found/i.test(raw)
            ? 'Your session expired. Refresh the page and sign back in to retry.'
          : /cross-origin|csrf/i.test(raw)
            ? 'Connection blocked by browser. Hard-reload (Cmd+Shift+R) and try again.'
          : /rate limit/i.test(raw)
            ? 'Too many delete attempts. Wait a moment and try again.'
          : raw || 'Could not send to trash. Try again.';
        setError(friendly);
        setSubmitting(false);
        return;
      }
      window.dispatchEvent(new CustomEvent('grid:environments-changed'));
      window.dispatchEvent(new CustomEvent('grid:systems-changed'));
      window.dispatchEvent(new CustomEvent('grid:workflows-changed'));
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
      onClose();
    } catch {
      setError('Network error. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  // ESC closes; Enter triggers submit when ready
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const nameMatches = confirmText.trim() === environmentName;
  const totalImpact = impact
    ? impact.members + impact.integrations + impact.systems + impact.workflows + impact.tasks + impact.goals + impact.signals + impact.documents
    : 0;

  // Surface the cross-cutting concerns first (members, integrations).
  // These affect other people / external systems and are the most
  // important to show before the owner-only counts.
  const crossCutting = impact
    ? [
        { label: 'team member', plural: 'team members', count: impact.members,
          note: 'will lose access to this workspace' },
        { label: 'connected integration', plural: 'connected integrations', count: impact.integrations,
          note: 'will disconnect (OAuth tokens revoked locally)' },
      ].filter(r => r.count > 0)
    : [];

  const ownedItems = impact
    ? [
        { label: 'system', plural: 'systems', count: impact.systems },
        { label: 'workflow', plural: 'workflows', count: impact.workflows },
        { label: 'task', plural: 'tasks', count: impact.tasks },
        { label: 'goal', plural: 'goals', count: impact.goals },
        { label: 'signal', plural: 'signals', count: impact.signals },
        { label: 'document', plural: 'documents', count: impact.documents },
      ].filter(r => r.count > 0)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-env-title"
    >
      <div
        className="rounded-2xl p-6 w-full max-w-lg"
        style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 id="delete-env-title" className="text-lg font-light tracking-tight mb-2"
          style={{ color: 'var(--text-1)' }}>
          Send "{environmentName}" to trash?
        </h2>
        <p className="text-xs font-light mb-4" style={{ color: 'var(--text-3)' }}>
          Recoverable from <strong style={{ color: 'var(--text-2)' }}>/environments/trash</strong> for 30 days.
          After that, permanently deleted.
        </p>

        {loading ? (
          <div className="space-y-2 mb-4">
            <div className="h-3 rounded animate-pulse" style={{ background: 'var(--glass)' }} />
            <div className="h-3 rounded animate-pulse w-2/3" style={{ background: 'var(--glass)' }} />
          </div>
        ) : impact && totalImpact > 0 ? (
          <div className="mb-5">
            {crossCutting.length > 0 && (
              <div className="mb-3 rounded-xl p-3 space-y-1.5"
                style={{ background: 'rgba(245,215,110,0.06)', border: '1px solid rgba(245,215,110,0.18)' }}>
                <p className="text-[10px] tracking-[0.14em] uppercase font-light" style={{ color: '#F5D76E' }}>
                  This affects others
                </p>
                {crossCutting.map(row => (
                  <p key={row.label} className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
                    <strong style={{ color: '#F5D76E' }}>{row.count}</strong>{' '}
                    {row.count === 1 ? row.label : row.plural} {row.note}
                  </p>
                ))}
              </div>
            )}
            {ownedItems.length > 0 && (
              <div className="rounded-xl p-3"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                <p className="text-[10px] tracking-[0.14em] uppercase font-light mb-2"
                  style={{ color: 'var(--text-3)' }}>
                  Hidden from active list
                </p>
                <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {ownedItems.map((row, i) => (
                    <span key={row.label}>
                      <strong style={{ color: 'var(--text-1)' }}>{row.count}</strong>{' '}
                      {row.count === 1 ? row.label : row.plural}
                      {i < ownedItems.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        ) : impact ? (
          <p className="text-xs font-light mb-4" style={{ color: 'var(--text-3)' }}>
            This environment is empty. Nothing to lose.
          </p>
        ) : null}

        <label className="block text-xs font-light mb-1.5" style={{ color: 'var(--text-3)' }}>
          Type <strong style={{ color: 'var(--text-2)' }}>{environmentName}</strong> to confirm
        </label>
        <input
          autoFocus
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && nameMatches && !submitting) handleSendToTrash();
          }}
          className="w-full text-sm font-light px-3 py-2 rounded-lg outline-none mb-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-1)',
          }}
          placeholder={environmentName}
        />

        {error && (
          <p className="text-xs font-light mb-3" style={{ color: '#FF6B6B' }}>{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-light px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            style={{ color: 'var(--text-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSendToTrash}
            disabled={!nameMatches || submitting}
            className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-30"
            style={{
              background: nameMatches ? 'rgba(255,107,107,0.12)' : 'rgba(255,107,107,0.04)',
              border: '1px solid rgba(255,107,107,0.3)',
              color: '#FF6B6B',
            }}
          >
            {submitting ? 'Sending…' : 'Send to trash'}
          </button>
        </div>
      </div>
    </div>
  );
}
