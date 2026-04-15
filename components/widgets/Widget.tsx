'use client';

import { ReactNode } from 'react';

type WidgetProps = {
  title: string;
  subtitle?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  children: ReactNode;
  className?: string;
  span?: 1 | 2; // grid column span
};

export default function Widget({ title, subtitle, action, children, className = '', span = 1 }: WidgetProps) {
  return (
    <div
      className={`glass-deep p-3 md:p-5 flex flex-col animate-fade-in ${span === 2 ? 'md:col-span-2' : ''} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.12em] font-light" style={{ color: 'var(--text-3)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          action.href ? (
            <a href={action.href} className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)' }}>
              {action.label}
            </a>
          ) : (
            <button onClick={action.onClick} className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)' }}>
              {action.label}
            </button>
          )
        )}
      </div>
      {/* Content */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
