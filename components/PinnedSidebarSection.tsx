'use client';

/**
 * PinnedSidebarSection — a client-rendered block that sits at the
 * top of the sidebar. Reads the pinned-href list from localStorage
 * and renders a compact row of deep links. The set of pinnable
 * items is the full nav catalog (primary + APPS + environment-
 * scoped entries). Each pinned row supports an unpin action on
 * hover.
 *
 * This is the zero-schema customization pass — per-device, per-
 * user. The follow-up is to sync to a per-identity preferences
 * row in Postgres; the API surface will stay the same so callers
 * don't change.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PINNED_NAV_EVENT, readPinned, writePinned } from '@/lib/ui/pinned-nav';

// Authoritative label + href map for every pinnable item. Kept in
// one place so PinnedSidebarSection can render labels consistently
// without having to re-resolve from the full nav tree. Keep this in
// sync with components/Sidebar.tsx when nav items are added/removed.
const CATALOG: Record<string, string> = {
  '/dashboard': 'Home',
  '/nova': 'Nova',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/inbox': 'Inbox',
  '/calendar': 'Calendar',
  '/learn': 'Learn',
  '/memory': 'Memory',
  '/workflows': 'Workflows',
  '/agents': 'Agents',
  '/automations': 'Automations',
  '/templates': 'Templates',
  '/forms': 'Forms',
  '/views': 'Saved filters',
  '/goals': 'Goals',
  '/approvals': 'Approvals',
  '/docs': 'Documents',
  '/assets': 'Assets',
  '/time': 'Time Tracking',
  '/finance': 'Finance',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/mastery': 'Mastery',
  '/activity': 'Activity',
  '/audit': 'Audit',
  '/skill-space': 'Skill Space',
  '/integrations': 'Integrations',
  '/environments': 'Environments',
  '/settings': 'Settings',
  '/capabilities': 'Capabilities',
  '/roadmap': 'Roadmap',
};

export default function PinnedSidebarSection() {
  const pathname = usePathname();
  const [pinned, setPinned] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPinned(readPinned());
    const onChange = () => setPinned(readPinned());
    window.addEventListener(PINNED_NAV_EVENT, onChange);
    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'grid:pinned-nav') onChange();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PINNED_NAV_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Avoid SSR/CSR hydration mismatch — render nothing on the server pass.
  if (!mounted) return null;
  if (pinned.length === 0) return null;

  function unpin(href: string) {
    const next = pinned.filter(h => h !== href);
    writePinned(next);
    setPinned(next);
  }

  return (
    <div className="px-2 pt-3 pb-1">
      <p
        className="text-[10px] tracking-[0.18em] uppercase font-light px-3 mb-2"
        style={{ color: 'var(--text-3)' }}
      >
        Pinned
      </p>
      <div className="space-y-0.5">
        {pinned.map(href => {
          const label = CATALOG[href] ?? href;
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            <div key={href} className="group flex items-center gap-1">
              <Link
                href={href}
                className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-light transition-colors"
                style={{
                  background: active ? 'var(--glass-active)' : 'transparent',
                  color: active ? 'var(--text-1)' : 'var(--text-2)',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                  <path d="M4.5 1v5L2.5 8v1h7V8l-2-2V1h-3z" opacity="0.9" />
                </svg>
                <span className="truncate">{label}</span>
              </Link>
              <button
                type="button"
                onClick={() => unpin(href)}
                aria-label={`Unpin ${label}`}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center transition-all"
                style={{ color: 'var(--text-3)' }}
                title="Unpin"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
