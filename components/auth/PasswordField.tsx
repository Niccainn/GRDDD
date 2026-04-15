/**
 * Password input with show/hide eye + optional caps-lock warning.
 * Accessibility: the eye button is a real <button type="button"> so it
 * doesn't submit the parent form when clicked.
 */
'use client';
import { useState } from 'react';

export default function PasswordField({
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  minLength,
  required = true,
  id = 'password',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  id?: string;
}) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyUp={e => setCaps(e.getModifierState && e.getModifierState('CapsLock'))}
        onBlur={() => setCaps(false)}
        className="glass-input w-full px-4 py-3 pr-11 text-sm"
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-opacity"
        style={{ color: 'var(--text-3)', opacity: 0.7 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
      >
        {show ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M9.88 5.09A10.4 10.4 0 0112 5c6 0 9.5 5.5 10 7a12 12 0 01-3.13 4.03M6.6 6.62C3.66 8.53 2 11.8 2 12c.5 1.5 4 7 10 7 1.74 0 3.3-.4 4.66-1.07" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      {caps && (
        <p className="text-[10px] mt-1.5 font-light tracking-wide uppercase" style={{ color: 'var(--warning, #F7C700)' }}>
          Caps lock is on
        </p>
      )}
    </div>
  );
}
