'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: '→',
};

const COLOR: Record<ToastType, string> = {
  success: '#C8F26B',
  error: '#FF5757',
  info: '#7193ED',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    // Start exit animation after 2.5s
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, 2500);
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '360px' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: 'rgba(12, 12, 18, 0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: `1px solid ${COLOR[t.type]}25`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
              animation: t.exiting ? 'toast-out 0.3s ease forwards' : 'toast-in 0.3s ease forwards',
            }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-medium"
              style={{ background: `${COLOR[t.type]}15`, color: COLOR[t.type] }}
            >
              {ICON[t.type]}
            </span>
            <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
