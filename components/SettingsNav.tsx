'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const SETTINGS_NAV = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/ai', label: 'AI Keys' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/preferences', label: 'Preferences' },
  { href: '/settings/webhooks', label: 'Webhooks' },
  { href: '/settings/billing', label: 'Billing' },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex md:hidden overflow-x-auto gap-1.5 mb-6 pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
      {SETTINGS_NAV.map(nav => {
        const active = pathname === nav.href;
        return (
          <Link
            key={nav.href}
            href={nav.href}
            className="flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-light whitespace-nowrap transition-all"
            style={{
              background: active ? 'var(--glass-active)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? 'var(--brand-border)' : 'rgba(255,255,255,0.06)'}`,
              color: active ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            {nav.label}
          </Link>
        );
      })}
    </div>
  );
}
