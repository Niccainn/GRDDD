'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import { useEnvironmentBrand } from './EnvironmentBrand';

// ── Icons ────────────────────────────────────────────────────────────
const icons = {
  home: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5L7.5 2.5L12.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 6.5V12.5H6.5V9.5H8.5V12.5H11V6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  nova: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  tasks: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M5 7.5l1.5 1.5 3.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  inbox: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 4.5C1.5 3.95 1.95 3.5 2.5 3.5H12.5C13.05 3.5 13.5 3.95 13.5 4.5V10.5C13.5 11.05 13.05 11.5 12.5 11.5H2.5C1.95 11.5 1.5 11.05 1.5 10.5V4.5Z" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 5L7.5 8.5L13.5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  goals: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1"/><circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/></svg>,
  environments: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L13 4.75V11.25L7.5 14.5L2 11.25V4.75L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>,
  systems: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M5 4.5V3.5C5 2.95 5.45 2.5 6 2.5H9C9.55 2.5 10 2.95 10 3.5V4.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="7.5" cy="8.5" r="1.25" stroke="currentColor" strokeWidth="1.1"/></svg>,
  workflows: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="3" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.1"/><circle cx="12" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.1"/><circle cx="3" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.1"/><path d="M4.75 3H8C9.1 3 10 3.9 10 5v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><path d="M4.75 12H8C9.1 12 10 11.1 10 10V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  agents: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L12.5 4.5V10.5L7.5 13.5L2.5 10.5V4.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><circle cx="7.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.1"/></svg>,
  integrations: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="4.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="10.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/></svg>,
  templates: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="2" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1"/><rect x="2" y="8.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="8.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1"/></svg>,
  calendar: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 5.5h12" stroke="currentColor" strokeWidth="1.1"/><path d="M4.5 1v2.5M10.5 1v2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  analytics: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 12L5.5 8L8.5 10L13 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13.5H13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  reports: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M4.5 5h6M4.5 7.5h6M4.5 10h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  audit: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M4.5 5.5h6M4.5 8h4M4.5 10.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  documents: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M4 1.5H9.5L12 4V13C12 13.28 11.78 13.5 11.5 13.5H4C3.72 13.5 3.5 13.28 3.5 13V2C3.5 1.72 3.72 1.5 4 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M9.5 1.5V4H12" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M5.5 7.5h4M5.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  activity: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 7.5H4L5.5 3.5L7.5 11.5L9.5 5.5L11 7.5H13.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  forms: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="1.5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M5 5h5M5 7.5h5M5 10h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><path d="M2.5 4.5h-1v8.5a1.5 1.5 0 001.5 1.5h8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  views: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="1.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="1.5" y="8.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="8.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/></svg>,
  automations: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M8.5 1.5L3.5 8.5H7L6.5 13.5L11.5 6.5H8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dashboards: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="1.5" width="5" height="5.5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="1.5" y="7" width="5" height="6" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="8.5" y="9" width="5" height="4" rx="0.75" stroke="currentColor" strokeWidth="1.1"/></svg>,
  finance: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><path d="M10 4.5H6.25a1.75 1.75 0 000 3.5h2.5a1.75 1.75 0 010 3.5H5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  time: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1"/><path d="M7.5 4v3.5L10 9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  approvals: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L3 3.5V7C3 10 5 12.5 7.5 13.5C10 12.5 12 10 12 7V3.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M5.5 7.5L7 9L9.5 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  assets: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 10l3-3 2 2 3-4 4 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><circle cx="4.5" cy="5.5" r="1" stroke="currentColor" strokeWidth="1.1"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.1"/><path d="M7.5 1.5V3M7.5 12V13.5M1.5 7.5H3M12 7.5H13.5M3.25 3.25L4.3 4.3M10.7 10.7L11.75 11.75M3.25 11.75L4.3 10.7M10.7 4.3L11.75 3.25" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type NavSection = {
  label: string;
  items: NavItem[];
  /** Optional subgroups — when present, `items` is ignored and the
   *  section renders each group with its own mini-header. */
  groups?: NavGroup[];
};

// ── Sidebar sections ─────────────────────────────────────────────────
// System-first: business functions → daily work → full app library.
// The APPS section restores every capability that Phase 1 unlinked;
// kept collapsed by default so new users see a clean 6-item sidebar,
// but returning users can expand and browse the full catalog.
type CollapsibleNavSection = NavSection & {
  id?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

const navSections: CollapsibleNavSection[] = [
  {
    label: '',
    items: [
      { href: '/dashboard', label: 'Home', icon: icons.home },
      { href: '/nova', label: 'Nova', icon: icons.nova, accent: true },
    ],
  },
  // YOUR SYSTEMS — injected dynamically below
  {
    label: '',
    items: [
      // Projects is the interaction-layer hero — one prompt, multi-tool
      // plan, human gates. Pulled up from Insights to primary nav so
      // new users see the differentiator on day one.
      { href: '/projects', label: 'Projects', icon: icons.workflows },
      { href: '/tasks', label: 'Tasks', icon: icons.tasks },
      { href: '/inbox', label: 'Inbox', icon: icons.inbox, badge: 'inbox' },
      { href: '/calendar', label: 'Calendar', icon: icons.calendar },
      // LMS primitives — bidirectional learning loop. Promoted so the
      // compounding story is visible without diving into APPS.
      { href: '/learn', label: 'Learn', icon: icons.analytics },
      { href: '/memory', label: 'Memory', icon: icons.documents },
    ],
  },
  {
    label: 'APPS',
    id: 'apps',
    collapsible: true,
    defaultCollapsed: true,
    items: [],
    groups: [
      {
        label: 'Build',
        items: [
          { href: '/workflows', label: 'Workflows', icon: icons.workflows },
          { href: '/agents', label: 'Agents', icon: icons.agents },
          { href: '/automations', label: 'Automations', icon: icons.automations },
          { href: '/templates', label: 'Templates', icon: icons.templates },
          { href: '/forms', label: 'Forms', icon: icons.forms },
          { href: '/views', label: 'Saved filters', icon: icons.views },
        ],
      },
      {
        label: 'Work',
        items: [
          { href: '/goals', label: 'Goals', icon: icons.goals },
          { href: '/approvals', label: 'Approvals', icon: icons.approvals },
          { href: '/docs', label: 'Documents', icon: icons.documents },
          { href: '/assets', label: 'Assets', icon: icons.assets },
          { href: '/time', label: 'Time Tracking', icon: icons.time },
          { href: '/finance', label: 'Finance', icon: icons.finance },
        ],
      },
      {
        // "Insights" collapses to advanced surfaces only. Dashboards
        // intentionally removed — the Environment page is the
        // canonical overview. Projects, Learn, and Memory were
        // promoted to primary nav.
        label: 'Insights',
        items: [
          { href: '/analytics', label: 'Analytics', icon: icons.analytics },
          { href: '/reports', label: 'Reports', icon: icons.reports },
          { href: '/mastery', label: 'Mastery', icon: icons.analytics },
          { href: '/activity', label: 'Activity', icon: icons.activity },
          { href: '/audit', label: 'Audit', icon: icons.audit },
          { href: '/skill-space', label: 'Skill Space', icon: icons.analytics },
        ],
      },
      {
        label: 'Platform',
        items: [
          { href: '/integrations', label: 'Integrations', icon: icons.integrations },
          { href: '/environments', label: 'Environments', icon: icons.environments },
        ],
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { brandName, brandLogo } = useEnvironmentBrand();

  // Detect environment context
  const envMatch = pathname.match(/^\/environments\/([^/]+)/);
  const envSlug = envMatch ? envMatch[1] : null;
  const envDisplayName = envSlug
    ? envSlug.charAt(0).toUpperCase() + envSlug.slice(1).replace(/-/g, ' ')
    : null;

  const isActive = (href: string) => {
    // Exact match for environment overview
    if (envSlug && href === `/environments/${envSlug}`) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Environment-scoped navigation
  const envNavSections: NavSection[] = [
    {
      label: '',
      items: [
        { href: '/dashboard', label: 'Home', icon: icons.home },
        { href: '/nova', label: 'Nova', icon: icons.nova, accent: true },
      ],
    },
    {
      label: '',
      items: [
        { href: `/environments/${envSlug}`, label: 'Overview', icon: icons.dashboards },
        { href: `/environments/${envSlug}/tasks`, label: 'Tasks', icon: icons.tasks },
        { href: `/environments/${envSlug}/docs`, label: 'Documents', icon: icons.documents },
        { href: `/environments/${envSlug}/goals`, label: 'Goals', icon: icons.goals },
        { href: `/environments/${envSlug}/activity`, label: 'Activity', icon: icons.activity },
        { href: `/environments/${envSlug}/analytics`, label: 'Analytics', icon: icons.analytics },
        { href: `/environments/${envSlug}/calendar`, label: 'Calendar', icon: icons.calendar },
      ],
    },
    {
      label: 'GLOBAL',
      items: [
        { href: '/environments', label: 'All Environments', icon: icons.environments },
        { href: '/tasks', label: 'All Tasks', icon: icons.tasks },
        { href: '/workflows', label: 'Workflows', icon: icons.workflows },
        { href: '/systems', label: 'Systems', icon: icons.systems },
        { href: '/integrations', label: 'Integrations', icon: icons.integrations },
      ],
    },
  ];

  const activeSections = envSlug ? envNavSections : navSections;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [systems, setSystems] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { apps: true };
    try {
      const saved = localStorage.getItem('grid_sidebar_sections');
      return saved ? JSON.parse(saved) : { apps: true };
    } catch {
      return { apps: true };
    }
  });

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('grid_sidebar_sections', JSON.stringify(next));
      } catch {
        /* non-fatal */
      }
      return next;
    });
  };

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fetch systems for sidebar; re-fetch when a system is created/deleted so
  // the sidebar stays in sync without a full page refresh.
  useEffect(() => {
    const load = () => {
      fetch('/api/systems').then(r => r.json()).then(d => {
        if (Array.isArray(d)) setSystems(d);
      }).catch(() => {});
    };
    load();
    const handler = () => load();
    window.addEventListener('grid:systems-changed', handler);
    // Deleting an Environment cascades to its Systems, so the list
    // on the sidebar needs to reload on that event too.
    window.addEventListener('grid:environments-changed', handler);
    return () => {
      window.removeEventListener('grid:systems-changed', handler);
      window.removeEventListener('grid:environments-changed', handler);
    };
  }, []);

  useEffect(() => {
    fetch('/api/signals?limit=1').then(r => r.json()).then(d => setInboxUnread(d.unreadCount ?? 0)).catch(() => {});
    const id = setInterval(() => {
      fetch('/api/signals?limit=1').then(r => r.json()).then(d => setInboxUnread(d.unreadCount ?? 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

    <aside
      data-surface="sidebar"
      className={`fixed left-0 top-0 h-screen w-[220px] flex flex-col z-50 transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      style={{
        // Always-dark island — crisp anchor in both themes, matches
        // the pre-light-mode feel of the sidebar.
        background: 'rgba(8, 8, 12, 0.95)',
        backdropFilter: 'blur(60px)',
        WebkitBackdropFilter: 'blur(60px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >

      {/* Logo / Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <Link href="/" className="flex items-center gap-3 group">
          {brandLogo ? (
            <Image src={brandLogo} alt="" width={96} height={24} className="h-6 w-auto" />
          ) : (
            <svg width="20" height="26" viewBox="0 0 79 100" fill="none" className="flex-shrink-0">
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
          data-tour="search-button"
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

      {/* Environment header */}
      {envSlug && envDisplayName && (
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <Link
            href={`/environments/${envSlug}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
          >
            <span style={{ color: 'var(--brand)', opacity: 0.7 }}>{icons.environments}</span>
            <span className="text-xs font-light tracking-wide truncate" style={{ color: 'var(--text-2)' }}>
              {envDisplayName}
            </span>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {activeSections.map((section, si) => {
          const cs = section as CollapsibleNavSection;
          const sectionId = cs.id || section.label || String(si);
          const isCollapsible = Boolean(cs.collapsible);
          const isCollapsed = isCollapsible && collapsedSections[sectionId] !== false;

          return (
            <div key={sectionId} className={si > 0 ? 'mt-4' : ''}>
              {section.label && (
                isCollapsible ? (
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center justify-between px-3 mb-1.5"
                  >
                    <p className="text-[10px] tracking-[0.16em] font-light" style={{ color: 'var(--text-3)' }}>
                      {section.label}
                    </p>
                    <svg
                      width="8" height="8" viewBox="0 0 8 8" fill="none"
                      className="transition-transform duration-200"
                      style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', opacity: 0.4, color: 'var(--text-3)' }}
                    >
                      <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : (
                <p className="text-[10px] tracking-[0.16em] font-light px-3 mb-1.5" style={{ color: 'var(--text-3)' }}>
                  {section.label}
                </p>
                )
              )}

              {/* Dynamic systems section — injected after the first section (Home/Nova) */}
              {si === 0 && !envSlug && (
                <div className="mt-4">
                  <p className="text-[10px] tracking-[0.16em] font-light px-3 mb-1.5" style={{ color: 'var(--text-3)' }}>
                    YOUR SYSTEMS
                  </p>
                  <div className="space-y-0.5">
                    {systems.length === 0 ? (
                      <Link href="/systems"
                        className="flex items-center gap-3 px-3 py-2 text-sm transition-all"
                        style={{ color: 'var(--brand)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ opacity: 0.6 }}>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.1" strokeDasharray="3 2"/>
                            <path d="M7.5 5v5M5 7.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <span className="font-light tracking-wide text-xs">Create your first system</span>
                      </Link>
                    ) : (
                      <>
                        {systems.map(sys => {
                          const sysActive = isActive(`/systems/${sys.id}`);
                          return (
                            <Link key={sys.id} href={`/systems/${sys.id}`}
                              className="flex items-center gap-3 px-3 py-2 text-sm transition-all"
                              style={{
                                color: sysActive ? 'var(--text-1)' : 'var(--text-3)',
                                background: sysActive ? 'var(--glass-active)' : 'transparent',
                                borderRadius: 'var(--radius-sm)',
                              }}>
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: sys.color || 'var(--brand)', opacity: sysActive ? 1 : 0.5 }}
                              />
                              <span className="font-light tracking-wide truncate">{sys.name}</span>
                              {sysActive && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: 'var(--brand)', opacity: 0.5 }} />}
                            </Link>
                          );
                        })}
                        <Link href="/systems"
                          className="flex items-center gap-3 px-3 py-1.5 text-sm transition-all"
                          style={{ color: 'var(--text-3)', borderRadius: 'var(--radius-sm)' }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                          </svg>
                          <span className="font-light tracking-wide text-xs">New system</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}

              {!isCollapsed && (
                cs.groups && cs.groups.length > 0 ? (
                  // Grouped render — each NavGroup becomes a small
                  // subheader + its items. Keeps the scent of structure
                  // (build → work → see → connect) so users can skim.
                  <div className="space-y-3">
                    {cs.groups.map(g => (
                      <div key={g.label}>
                        <p
                          className="px-3 mb-1 text-[9px] tracking-[0.14em] font-light uppercase"
                          style={{ color: 'var(--text-3)', opacity: 0.7 }}
                        >
                          {g.label}
                        </p>
                        <div className="space-y-0.5">
                          {g.items.map(item => {
                            const active = isActive(item.href);
                            const isNova = item.accent;
                            const showBadge = item.badge === 'inbox' && inboxUnread > 0;
                            return (
                              <Link key={item.href} href={item.href}
                                className="flex items-center gap-3 px-3 py-1.5 text-sm transition-all"
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
                                {showBadge && (
                                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-light"
                                    style={{ background: 'var(--nova-soft)', color: 'var(--nova)', border: '1px solid rgba(191,159,241,0.2)' }}>
                                    {inboxUnread}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {section.items.map(item => {
                      const active = isActive(item.href);
                      const isNova = item.accent;
                      const showBadge = item.badge === 'inbox' && inboxUnread > 0;
                      return (
                        <Link key={item.href} href={item.href}
                          className="flex items-center gap-3 px-3 py-2 text-sm transition-all"
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
                          {showBadge && (
                            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-light"
                              style={{ background: 'var(--nova-soft)', color: 'var(--nova)', border: '1px solid rgba(191,159,241,0.2)' }}>
                              {inboxUnread}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          );
        })}
      </nav>

      {/* Theme + User */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="flex items-center justify-between mb-3 px-1">
          <ThemeToggle />
          <NotificationBell />
        </div>
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2 mb-3 text-sm transition-all"
          style={{
            color: isActive('/settings') ? 'var(--text-1)' : 'var(--text-3)',
            background: isActive('/settings') ? 'var(--glass-active)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
          }}>
          <span style={{ opacity: isActive('/settings') ? 1 : 0.5 }}>{icons.settings}</span>
          <span className="font-light tracking-wide">Settings</span>
          {isActive('/settings') && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: 'var(--brand)', opacity: 0.5 }} />}
        </Link>
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
    </>
  );
}
