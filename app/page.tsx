'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center ambient-bg">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col ambient-bg relative overflow-hidden">
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(ellipse, #15AD70, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <svg width="24" height="31" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.35 }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="url(#hg)" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="url(#hg)" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="url(#hg)" strokeWidth="2"/>
            <defs><linearGradient id="hg" x1="0" y1="0" x2="79" y2="100"><stop offset="0%" stopColor="#15AD70"/><stop offset="100%" stopColor="#7193ED"/></linearGradient></defs>
          </svg>
          <span className="text-sm font-light tracking-[0.15em]" style={{ color: 'var(--text-2)' }}>GRID</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-xs font-light px-5 py-2.5 rounded-full transition-all"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Sign in
          </Link>
        </div>
      </nav>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Brand mark */}
        <div className="mb-10">
          <svg width="56" height="72" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.15 }}>
            <rect x="2" y="2" width="75" height="96" rx="10" stroke="white" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2"/>
          </svg>
        </div>

        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight text-center mb-3" style={{ color: 'var(--text-1)' }}>
          Welcome to GRID
        </h1>
        <p className="text-sm font-light text-center max-w-md mb-10" style={{ color: 'var(--text-3)' }}>
          The operating system for organizational intelligence. Structure your work, automate operations, and let AI reason across everything.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <Link href="/sign-in" className="w-full py-3.5 text-sm font-light rounded-full text-center transition-all"
            style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}>
            Sign in
          </Link>
          <Link href="/sign-up" className="w-full py-3.5 text-sm font-light rounded-full text-center transition-all"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Create workspace
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 md:px-10 py-5 relative z-10">
        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)', opacity: 0.4 }}>
          GRID Systems Inc.
        </span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)', opacity: 0.4 }}>Privacy</Link>
          <Link href="/terms" className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)', opacity: 0.4 }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
