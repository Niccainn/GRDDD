'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/dashboard',
    label: 'Operate',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1"/>
        <path d="M7.5 4.5v3l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/environments',
    label: 'Environments',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1.5L13 4.75V11.25L7.5 14.5L2 11.25V4.75L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/systems',
    label: 'Systems',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
        <path d="M5 4.5V3.5C5 2.95 5.45 2.5 6 2.5H9C9.55 2.5 10 2.95 10 3.5V4.5" stroke="currentColor" strokeWidth="1.1"/>
        <circle cx="7.5" cy="8.5" r="1.25" stroke="currentColor" strokeWidth="1.1"/>
      </svg>
    ),
  },
  {
    href: '/workflows',
    label: 'Workflows',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="3" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.1"/>
        <circle cx="12" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.1"/>
        <circle cx="3" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.1"/>
        <path d="M4.75 3H8C9.1 3 10 3.9 10 5v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <path d="M4.75 12H8C9.1 12 10 11.1 10 10V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/nova',
    label: 'Nova',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-40"
      style={{ borderRight: '1px solid var(--border)', background: 'var(--background)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/" className="flex items-center gap-3 group">
          {/*
            Logo geometry:
            - Portrait rounded rectangle (viewBox 0 0 79 100)
            - Two vertical dividers at x=27 and x=52
            - Each divider curves RIGHT at the bottom (quarter-circle r=8)
              connecting to the outer rect's bottom edge
          */}
          <svg width="22" height="28" viewBox="0 0 79 100" fill="none" className="flex-shrink-0">
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2" strokeOpacity="0.9"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2" strokeOpacity="0.9"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2" strokeOpacity="0.9"/>
          </svg>
          <span className="text-sm font-light tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.85)' }}>
            GRID
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const isNova = item.href === '/nova';
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-100"
              style={{
                color: active
                  ? isNova ? '#BF9FF1' : 'rgba(255,255,255,0.9)'
                  : isNova ? 'rgba(191,159,241,0.45)' : 'rgba(255,255,255,0.35)',
                background: active
                  ? isNova ? 'rgba(191,159,241,0.08)' : 'rgba(255,255,255,0.05)'
                  : 'transparent',
              }}
            >
              <span style={{ opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              <span className="font-light tracking-wide text-sm">{item.label}</span>
              {active && (
                <div className="ml-auto w-1 h-1 rounded-full"
                  style={{ background: isNova ? 'rgba(191,159,241,0.5)' : 'rgba(255,255,255,0.3)' }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Settings */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <Link href="/settings"
          className="flex items-center gap-3 group w-full"
          style={{ textDecoration: 'none' }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-light flex-shrink-0"
            style={{ background: 'rgba(21,173,112,0.12)', color: '#15AD70', border: '1px solid rgba(21,173,112,0.18)' }}>
            D
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-light truncate group-hover:text-white/70 transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }}>Demo User</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>demo@grid.app</p>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity">
            <circle cx="12" cy="12" r="3"/>
            <path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
        </Link>
      </div>
    </aside>
  );
}
