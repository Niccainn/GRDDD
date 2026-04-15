'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Form = {
  id: string;
  name: string;
  description: string;
  slug: string;
  isPublished: boolean;
  environmentName: string;
  environmentId: string;
  submissions: number;
  createdAt: string;
};

type Environment = { id: string; name: string };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEnvId, setCreateEnvId] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/forms').then((r) => r.json()),
      fetch('/api/environments').then((r) => r.json()).catch(() => []),
    ]).then(([f, envs]) => {
      setForms(f);
      setEnvironments(envs);
      if (envs.length > 0) setCreateEnvId(envs[0].id);
      setLoaded(true);
    });
  }, []);

  const filtered = forms.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim() || !createEnvId) return;
    setCreating(true);
    const res = await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName.trim(), environmentId: createEnvId }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/forms/${data.id}`);
    }
    setCreating(false);
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Forms</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {loaded
              ? `${filtered.length} form${filtered.length !== 1 ? 's' : ''}`
              : 'Loading...'}
          </p>
        </div>
        {environments.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs font-light px-3 py-2 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            + Create form
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-5 rounded-xl flex items-end gap-3"
          style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex-1">
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
              Name
            </label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Form name"
              className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'white',
              }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
              Environment
            </label>
            <select
              value={createEnvId}
              onChange={(e) => setCreateEnvId(e.target.value)}
              className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'rgba(255,255,255,0.7)',
                minWidth: '160px',
              }}
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id} style={{ background: '#111' }}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!createName.trim() || creating}
            className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: 'rgba(21,173,112,0.1)',
              border: '1px solid rgba(21,173,112,0.25)',
              color: '#15AD70',
            }}
          >
            {creating ? '...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="text-xs font-light"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Search */}
      {loaded && forms.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2"
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
            >
              <circle cx="5" cy="5" r="3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
              <path
                d="M8 8l2.5 2.5"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms..."
              className="text-sm font-light pl-8 pr-4 py-2 rounded-lg focus:outline-none"
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                color: 'white',
                width: '200px',
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {!loaded ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-xl animate-pulse"
              style={{ background: 'var(--glass)' }}
            />
          ))}
        </div>
      ) : environments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-xl"
          style={{ border: '1px dashed var(--glass-border)' }}
        >
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
            Create an environment first
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            Forms live inside environments. Create one to get started.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-xl"
          style={{ border: '1px dashed var(--glass-border)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="3"
                y="2"
                width="12"
                height="14"
                rx="2"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.2"
              />
              <path
                d="M6 6h6M6 9h6M6 12h3"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
            {forms.length === 0 ? 'Create your first form' : 'No matches'}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            {forms.length === 0
              ? 'Build public intake forms that feed data into your systems'
              : 'Try adjusting your search'}
          </p>
          {forms.length === 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-light px-4 py-2 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              + Create form
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="group flex flex-col rounded-2xl transition-all"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
            >
              <button
                onClick={() => router.push(`/forms/${f.id}`)}
                className="flex flex-col p-5 flex-1 text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="text-[10px] font-light px-2 py-0.5 rounded-full"
                    style={{
                      background: f.isPublished
                        ? 'rgba(21,173,112,0.1)'
                        : 'rgba(255,255,255,0.05)',
                      border: f.isPublished
                        ? '1px solid rgba(21,173,112,0.2)'
                        : '1px solid rgba(255,255,255,0.08)',
                      color: f.isPublished ? '#15AD70' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {f.isPublished ? 'published' : 'draft'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {f.submissions} submission{f.submissions !== 1 ? 's' : ''}
                  </span>
                </div>
                <p
                  className="text-sm font-light mb-1 group-hover:text-white transition-colors"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  {f.name}
                </p>
                {f.description && (
                  <p
                    className="text-xs leading-relaxed line-clamp-2"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {f.description}
                  </p>
                )}
              </button>
              <div
                className="flex items-center justify-between px-5 pb-4 pt-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                  {f.environmentName}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyLink(f.slug);
                    }}
                    className="text-xs font-light transition-colors"
                    style={{ color: copied === f.slug ? '#15AD70' : 'rgba(255,255,255,0.25)' }}
                  >
                    {copied === f.slug ? 'Copied' : 'Share'}
                  </button>
                  <span
                    className="text-xs whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    {timeAgo(f.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
