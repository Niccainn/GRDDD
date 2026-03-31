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
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className="flex-shrink-0">
            <rect x="1" y="1" width="24" height="24" rx="4" stroke="white" strokeWidth="0.75" strokeOpacity="0.9"/>
            <line x1="9" y1="1" x2="9" y2="25" stroke="white" strokeWidth="0.75" strokeOpacity="0.9"/>
            <line x1="17" y1="1" x2="17" y2="25" stroke="white" strokeWidth="0.75" strokeOpacity="0.9"/>
            <path d="M17 5.5C17 5.5 21 5.5 21 13C21 20.5 17 20.5 17 20.5" stroke="white" strokeWidth="0.75" strokeOpacity="0.9" fill="none"/>
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-100"
              style={{
                color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
              }}
            >
              <span style={{ opacity: active ? 0.9 : 0.5 }}>{item.icon}</span>
              <span className="font-light tracking-wide text-sm">{item.label}</span>
              {active && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-light flex-shrink-0"
            style={{ background: 'rgba(21,173,112,0.12)', color: '#15AD70', border: '1px solid rgba(21,173,112,0.18)' }}>
            D
          </div>
          <div className="min-w-0">
            <p className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>Demo User</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>demo@grid.app</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
