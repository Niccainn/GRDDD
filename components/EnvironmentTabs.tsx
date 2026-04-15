'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    key: 'overview',
    label: 'Overview',
    path: '',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="1.5" width="5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.1" />
        <rect x="8.5" y="1.5" width="5" height="5.5" rx="0.75" stroke="currentColor" strokeWidth="1.1" />
        <rect x="1.5" y="7" width="5" height="6" rx="0.75" stroke="currentColor" strokeWidth="1.1" />
        <rect x="8.5" y="9" width="5" height="4" rx="0.75" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    ),
  },
  {
    key: 'tasks',
    label: 'Tasks',
    path: '/tasks',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M5 7.5l1.5 1.5 3.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'docs',
    label: 'Docs',
    path: '/docs',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M4 1.5H9.5L12 4V13C12 13.28 11.78 13.5 11.5 13.5H4C3.72 13.5 3.5 13.28 3.5 13V2C3.5 1.72 3.72 1.5 4 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M9.5 1.5V4H12" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M5.5 7.5h4M5.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'goals',
    label: 'Goals',
    path: '/goals',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1" />
        <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    ),
  },
  {
    key: 'activity',
    label: 'Activity',
    path: '/activity',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1.5 7.5H4L5.5 3.5L7.5 11.5L9.5 5.5L11 7.5H13.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'calendar',
    label: 'Calendar',
    path: '/calendar',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M1.5 5.5h12" stroke="currentColor" strokeWidth="1.1" />
        <path d="M4.5 1v2.5M10.5 1v2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 12L5.5 8L8.5 10L13 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 13.5H13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function EnvironmentTabs({ slug, envColor }: { slug: string; envColor?: string | null }) {
  const pathname = usePathname();
  const basePath = `/environments/${slug}`;

  function isActive(tab: typeof tabs[number]) {
    if (tab.path === '') {
      return pathname === basePath || pathname === basePath + '/';
    }
    return pathname.startsWith(basePath + tab.path);
  }

  const accentColor = envColor || 'var(--brand)';

  return (
    <div
      className="sticky top-0 z-10 -mx-4 px-4 md:-mx-10 md:px-10 overflow-x-auto scrollbar-none"
      style={{
        background: 'var(--glass)',
        borderBottom: '1px solid var(--glass-border)',
        backdropFilter: `blur(var(--glass-blur))`,
        WebkitBackdropFilter: `blur(var(--glass-blur))`,
      }}
    >
      <div className="flex items-center gap-1 py-1 min-w-max">
        {tabs.map(tab => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.key}
              href={basePath + tab.path}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-light tracking-wide transition-all"
              style={{
                color: active ? accentColor : 'var(--text-3)',
                background: active ? `${accentColor}10` : 'transparent',
                boxShadow: active ? `0 0 12px ${accentColor}15` : 'none',
              }}
            >
              <span style={{ opacity: active ? 1 : 0.5 }}>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
