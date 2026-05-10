'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import AuthProvider, { useAuth } from './AuthProvider';
import EnvironmentBrandProvider from './EnvironmentBrand';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import AlertCenter from './AlertCenter';
import NotificationPanel from './NotificationPanel';
import ShortcutHelp from './ShortcutHelp';
import FeatureTour from './FeatureTour';
import { useShortcuts } from '@/lib/hooks/use-shortcuts';
import { useEnsureWorkspace } from '@/lib/hooks/use-ensure-workspace';
import { ToastProvider } from './Toast';
import ErrorBoundary from './ErrorBoundary';
import BottomNav from './BottomNav';
import SkipLink from './SkipLink';
import LegalFooter from './LegalFooter';
import PersistentAtriumBar from './PersistentAtriumBar';
import SimulationModeIndicator from './SimulationModeIndicator';

// Routes that render the PUBLIC layout (no app sidebar, no
// PersistentAtriumBar, no AlertCenter, no notification panel — just
// each page's own marketing/auth chrome).
//
// Auth routes (/sign-in, /sign-up, /access, /welcome) need it because
// the app shell would interfere with the credential capture flow.
//
// Marketing routes (/pricing, /research, /compare, /use-cases, etc.)
// need it because a logged-in user visiting /pricing should see the
// PUBLIC marketing version of the page — not the page-with-app-shell
// hybrid that doubles the nav and bleeds the authenticated context
// into a public surface (where it can be screenshotted, indexed, or
// shared by mistake).
//
// `pathname.startsWith(r)` covers nested routes like /compare/asana,
// /use-cases/marketers, /security/architecture, etc.
const AUTH_ROUTES = [
  // Auth — suppress shell so the credential flow stands alone.
  '/sign-in',
  '/sign-up',
  '/access',
  '/welcome',
  // Marketing — the full app stays behind login.
  '/pricing',
  '/research',
  '/compare',
  '/use-cases',
  '/capabilities',
  '/security',
  '/privacy',
  '/terms',
  '/subprocessors',
  '/blog',
];

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const { helpOpen, setHelpOpen } = useShortcuts();
  const workspaceReady = useEnsureWorkspace();

  // Listen for toggle events from NotificationBell
  useEffect(() => {
    function handleToggle() {
      setNotifPanelOpen(prev => !prev);
    }
    window.addEventListener('toggle-notification-panel', handleToggle);
    return () => window.removeEventListener('toggle-notification-panel', handleToggle);
  }, []);

  // Broadcast unread count changes to the bell
  const handleUnreadCountChange = useCallback((count: number) => {
    window.dispatchEvent(new CustomEvent('notification-unread-update', { detail: { count } }));
  }, []);

  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const isHome = pathname === '/';
  // Detect the session cookie client-side so the chrome renders even
  // when /api/auth/me transiently fails (DB hiccup, 5xx on a cold
  // start). Without this, a logged-in user hitting /dashboard with a
  // flaky backend sees the public-layout branch — no sidebar, no
  // Atrium bar, nothing. Middleware still redirects truly-unauth'd
  // visitors on the next navigation, so the optimistic branch is
  // safe: worst case we render the sidebar for a half-second before
  // a redirect.
  const [hasSessionCookie, setHasSessionCookie] = useState(false);
  useEffect(() => {
    const has = typeof document !== 'undefined'
      && document.cookie.split(';').some(c => c.trim().startsWith('grid_session='));
    setHasSessionCookie(has);
  }, [pathname]);
  const showChrome = (user || hasSessionCookie) && !isAuthRoute && !isHome;

  if (loading && !isAuthRoute && !isHome) {
    return (
      <div className="min-h-screen flex items-center justify-center ambient-bg">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!showChrome) {
    return (
      <div className="min-h-screen ambient-bg flex flex-col">
        <div className="flex-1">{children}</div>
        {!isHome && <LegalFooter />}
      </div>
    );
  }

  return (
    <EnvironmentBrandProvider>
      <div className="min-h-screen ambient-bg">
        <SkipLink />
        <Sidebar />
        <CommandPalette />
        <AlertCenter />
        <NotificationPanel
          open={notifPanelOpen}
          onClose={() => setNotifPanelOpen(false)}
          onUnreadCountChange={handleUnreadCountChange}
        />
        <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
        <FeatureTour />
        <main id="main-content" className="md:pl-[220px] min-h-screen pt-14 md:pt-0 pb-16 md:pb-0">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
        <PersistentAtriumBar />
        <BottomNav />
        {/* Persistent simulation-mode pill — only renders when
            NOVA_TOOLS_LIVE is unset on the server. The trust contract
            requires the user to know on every page whether Atrium's
            actions are real or sandboxed. */}
        <SimulationModeIndicator />
      </div>
    </EnvironmentBrandProvider>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent>{children}</AppContent>
      </ToastProvider>
    </AuthProvider>
  );
}
