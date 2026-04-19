'use client';

import { useState, useRef, useEffect } from 'react';
import { usePresence, type OnlineUser } from '@/lib/hooks/use-presence';

const AVATAR_COLORS = ['#7193ED', '#C8F26B', '#BF9FF1', '#FF9F43', '#4FC1E9'];

function getColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function pageLabel(page: string): string {
  if (page === '/dashboard') return 'Dashboard';
  if (page === '/') return 'Home';
  const segment = page.split('/').filter(Boolean)[0] ?? page;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default function OnlineIndicator() {
  const { onlineUsers, isConnected, connectionCount } = usePresence();
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  if (!isConnected && onlineUsers.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Compact trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all"
        style={{
          background: expanded ? 'var(--glass)' : 'transparent',
          border: `1px solid ${expanded ? 'var(--glass-border)' : 'transparent'}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: isConnected ? '#C8F26B' : 'rgba(255,255,255,0.2)',
            boxShadow: isConnected ? '0 0 6px rgba(200,242,107,0.4)' : 'none',
          }}
        />
        <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          {connectionCount} online
        </span>

        {/* Mini avatar stack preview */}
        <div className="flex items-center ml-1">
          {onlineUsers.slice(0, 3).map((user, i) => (
            <div
              key={user.id}
              className="rounded-full flex items-center justify-center"
              style={{
                width: 16,
                height: 16,
                marginLeft: i > 0 ? -4 : 0,
                background: `${getColor(i)}22`,
                border: `1px solid ${getColor(i)}44`,
                color: getColor(i),
                fontSize: 7,
                fontWeight: 300,
                zIndex: 5 - i,
              }}
            >
              {user.initials}
            </div>
          ))}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="absolute bottom-full left-0 mb-2 w-56 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(12, 12, 18, 0.95)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <p className="text-[10px] tracking-[0.12em] font-light" style={{ color: 'var(--text-3)' }}>
              ONLINE NOW
            </p>
          </div>
          <div className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
            {onlineUsers.map((user, i) => (
              <div
                key={user.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    background: `${getColor(i)}22`,
                    border: `1px solid ${getColor(i)}44`,
                    color: getColor(i),
                    fontSize: 8,
                    fontWeight: 300,
                  }}
                >
                  {user.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>
                    {user.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
                    {pageLabel(user.currentPage)}
                  </p>
                </div>
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: '#C8F26B' }}
                />
              </div>
            ))}
            {onlineUsers.length === 0 && (
              <p className="text-xs font-light text-center py-3" style={{ color: 'var(--text-3)' }}>
                No one else online
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
