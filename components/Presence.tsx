'use client';

import { useState } from 'react';
import { usePresence, type OnlineUser } from '@/lib/hooks/use-presence';

const AVATAR_COLORS = ['#7193ED', '#C8F26B', '#BF9FF1', '#FF9F43', '#4FC1E9'];

function getColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function pageLabel(page: string): string {
  if (page === '/dashboard') return 'Dashboard';
  if (page === '/') return 'Home';
  // Strip leading slash, capitalize first segment
  const segment = page.split('/').filter(Boolean)[0] ?? page;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function Avatar({
  user,
  index,
  size = 28,
  showTooltip = true,
}: {
  user: OnlineUser;
  index: number;
  size?: number;
  showTooltip?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const color = getColor(index);

  return (
    <div
      className="relative"
      style={{ marginLeft: index > 0 ? -8 : 0, zIndex: 10 - index }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-full flex items-center justify-center text-xs font-light select-none"
        style={{
          width: size,
          height: size,
          background: `${color}22`,
          border: `1.5px solid ${color}44`,
          color,
          fontSize: size * 0.36,
        }}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="rounded-full"
            style={{ width: size, height: size }}
          />
        ) : (
          user.initials
        )}
      </div>

      {/* Online pulse dot */}
      <span
        className="absolute rounded-full"
        style={{
          width: 7,
          height: 7,
          bottom: -1,
          right: -1,
          background: '#C8F26B',
          border: '1.5px solid rgba(8, 8, 12, 0.95)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />

      {/* Tooltip */}
      {showTooltip && hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none"
          style={{
            background: 'rgba(20, 20, 28, 0.95)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(20px)',
            zIndex: 50,
          }}
        >
          <p className="text-xs font-light" style={{ color: 'var(--text-1)' }}>
            {user.name}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            {pageLabel(user.currentPage)}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Presence({
  variant = 'full',
}: {
  variant?: 'compact' | 'full';
}) {
  const { onlineUsers, isConnected } = usePresence();
  const maxVisible = 5;
  const visible = onlineUsers.slice(0, maxVisible);
  const overflow = onlineUsers.length - maxVisible;

  if (!isConnected && onlineUsers.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        {visible.map((user, i) => (
          <div
            key={user.id}
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background: getColor(i),
              opacity: 0.7,
            }}
          />
        ))}
        {overflow > 0 && (
          <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
            +{overflow}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Avatar stack */}
      <div className="flex items-center">
        {visible.map((user, i) => (
          <Avatar key={user.id} user={user} index={i} />
        ))}
        {overflow > 0 && (
          <div
            className="rounded-full flex items-center justify-center text-[10px] font-light"
            style={{
              width: 28,
              height: 28,
              marginLeft: -8,
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-3)',
              zIndex: 0,
            }}
          >
            +{overflow}
          </div>
        )}
      </div>

      {/* User list */}
      <div className="space-y-1">
        {onlineUsers.map((user, i) => (
          <div key={user.id} className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: getColor(i) }}
            />
            <span className="text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>
              {user.name}
            </span>
            <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: 'var(--text-3)' }}>
              {pageLabel(user.currentPage)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
