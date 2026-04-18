'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// ── Icons (matching Sidebar) ────────────────────────────────────────
const tabIcons = {
  home: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5L7.5 2.5L12.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 6.5V12.5H6.5V9.5H8.5V12.5H11V6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  tasks: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M5 7.5l1.5 1.5 3.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  nova: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  inbox: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 4.5C1.5 3.95 1.95 3.5 2.5 3.5H12.5C13.05 3.5 13.5 3.95 13.5 4.5V10.5C13.5 11.05 13.05 11.5 12.5 11.5H2.5C1.95 11.5 1.5 11.05 1.5 10.5V4.5Z" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 5L7.5 8.5L13.5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  more: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="1.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="1.5" y="8.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="8.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/></svg>,
  overview: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="1.5" width="5" height="5.5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="1.5" y="7" width="5" height="6" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="9" width="5" height="4" rx="0.75" stroke="currentColor" strokeWidth="1.1"/></svg>,
  docs: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M4 1.5H9.5L12 4V13C12 13.28 11.78 13.5 11.5 13.5H4C3.72 13.5 3.5 13.28 3.5 13V2C3.5 1.72 3.72 1.5 4 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M9.5 1.5V4H12" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M5.5 7.5h4M5.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  goals: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1"/><circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/></svg>,
  environments: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L13 4.75V11.25L7.5 14.5L2 11.25V4.75L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>,
  systems: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M5 4.5V3.5C5 2.95 5.45 2.5 6 2.5H9C9.55 2.5 10 2.95 10 3.5V4.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="7.5" cy="8.5" r="1.25" stroke="currentColor" strokeWidth="1.1"/></svg>,
  workflows: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="3" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.1"/><circle cx="12" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.1"/><circle cx="3" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.1"/><path d="M4.75 3H8C9.1 3 10 3.9 10 5v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><path d="M4.75 12H8C9.1 12 10 11.1 10 10V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  integrations: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="4.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="10.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.1"/><path d="M7.5 1.5V3M7.5 12V13.5M1.5 7.5H3M12 7.5H13.5M3.25 3.25L4.3 4.3M10.7 10.7L11.75 11.75M3.25 11.75L4.3 10.7M10.7 4.3L11.75 3.25" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  calendar: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 5.5h12" stroke="currentColor" strokeWidth="1.1"/><path d="M4.5 1v2.5M10.5 1v2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  analytics: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 12L5.5 8L8.5 10L13 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13.5H13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
};

type MoreItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const globalMoreItems: MoreItem[] = [
  { href: '/environments', label: 'Environments', icon: tabIcons.environments },
  { href: '/systems', label: 'Systems', icon: tabIcons.systems },
  { href: '/workflows', label: 'Workflows', icon: tabIcons.workflows },
  { href: '/goals', label: 'Goals', icon: tabIcons.goals },
  { href: '/docs', label: 'Documents', icon: tabIcons.docs },
  { href: '/calendar', label: 'Calendar', icon: tabIcons.calendar },
  { href: '/analytics', label: 'Analytics', icon: tabIcons.analytics },
  { href: '/integrations', label: 'Integrations', icon: tabIcons.integrations },
  { href: '/settings', label: 'Settings', icon: tabIcons.settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close More panel on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Detect environment context
  const envMatch = pathname.match(/^\/environments\/([^/]+)/);
  const envSlug = envMatch ? envMatch[1] : null;

  const isActive = (href: string) => {
    if (envSlug && href === `/environments/${envSlug}`) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Environment-scoped tabs
  const envTabs = envSlug
    ? [
        { href: `/environments/${envSlug}`, label: 'Overview', icon: tabIcons.overview },
        { href: `/environments/${envSlug}/tasks`, label: 'Tasks', icon: tabIcons.tasks },
        { href: `/environments/${envSlug}/docs`, label: 'Docs', icon: tabIcons.docs },
        { href: `/environments/${envSlug}/goals`, label: 'Goals', icon: tabIcons.goals },
      ]
    : null;

  const envMoreItems: MoreItem[] = envSlug
    ? [
        { href: `/environments/${envSlug}/activity`, label: 'Activity', icon: tabIcons.analytics },
        { href: `/environments/${envSlug}/analytics`, label: 'Analytics', icon: tabIcons.analytics },
        { href: `/environments/${envSlug}/calendar`, label: 'Calendar', icon: tabIcons.calendar },
        { href: '/dashboard', label: 'Home', icon: tabIcons.home },
        { href: '/nova', label: 'Nova', icon: tabIcons.nova },
        { href: '/environments', label: 'All Environments', icon: tabIcons.environments },
        { href: '/settings', label: 'Settings', icon: tabIcons.settings },
      ]
    : [];

  // Global tabs
  const globalTabs = [
    { href: '/dashboard', label: 'Home', icon: tabIcons.home },
    { href: '/tasks', label: 'Tasks', icon: tabIcons.tasks },
    { href: '/nova', label: 'Nova', icon: tabIcons.nova, isNova: true },
    { href: '/inbox', label: 'Inbox', icon: tabIcons.inbox },
  ];

  const tabs = envTabs ?? globalTabs;
  const moreItems = envSlug ? envMoreItems : globalMoreItems;

  return (
    <>
      {/* More slide-up panel */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-[49] md:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed bottom-16 left-0 right-0 z-[49] md:hidden"
            style={{
              background: 'rgba(8, 8, 12, 0.98)',
              backdropFilter: 'blur(60px)',
              WebkitBackdropFilter: 'blur(60px)',
              borderTop: '1px solid var(--glass-border)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div className="w-8 h-1 rounded-full mx-auto mb-2" style={{ background: 'var(--glass-border)' }} />
              <p className="text-[10px] tracking-[0.16em] font-light" style={{ color: 'var(--text-3)' }}>
                MORE
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3 max-h-[50vh] overflow-y-auto">
              {moreItems.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                    style={{
                      color: active ? 'var(--text-1)' : 'var(--text-3)',
                      background: active ? 'var(--glass-active)' : 'transparent',
                    }}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span style={{ opacity: active ? 1 : 0.5 }}>{item.icon}</span>
                    <span className="text-[10px] font-light tracking-wide">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          background: 'rgba(8, 8, 12, 0.95)',
          backdropFilter: 'blur(60px)',
          WebkitBackdropFilter: 'blur(60px)',
          borderTop: '1px solid var(--glass-border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around h-16">
          {tabs.map(tab => {
            const active = isActive(tab.href);
            const isNova = 'isNova' in tab && tab.isNova;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
                style={{
                  color: active
                    ? isNova ? 'var(--nova)' : 'var(--brand)'
                    : isNova ? 'rgba(191,159,241,0.4)' : 'var(--text-3)',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.6 }}>{tab.icon}</span>
                <span className="text-[10px] font-light tracking-wide">{tab.label}</span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(prev => !prev)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
            style={{
              color: moreOpen ? 'var(--brand)' : 'var(--text-3)',
            }}
          >
            <span style={{ opacity: moreOpen ? 1 : 0.6 }}>{tabIcons.more}</span>
            <span className="text-[10px] font-light tracking-wide">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
