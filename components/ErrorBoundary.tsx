'use client';
import React, { Component, type ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div
            className="max-w-md w-full rounded-xl p-8 text-center"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--danger-soft)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2
              className="text-xl font-light mb-2"
              style={{ color: 'var(--text-1)' }}
            >
              Something went wrong
            </h2>

            {this.state.error && (
              <p
                className="text-sm font-light mb-6"
                style={{ color: 'var(--text-3)' }}
              >
                {this.state.error.message}
              </p>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-5 py-2 rounded-xl text-sm font-light transition-colors cursor-pointer"
                style={{
                  background: 'var(--danger)',
                  color: '#fff',
                }}
              >
                Try again
              </button>

              <Link
                href="/dashboard"
                className="px-5 py-2 rounded-xl text-sm font-light transition-colors"
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-2)',
                }}
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
