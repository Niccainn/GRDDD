'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SystemTemplate, TemplateCategory } from '@/lib/templates/registry';
import { CATEGORY_META } from '@/lib/templates/registry';

type InstallState = { templateId: string; status: 'idle' | 'picking' | 'installing' | 'done'; error?: string };

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [environments, setEnvironments] = useState<{ id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [install, setInstall] = useState<InstallState>({ templateId: '', status: 'idle' });

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(d => setTemplates(d.templates ?? [])).catch(() => {});
    fetch('/api/environments').then(r => r.json()).then(d => setEnvironments(d)).catch(() => {});
  }, []);

  const filtered = templates.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q));
    }
    return true;
  });

  async function handleInstall(envId: string) {
    setInstall(prev => ({ ...prev, status: 'installing' }));
    try {
      const res = await fetch('/api/templates/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: install.templateId, environmentId: envId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInstall(prev => ({ ...prev, status: 'idle', error: data.error }));
        return;
      }
      setInstall({ templateId: '', status: 'done' });
      setTimeout(() => {
        setInstall({ templateId: '', status: 'idle' });
        router.push(`/systems`);
      }, 1200);
    } catch {
      setInstall(prev => ({ ...prev, status: 'idle', error: 'Connection error' }));
    }
  }

  const categories = Object.entries(CATEGORY_META) as [TemplateCategory, { label: string; icon: string; color: string }][];
  const difficultyColor = { starter: '#C8F26B', intermediate: '#F7C700', advanced: '#FF6B6B' };

  return (
    <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-light mb-1" style={{ color: 'var(--text-1)' }}>Templates</h1>
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            Pre-built systems with workflows — install in seconds, customize for your business.
          </p>
        </div>

        {/* Search + category filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2">
              <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l3.5 3.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2.5 text-sm font-light rounded-xl focus:outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
          </div>

          <button
            onClick={() => setActiveCategory('all')}
            className="px-3.5 py-2 text-xs font-light rounded-full transition-all"
            style={{
              background: activeCategory === 'all' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activeCategory === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--glass-border)'}`,
              color: activeCategory === 'all' ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            All
          </button>
          {categories.map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className="px-3.5 py-2 text-xs font-light rounded-full transition-all"
              style={{
                background: activeCategory === key ? `${meta.color}14` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeCategory === key ? `${meta.color}40` : 'var(--glass-border)'}`,
                color: activeCategory === key ? meta.color : 'var(--text-3)',
              }}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const catMeta = CATEGORY_META[t.category];
            const isInstalling = install.templateId === t.id && install.status === 'installing';
            return (
              <div
                key={t.id}
                className="rounded-2xl p-5 transition-all group"
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: `${t.color}14`, border: `1px solid ${t.color}26` }}
                  >
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>{t.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: catMeta.color }}>{catMeta.label}</span>
                      <span className="w-0.5 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                      <span className="text-[10px]" style={{ color: difficultyColor[t.difficulty] }}>{t.difficulty}</span>
                      <span className="w-0.5 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{t.estimatedSetup}</span>
                    </div>
                  </div>
                </div>

                {/* Pitch */}
                <p className="text-xs font-light leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
                  {t.pitch}
                </p>

                {/* Workflows preview */}
                <div className="space-y-1.5 mb-4">
                  {t.workflows.map(wf => (
                    <div key={wf.name} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="5" cy="5" r="3" stroke={t.color} strokeWidth="0.8" />
                      </svg>
                      <span className="truncate">{wf.name}</span>
                      <span className="ml-auto text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>{wf.stages.length} stages</span>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {t.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Install button */}
                {install.templateId === t.id && install.status === 'picking' ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-light mb-1.5" style={{ color: 'var(--text-3)' }}>Install to:</p>
                    {environments.map(env => (
                      <button
                        key={env.id}
                        onClick={() => handleInstall(env.id)}
                        className="w-full text-left px-3 py-2 text-xs font-light rounded-lg transition-all hover:scale-[1.01]"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-2)' }}
                      >
                        {env.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setInstall({ templateId: '', status: 'idle' })}
                      className="w-full text-center text-[11px] py-1.5 font-light rounded-lg"
                      style={{ color: 'var(--text-3)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (environments.length === 1) {
                        setInstall({ templateId: t.id, status: 'installing' });
                        handleInstall(environments[0].id);
                      } else {
                        setInstall({ templateId: t.id, status: 'picking' });
                      }
                    }}
                    disabled={isInstalling || install.status === 'done'}
                    className="w-full py-2.5 text-xs font-light rounded-xl transition-all"
                    style={{
                      background: isInstalling ? 'rgba(255,255,255,0.04)' : `${t.color}14`,
                      border: `1px solid ${isInstalling ? 'rgba(255,255,255,0.08)' : `${t.color}30`}`,
                      color: isInstalling ? 'var(--text-3)' : t.color,
                      opacity: isInstalling ? 0.6 : 1,
                    }}
                  >
                    {isInstalling ? 'Installing...' : install.status === 'done' && install.templateId === t.id ? 'Installed' : 'Install'}
                  </button>
                )}

                {install.templateId === t.id && install.error && (
                  <p className="text-[11px] mt-2 font-light" style={{ color: 'var(--danger)' }}>{install.error}</p>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && templates.length > 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>No templates match your search.</p>
          </div>
        )}

        {templates.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ border: '1px dashed var(--glass-border)' }}
          >
            <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
              No templates yet
            </p>
            <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
              Save any workflow as a template to reuse it across systems.
            </p>
          </div>
        )}

        {/* Success toast */}
        {install.status === 'done' && (
          <div
            className="fixed bottom-8 right-8 px-5 py-3 rounded-xl text-sm font-light animate-fade-in"
            style={{ background: 'rgba(200,242,107,0.12)', border: '1px solid rgba(200,242,107,0.3)', color: '#C8F26B' }}
          >
            Template installed — redirecting to systems...
          </div>
        )}
    </div>
  );
}
