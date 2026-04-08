'use client';
import { usePathname } from 'next/navigation';
import AuthProvider, { useAuth } from './AuthProvider';
import EnvironmentBrandProvider from './EnvironmentBrand';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import AlertCenter from './AlertCenter';

const AUTH_ROUTES = ['/sign-in', '/sign-up'];

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const isHome = pathname === '/';
  const showChrome = user && !isAuthRoute;

  if (loading && !isAuthRoute && !isHome) {
    return (
      <div className="min-h-screen flex items-center justify-center ambient-bg">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!showChrome) {
    return <div className="min-h-screen ambient-bg">{children}</div>;
  }

  return (
    <EnvironmentBrandProvider>
      <div className="min-h-screen ambient-bg">
        <Sidebar />
        <CommandPalette />
        <AlertCenter />
        <main className="pl-[220px] min-h-screen">
          {children}
        </main>
      </div>
    </EnvironmentBrandProvider>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}
