'use client';
import { useState } from 'react';

type Integration = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  connected: boolean;
};

const CATEGORIES = ['All', 'Social', 'Communication', 'Meetings', 'Documents', 'Design', 'Development', 'CRM', 'Analytics', 'Automation'];

const INTEGRATIONS: Integration[] = [
  {
    id: 'slack', name: 'Slack', description: 'Route signals from channels', category: 'Communication', connected: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M14 20.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5h-1.5z"/><path d="M10 9.5C10 10.33 9.33 11 8.5 11h-5C2.67 11 2 10.33 2 9.5S2.67 8 3.5 8h5c.83 0 1.5.67 1.5 1.5z"/></svg>,
  },
  {
    id: 'notion', name: 'Notion', description: 'Sync pages and databases', category: 'Documents', connected: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M4 4.5A2.5 2.5 0 016.5 2H18l2 2v15.5a2.5 2.5 0 01-2.5 2.5H6.5A2.5 2.5 0 014 19.5z"/><path d="M8 7h8M8 11h6M8 15h4"/></svg>,
  },
  {
    id: 'figma', name: 'Figma', description: 'Design system bridge', category: 'Design', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="2.5"/><path d="M6.5 2h5v8h-5a4 4 0 010-8z"/><path d="M12.5 2h5a4 4 0 010 8h-5z"/><path d="M6.5 10h5v4a4 4 0 01-5 0z"/></svg>,
  },
  {
    id: 'github', name: 'GitHub', description: 'Repos and issue tracking', category: 'Development', connected: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.66-.22.66-.48v-1.69c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.16.58.67.48A10.01 10.01 0 0022 12c0-5.52-4.48-10-10-10z"/></svg>,
  },
  {
    id: 'linear', name: 'Linear', description: 'Issue and project sync', category: 'Development', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg>,
  },
  {
    id: 'zoom', name: 'Zoom', description: 'Meeting intelligence', category: 'Meetings', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 10l5-3v10l-5-3z"/></svg>,
  },
  {
    id: 'hubspot', name: 'HubSpot', description: 'CRM pipeline signals', category: 'CRM', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><path d="M12 6.5v2M12 15.5v2M6.5 12h2M15.5 12h2"/></svg>,
  },
  {
    id: 'google-analytics', name: 'Analytics', description: 'Web performance data', category: 'Analytics', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 20h18M6 16v4M10 12v8M14 8v12M18 4v16"/></svg>,
  },
  {
    id: 'zapier', name: 'Zapier', description: 'Workflow automation bridge', category: 'Automation', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>,
  },
  {
    id: 'gmail', name: 'Gmail', description: 'Email signal routing', category: 'Communication', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/></svg>,
  },
  {
    id: 'drive', name: 'Google Drive', description: 'Document access', category: 'Documents', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M8 2l8 14H4L12 2z"/><path d="M16 16l4-7H8"/><path d="M8 16l-4-7h12"/></svg>,
  },
  {
    id: 'stripe', name: 'Stripe', description: 'Payment signals', category: 'CRM', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M13 8c-1.5 0-3 .5-3 2s1.5 2 3 2 3 .5 3 2-1.5 2-3 2M12 6v2M12 16v2"/></svg>,
  },
  {
    id: 'instagram', name: 'Instagram', description: 'Content publishing & analytics', category: 'Social', connected: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>,
  },
  {
    id: 'facebook', name: 'Facebook', description: 'Page management & ads', category: 'Social', connected: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>,
  },
  {
    id: 'x-twitter', name: 'X / Twitter', description: 'Social posting & monitoring', category: 'Social', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-6.8-8.4L19.5 4h-2L12.4 10 8 4H4z"/></svg>,
  },
  {
    id: 'linkedin', name: 'LinkedIn', description: 'Professional content & leads', category: 'Social', connected: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
  },
];

export default function IntegrationsPage() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = INTEGRATIONS.filter(i => {
    if (category !== 'All' && i.category !== category) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="px-12 py-12 min-h-screen">
      <div className="max-w-5xl">
        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Integrations</h1>
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            {INTEGRATIONS.filter(i => i.connected).length} connected · {INTEGRATIONS.length} available
          </p>
        </div>

        {/* Search + Categories */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input px-4 py-2.5 text-sm w-64"
            placeholder="Search integrations..."
          />
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="chrome-pill px-3 py-1.5 text-xs font-light whitespace-nowrap"
                style={{
                  color: category === cat ? 'var(--text-1)' : 'var(--text-3)',
                  background: category === cat ? 'var(--glass-active)' : undefined,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {filtered.map(integration => (
            <div
              key={integration.id}
              className="chrome p-6 flex flex-col items-center text-center group cursor-pointer"
            >
              {/* Icon — chrome squircle */}
              <div
                className="chrome-squircle w-16 h-16 flex items-center justify-center mb-4"
                style={{ color: 'var(--text-2)' }}
              >
                <div className="w-7 h-7">
                  {integration.icon}
                </div>
              </div>

              {/* Name */}
              <h3 className="text-sm font-light mb-1 group-hover:text-[var(--text-1)] transition-colors"
                style={{ color: 'var(--text-2)' }}>
                {integration.name}
              </h3>

              {/* Description */}
              <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
                {integration.description}
              </p>

              {/* Connect button */}
              {integration.connected ? (
                <div
                  className="chrome-pill px-5 py-2 text-xs font-light mt-auto flex items-center gap-2"
                  style={{
                    color: '#34d399',
                    background: 'rgba(52, 211, 153, 0.08)',
                    borderColor: 'rgba(52, 211, 153, 0.15)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Connected
                </div>
              ) : (
                <button
                  className="chrome-pill px-5 py-2 text-xs font-light mt-auto"
                  style={{ color: 'var(--text-2)' }}
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Custom integration */}
        <div className="mt-8 glass-panel p-8 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="chrome-circle w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-3)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <h3 className="text-sm font-light mb-1">Custom Integration</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            Use the GRID API to build your own integration
          </p>
          <button className="chrome-pill px-5 py-2 text-xs font-light" style={{ color: 'var(--text-2)' }}>
            View API docs
          </button>
        </div>
      </div>
    </div>
  );
}
