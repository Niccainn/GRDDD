'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsNav = [
  {
    href: '/settings',
    label: 'Profile',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
      </svg>
    ),
  },
  {
    href: '/settings/team',
    label: 'Team',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: '/settings/keys',
    label: 'API Keys',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    href: '/settings/preferences',
    label: 'Preferences',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
  {
    href: '/settings/billing',
    label: 'Billing',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/settings') return pathname === '/settings' || pathname === '/settings/profile';
    return pathname.startsWith(href);
  }

  return (
    // Column on mobile so the mobile-nav sits ABOVE the content instead
    // of beside it; row on desktop so the sidebar sits to the left.
    // Prior `display: flex` (row-only) was squeezing content into a thin
    // column on mobile, leaving pages looking blank.
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Settings sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: 200,
          background: 'var(--glass)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderRight: '1px solid var(--glass-border)',
          padding: '2rem 0',
        }}
      >
        <h2
          className="font-light"
          style={{
            fontSize: 13,
            color: 'var(--text-3)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '0 1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          Settings
        </h2>
        <nav className="flex flex-col gap-0.5 px-2">
          {settingsNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm font-light transition-all"
                style={{
                  color: active ? 'var(--text-1)' : 'var(--text-3)',
                  background: active ? 'var(--glass-active)' : 'transparent',
                  borderRadius: 'var(--radius-sm, 8px)',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.5 }}>{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
                {active && (
                  <div
                    className="ml-auto w-1 h-1 rounded-full"
                    style={{ background: 'var(--brand)', opacity: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile settings nav */}
      <div
        className="md:hidden flex gap-1 overflow-x-auto px-4 py-3 flex-shrink-0"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(8,8,12,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        {settingsNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-light whitespace-nowrap"
              style={{
                color: active ? 'var(--text-1)' : 'var(--text-3)',
                background: active ? 'var(--glass-active)' : 'transparent',
                borderRadius: 20,
                border: active ? '1px solid var(--glass-border)' : '1px solid transparent',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
