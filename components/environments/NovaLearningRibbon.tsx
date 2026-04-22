'use client';

/**
 * NovaLearningRibbon — slim banner on the Environment page surfacing
 * what Nova has learned in the past 7 days. The learning has to be
 * felt, not just logged.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Snapshot = {
  learnedThisWeek: number;
  topSubject: string | null;
};

export default function NovaLearningRibbon({ environmentId }: { environmentId: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    // Lightweight endpoint: just counts NovaMemory entries with
    // environmentId matching in the last 7 days + picks the most
    // recent category.
    fetch(`/api/memory?envId=${environmentId}&days=7&limit=40`)
      .then(r => r.json())
      .then(d => {
        const items = Array.isArray(d.items) ? d.items : [];
        const topSubject =
          items.length > 0
            ? (items[0].category ?? items[0].type ?? null)
            : null;
        setSnap({ learnedThisWeek: items.length, topSubject });
      })
      .catch(() => setSnap({ learnedThisWeek: 0, topSubject: null }));
  }, [environmentId]);

  if (!snap || snap.learnedThisWeek === 0) return null;

  return (
    <Link
      href="/memory"
      className="flex items-center gap-3 px-4 py-2 rounded-full mb-6 transition-colors w-fit"
      style={{
        background: 'rgba(191,159,241,0.06)',
        border: '1px solid rgba(191,159,241,0.18)',
        color: '#BF9FF1',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: '#BF9FF1' }}
      />
      <span className="text-[11px] font-light tracking-wider uppercase">
        Nova learned {snap.learnedThisWeek} thing{snap.learnedThisWeek === 1 ? '' : 's'} this week
        {snap.topSubject ? ` · latest: ${snap.topSubject}` : ''}
      </span>
      <span className="text-[11px] font-light">See →</span>
    </Link>
  );
}
