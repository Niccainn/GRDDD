'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import ThemeToggle from './ThemeToggle';
import { useEnvironmentBrand } from './EnvironmentBrand';

const coreNav = [
  { href: '/dashboard', label: 'Operate', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1"/><path d="M7.5 4.5v3l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg> },
  { href: '/environments', label: 'Environments', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L13 4.75V11.25L7.5 14.5L2 11.25V4.75L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg> },
  { href: '/systems', label: 'Systems', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M5 4.5V3.5C5 2.95 5.45 2.5 6 2.5H9C9.55 2.5 10 2.95 10 3.5V4.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="7.5" cy="8.5" r="1.25" stroke="currentColor" strokeWidth="1.1"/></svg> },
  { href: '/workflows', label: 'Workflows', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="3" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.1"/><circle cx="12" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.1"/><circle cx="3" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.1"/><path d="M4.75 3H8C9.1 3 10 3.9 10 5v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><path d="M4.75 12H8C9.1 12 10 11.1 10 10V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg> },
  { href: '/nova', label: 'Nova', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>, accent: true },
];

const secondaryNav = [
  { href: '/analytics', label: 'Analytics', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 12L5.5 8L8.5 10L13 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13.5H13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg> },
  { href: '/inbox', label: 'Inbox', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 4.5C1.5 3.95 1.95 3.5 2.5 3.5H12.5C13.05 3.5 13.5 3.95 13.5 4.5V10.5C13.5 11.05 13.05 11.5 12.5 11.5H2.5C1.95 11.5 1.5 11.05 1.5 10.5V4.5Z" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 5L7.5 8.5L13.5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>, badge: 'inbox' },
  { href: '/goals', label: 'Goals', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1"/><circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/></svg> },
  { href: '/reports', label: 'Reports', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M4.5 5h6M4.5 7.5h6M4.5 10h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg> },
  { href: '/audit', label: 'Audit', icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M4.5 5.5h6M4.5 8h4M4.5 10.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { brandName, brandLogo } = useEnvironmentBrand();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const [inboxUnread, setInboxUnread] = useState(0);
  useEffect(() => {
    fetch('/api/signals?limit=1').then(r => r.json()).then(d => setInboxUnread(d.unreadCount ?? 0)).catch(() => {});
    const id = setInterval(() => {
      fetch('/api/signals?limit=1').then(r => r.json()).then(d => setInboxUnread(d.unreadCount ?? 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-40"
      style={{
        background: 'rgba(8, 8, 12, 0.8)',
        backdropFilter: 'blur(60px)',
        WebkitBackdropFilter: 'blur(60px)',
        borderRight: '1px solid var(--glass-border)',
      }}>

      {/* Logo / Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <Link href="/" className="flex items-center gap-3 group">
          {brandLogo ? (
            <img src={brandLogo} alt="" className="h-6 w-auto" />
          ) : (
            <svg width="20" height="26" viewBox="0 0 79 100" fill="none" className="flex-shrink-0" style={{ opacity: 0.3 }}>
              <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2"/>
              <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2"/>
              <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2"/>
            </svg>
          )}
          <span className="text-sm font-light tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
            {brandName ?? 'GRID'}
          </span>
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="glass-pill w-full flex items-center gap-2 px-3 py-2 text-sm">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="flex-1 text-left font-light text-xs" style={{ color: 'var(--text-3)' }}>Search</span>
          <kbd className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'inherit' }}>&#8984;K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Core */}
        {coreNav.map(item => {
          const active = isActive(item.href);
          const isNova = item.accent;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                color: active
                  ? isNova ? 'var(--nova)' : 'var(--text-1)'
                  : isNova ? 'rgba(191,159,241,0.4)' : 'var(--text-3)',
                background: active
                  ? isNova ? 'var(--nova-soft)' : 'var(--glass-active)'
                  : 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}>
              <span style={{ opacity: active ? 1 : 0.5 }}>{item.icon}</span>
              <span className="font-light tracking-wide">{item.label}</span>
              {active && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: isNova ? 'var(--nova)' : 'var(--brand)', opacity: 0.5 }} />}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3" style={{ borderTop: '1px solid var(--glass-border)' }} />

        {/* Secondary */}
        {secondaryNav.map(item => {
          const active = isActive(item.href);
          const showBadge = item.badge === 'inbox' && inboxUnread > 0;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm transition-all"
              style={{
                color: active ? 'var(--text-1)' : 'var(--text-3)',
                background: active ? 'var(--glass-active)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}>
              <span style={{ opacity: active ? 1 : 0.4 }}>{item.icon}</span>
              <span className="font-light tracking-wide">{item.label}</span>
              {showBadge && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-light"
                  style={{ background: 'var(--nova-soft)', color: 'var(--nova)', border: '1px solid rgba(191,159,241,0.2)' }}>
                  {inboxUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme + User */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="flex items-center justify-between mb-3 px-1">
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="flex items-center gap-3 flex-1 min-w-0 group">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-light flex-shrink-0"
              style={{ background: 'var(--brand-glow)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light truncate transition-colors group-hover:text-white/60" style={{ color: 'var(--text-2)' }}>
                {user?.name ?? 'Loading...'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                {user?.email ?? ''}
              </p>
            </div>
          </Link>
          <button
            onClick={async () => {
              await fetch('/api/auth/sign-out', { method: 'POST' });
              router.push('/sign-in');
            }}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-3)' }}
            title="Sign out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
