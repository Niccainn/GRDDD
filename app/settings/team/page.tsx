'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Member = {
  id: string;
  name: string;
  email: string | null;
  type: string;
  avatar: string | null;
  createdAt: string;
  memberships: { role: string; environmentId: string; environmentName: string; environmentColor: string | null }[];
};

type Environment = { id: string; name: string; color: string | null };

const ROLES = ['ADMIN', 'CONTRIBUTOR', 'VIEWER'];
const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#BF9FF1',
  CONTRIBUTOR: '#15AD70',
  VIEWER: 'rgba(255,255,255,0.3)',
};
const TYPE_LABEL: Record<string, string> = {
  PERSON: 'Person', TEAM: 'Team', AGENT: 'Agent', CLIENT: 'Client',
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', type: 'PERSON', environmentId: '', role: 'CONTRIBUTOR' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/team').then(r => r.json()),
      fetch('/api/environments').then(r => r.json()),
    ]).then(([team, envs]) => {
      setMembers(team);
      setEnvironments(envs);
      if (envs.length > 0) setForm(f => ({ ...f, environmentId: envs[0].id }));
      setLoaded(true);
    });
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await fetch('/api/team').then(r => r.json());
      setMembers(updated);
      setShowInvite(false);
      setForm({ name: '', email: '', type: 'PERSON', environmentId: environments[0]?.id ?? '', role: 'CONTRIBUTOR' });
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to add member');
    }
    setSaving(false);
  }

  async function handleRemove(id: string) {
    await fetch(`/api/team?id=${id}`, { method: 'DELETE' });
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="px-10 py-10 min-h-screen max-w-3xl">
      {/* Back */}
      <Link href="/settings" className="text-xs font-light mb-8 inline-flex items-center gap-1.5 transition-colors"
        style={{ color: 'var(--text-3)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Settings
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Team</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {loaded ? `${members.length} member${members.length !== 1 ? 's' : ''}` : 'Loading···'}
          </p>
        </div>
        <button onClick={() => setShowInvite(v => !v)}
          className="text-xs font-light px-3 py-2 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
          + Add member
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="mb-8 p-5 rounded-xl space-y-4"
          style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>ADD MEMBER</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Sarah Chen"
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="sarah@company.com" type="email"
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}>
                {['PERSON', 'TEAM', 'AGENT', 'CLIENT'].map(t => (
                  <option key={t} value={t} style={{ background: '#111' }}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}>
                {ROLES.map(r => <option key={r} value={r} style={{ background: '#111' }}>{r.toLowerCase()}</option>)}
              </select>
            </div>
            {environments.length > 0 && (
              <div className="col-span-2">
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Add to environment</label>
                <select value={form.environmentId} onChange={e => setForm(f => ({ ...f, environmentId: e.target.value }))}
                  className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}>
                  <option value="" style={{ background: '#111' }}>No environment</option>
                  {environments.map(e => <option key={e.id} value={e.id} style={{ background: '#111' }}>{e.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {error && (
            <p className="text-xs" style={{ color: '#FF6B6B' }}>{error}</p>
          )}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={!form.name || !form.email || saving}
              className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.25)', color: '#15AD70' }}>
              {saving ? '···' : 'Add member'}
            </button>
            <button type="button" onClick={() => { setShowInvite(false); setError(''); }}
              className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Member list */}
      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const isDemoUser = member.email === 'demo@grid.app';
            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4 rounded-xl"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-light flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>{member.name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>
                      {TYPE_LABEL[member.type] ?? member.type}
                    </span>
                    {isDemoUser && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(21,173,112,0.08)', color: '#15AD70', border: '1px solid rgba(21,173,112,0.15)' }}>
                        you
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{member.email}</p>
                    {member.memberships.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {member.memberships.map(m => (
                          <span key={m.environmentId} className="flex items-center gap-1 text-xs"
                            style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {m.environmentColor && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.environmentColor }} />}
                            {m.environmentName}
                            <span style={{ color: ROLE_COLOR[m.role] ?? 'rgba(255,255,255,0.2)' }}>·{m.role.toLowerCase()}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove */}
                {!isDemoUser && (
                  <button onClick={() => handleRemove(member.id)}
                    className="text-xs font-light px-2 py-1 rounded transition-all flex-shrink-0"
                    style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
