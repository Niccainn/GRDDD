'use client';

/**
 * DashboardEnvironmentRedirect — on mount, check whether the user
 * has a primary Environment and redirect /dashboard to it. The
 * Environment page is the canonical overview; /dashboard remains
 * a fallback for users who have no Environments yet.
 *
 * Lives as its own client component so the server-rendered
 * /dashboard page can embed it above the fold without pulling the
 * whole page into client land.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DashboardEnvironmentRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Escape hatch so a user can explicitly ask for /dashboard
    // without being redirected (useful for Nova devs + troubleshooting).
    if (params.get('stay') === '1') {
      setChecked(true);
      return;
    }
    fetch('/api/environments')
      .then(r => r.json())
      .then(list => {
        const envs = Array.isArray(list) ? list : list?.environments ?? [];
        const first = envs[0];
        if (first?.slug) {
          router.replace(`/environments/${first.slug}`);
          return;
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [router, params]);

  if (checked) return null;

  // Render nothing but a subtle "redirecting" hint while the check
  // runs — keeps the handoff feeling intentional rather than janky.
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full"
      style={{
        background: 'rgba(191,159,241,0.08)',
        border: '1px solid rgba(191,159,241,0.2)',
        color: '#BF9FF1',
      }}
    >
      <span className="text-[10px] tracking-wider uppercase font-light">
        Taking you to your Environment…
      </span>
    </div>
  );
}
