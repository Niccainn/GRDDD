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
import PersistentNovaBar from './PersistentNovaBar';

const AUTH_ROUTES = ['/sign-in', '/sign-up', '/access', '/welcome'];

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
  // Nova bar, nothing. Middleware still redirects truly-unauth'd
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
        <PersistentNovaBar />
        <BottomNav />
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
