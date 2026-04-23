'use client';

/**
 * BackToEnvironment — a slim "← Environment name" anchor that
 * resolves the environment slug from its id on mount. Used at the
 * top of every deep page (/projects/[id], /systems/[id],
 * /workflows/[id]) so users never get lost more than one click from
 * home.
 *
 * Renders nothing if the environment cannot be resolved (no session,
 * deleted env, etc). Never throws.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Props = {
  environmentId: string | null | undefined;
  /** Override the default "Environment" preposition with e.g. "System" for nested breadcrumbs. */
  homeLabel?: string;
};

export default function BackToEnvironment({ environmentId, homeLabel = 'Environment' }: Props) {
  const [env, setEnv] = useState<{ name: string; slug: string } | null>(null);

  useEffect(() => {
    if (!environmentId) return;
    fetch('/api/environments')
      .then(r => r.json())
      .then(list => {
        const envs = Array.isArray(list) ? list : list?.environments ?? [];
        const match = envs.find((e: { id: string }) => e.id === environmentId);
        if (match?.slug) setEnv({ name: match.name, slug: match.slug });
      })
      .catch(() => {});
  }, [environmentId]);

  if (!env) {
    // Render a generic fallback to /environments so the user still
    // has a one-click way up even when the specific slug isn't
    // resolved yet.
    return (
      <Link
        href="/environments"
        className="inline-flex items-center gap-1.5 text-xs font-light mb-4 transition-colors"
        style={{ color: 'var(--text-3)' }}
      >
        <span aria-hidden>←</span>
        <span>All environments</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/environments/${env.slug}`}
      className="inline-flex items-center gap-1.5 text-xs font-light mb-4 transition-colors"
      style={{ color: 'var(--text-3)' }}
    >
      <span aria-hidden>←</span>
      <span>
        <span style={{ color: 'var(--text-2)' }}>{env.name}</span>
        <span className="opacity-50"> · {homeLabel}</span>
      </span>
    </Link>
  );
}
