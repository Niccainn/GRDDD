'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchObject, safeFetch } from '@/lib/api/safe-fetch';

type Course = {
  id: string;
  title: string;
  summary: string | null;
  skillTag: string | null;
  published: boolean;
  totalLessons: number;
  totalModules: number;
  environment: { id: string; name: string; slug: string; color: string | null } | null;
  author: { id: string; name: string };
};
type Environment = { id: string; name: string; slug: string; color: string | null };

export default function AuthorIndexPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    fetchObject<{ courses?: Course[] }>('/api/courses')
      .then(d => setCourses(Array.isArray(d?.courses) ? d!.courses! : []))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    safeFetch<Environment[]>('/api/environments', undefined, {
      fallback: [],
      validate: d => {
        if (Array.isArray(d)) return d as Environment[];
        const inner = (d as { environments?: unknown })?.environments;
        return Array.isArray(inner) ? (inner as Environment[]) : null;
      },
    }).then(setEnvironments);
    fetchObject<{ identity?: { id?: string }; id?: string }>('/api/auth/me')
      .then(d => setMe(d?.identity?.id ?? d?.id ?? null));
  }, [load]);

  const mine = courses.filter(c => me && c.author.id === me);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/learn/courses" className="text-[10px] tracking-wider uppercase font-light hover:text-white/70" style={{ color: 'var(--text-3)' }}>
            ← Courses
          </Link>
          <h1 className="text-2xl font-extralight tracking-tight mt-1" style={{ letterSpacing: '-0.02em' }}>
            Author
          </h1>
          <p className="text-sm font-light mt-1" style={{ color: 'var(--text-3)' }}>
            Build courses that advance real skill nodes. Attach a skill tag so completion promotes the learner in SkillSpace.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
          style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
          New course
        </button>
      </div>

      {!loaded && <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />}
      {loaded && mine.length === 0 && (
        <div className="glass-deep rounded-xl p-8 text-center">
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            You haven't authored any courses yet.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {mine.map(c => (
          <Link key={c.id} href={`/learn/author/${c.id}`}
            className="glass-deep rounded-xl p-4 block transition-colors hover:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {!c.published && <span className="text-[10px] font-light px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,215,110,0.08)', border: '1px solid rgba(245,215,110,0.2)', color: '#F5D76E' }}>Draft</span>}
                  {c.published && <span className="text-[10px] font-light px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.2)', color: '#C8F26B' }}>Published</span>}
                  {c.environment && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.environment.color || 'var(--text-3)' }} />
                      <span className="text-[10px] tracking-wider uppercase font-light" style={{ color: 'var(--text-3)' }}>{c.environment.name}</span>
                    </span>
                  )}
                </div>
                <h2 className="text-base font-light mt-1" style={{ color: 'var(--text-1)' }}>{c.title}</h2>
                <p className="text-[10px] font-light mt-1" style={{ color: 'var(--text-3)' }}>
                  {c.totalModules} module{c.totalModules === 1 ? '' : 's'} · {c.totalLessons} lesson{c.totalLessons === 1 ? '' : 's'}
                  {c.skillTag && ` · skill ${c.skillTag}`}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {showCreate && (
        <CreateCourseModal
          environments={environments}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateCourseModal({ environments, onClose, onCreated }: { environments: Environment[]; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [skillTag, setSkillTag] = useState('');
  const [environmentId, setEnvironmentId] = useState(environments[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!title.trim()) { setError('Title required'); return; }
    if (!environmentId) { setError('Pick an environment'); return; }
    setSubmitting(true);
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary, skillTag: skillTag || undefined, environmentId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? 'Failed');
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="glass-deep rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-extralight mb-4" style={{ letterSpacing: '-0.02em' }}>New course</h2>
        <div className="space-y-3">
          <LabeledInput label="Title" value={title} onChange={setTitle} />
          <LabeledInput label="Summary (optional)" value={summary} onChange={setSummary} />
          <LabeledInput label="Skill tag (optional — advances this skill on completion)" value={skillTag} onChange={setSkillTag} />
          <div>
            <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Environment</label>
            <select value={environmentId} onChange={e => setEnvironmentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}>
              {environments.length === 0 && <option value="">No environments available</option>}
              {environments.map(env => <option key={env.id} value={env.id} style={{ background: '#0a0a0f' }}>{env.name}</option>)}
            </select>
          </div>
          {error && <p className="text-xs" style={{ color: '#FF8C69' }}>{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-xs font-light px-3 py-1.5 rounded-full" style={{ color: 'var(--text-3)' }}>Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="text-xs font-light px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
    </div>
  );
}
