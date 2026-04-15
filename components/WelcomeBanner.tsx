'use client';

import { useState, useEffect } from 'react';

type WelcomeBannerProps = {
  onPromptClick: (query: string) => void;
};

const STARTER_PROMPTS = [
  {
    label: 'What can you do for me?',
    query: 'Give me a quick overview of what you can do — what kind of things can I ask you to help with?',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Draft something on-brand',
    query: 'Draft a short social media post introducing our company — use my brand voice and tone.',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 20h9" strokeLinecap="round" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Set up my first automation',
    query: "Help me create my first workflow — something simple like a weekly review or content pipeline. Walk me through it.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function WelcomeBanner({ onPromptClick }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const justOnboarded = localStorage.getItem('grid:just-onboarded');
      if (justOnboarded === 'true') {
        setVisible(true);
        // Clear the flag so it only shows once
        localStorage.removeItem('grid:just-onboarded');
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div
      className="rounded-2xl p-6 mb-6 animate-fade-in relative"
      style={{
        background: 'linear-gradient(135deg, rgba(191,159,241,0.08), rgba(113,147,237,0.06))',
        border: '1px solid rgba(191,159,241,0.15)',
      }}
    >
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full transition-all hover:bg-white/10"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1l8 8M9 1l-8 8" strokeLinecap="round" />
        </svg>
      </button>

      {/* Nova icon + greeting */}
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #BF9FF1, #7193ED)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Your workspace is ready.
          </h2>
          <p className="text-xs leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            I&apos;m Nova — your AI operations layer. I understand your business structure, remember context across conversations, and can take actions on your behalf. I already know your brand voice. Here are a few things to try:
          </p>

          {/* Starter prompts */}
          <div className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => {
                  setDismissed(true);
                  onPromptClick(prompt.query);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-light transition-all hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <span style={{ color: 'rgba(191,159,241,0.7)' }}>{prompt.icon}</span>
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
