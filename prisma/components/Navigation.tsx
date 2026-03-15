'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };
  
  return (
    <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50 bg-[#121213]/95">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-white/10 rounded border border-white/20 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-[2px] w-4 h-4">
                <div className="bg-white/80 rounded-sm"></div>
                <div className="bg-white/60 rounded-sm"></div>
                <div className="bg-white/40 rounded-sm"></div>
              </div>
            </div>
            <span className="text-lg font-light tracking-wide">GRID</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-8">
            <Link 
              href="/"
              className={`text-sm font-light transition-colors ${
                pathname === '/' 
                  ? 'text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Home
            </Link>
            
            <Link 
              href="/environments"
              className={`text-sm font-light transition-colors ${
                isActive('/environments')
                  ? 'text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Environments
            </Link>
            
            <Link 
              href="/systems"
              className={`text-sm font-light transition-colors ${
                isActive('/systems')
                  ? 'text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Systems
            </Link>
          </nav>

          {/* User Menu Placeholder */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#15AD70] to-[#68D0CA] rounded-full flex items-center justify-center">
              <span className="text-xs font-medium">D</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}