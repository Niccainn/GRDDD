'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import SettingsNav from '@/components/SettingsNav';

type Member = {
  id: string;
  name: string;
  email: string | null;
  avatar?: string | null;
  role: string;
  membershipId: string | null;
  joinedAt: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
};

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  OWNER: { bg: 'rgba(168,120,255,0.12)', color: '#a878ff' },
  ADMIN: { bg: 'rgba(99,149,255,0.12)', color: '#6395ff' },
  CONTRIBUTOR: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' },
  VIEWER: { bg: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' },
};

const ROLES = ['ADMIN', 'CONTRIBUTOR', 'VIEWER'] as const;

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [owner, setOwner] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'CONTRIBUTOR' | 'VIEWER'>('CONTRIBUTOR');
  const [inviting, setInviting] = useState(false);

  const loadTeam = useCallback(async (envId: string) => {
    const [membersRes, invitesRes] = await Promise.all([
      fetch(`/api/environments/${envId}/members`).then(r => r.json()),
      fetch(`/api/environments/${envId}/invite`).then(r => r.json()),
    ]);
    if (membersRes.owner) setOwner({ ...membersRes.owner, role: 'OWNER', membershipId: null, joinedAt: null });
    if (membersRes.members) setMembers(membersRes.members);
    if (invitesRes.invitations) setPending(invitesRes.invitations);
  }, []);

  useEffect(() => {
    fetch('/api/environments')
      .then(r => r.json())
      .then(async (envs: { id: string }[]) => {
        if (!envs?.length) { setLoading(false); return; }
        const envId = envs[0].id;
        setEnvironmentId(envId);
        await loadTeam(envId);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadTeam]);

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast('Please enter a valid email', 'error');
      return;
    }
    if (!environmentId) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/environments/${environmentId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? 'Failed to send invite', 'error'); return; }
      toast(`Invite sent to ${inviteEmail.trim()}`, 'success');
      setInviteEmail('');
      setShowInvite(false);
      await loadTeam(environmentId);
    } catch {
      toast('Network error', 'error');
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(invitationId: string) {
    if (!environmentId) return;
    await fetch(`/api/environments/${environmentId}/invite`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId }),
    });
    setPending(prev => prev.filter(i => i.id !== invitationId));
    toast('Invitation revoked', 'info');
  }

  async function removeMember(membershipId: string) {
    if (!environmentId) return;
    await fetch(`/api/environments/${environmentId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId }),
    });
    setMembers(prev => prev.filter(m => m.membershipId !== membershipId));
    toast('Member removed', 'info');
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-1)',
    fontWeight: 300,
    fontSize: 14,
    outline: 'none',
  } as const;

  const allMembers = [...(owner ? [owner] : []), ...members];

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-3xl mx-auto w-full">
      <SettingsNav />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light mb-1.5" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            Team
          </h1>
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            {allMembers.length} member{allMembers.length !== 1 ? 's' : ''}
            {pending.length > 0 ? ` · ${pending.length} pending` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(v => !v)}
          className="text-sm font-light px-5 py-2.5 rounded-xl transition-all"
          style={{
            background: showInvite ? 'rgba(99,149,255,0.15)' : 'var(--glass)',
            border: `1px solid ${showInvite ? 'rgba(99,149,255,0.3)' : 'var(--glass-border)'}`,
            color: showInvite ? '#6395ff' : 'var(--text-2)',
          }}
        >
          {showInvite ? 'Cancel' : '+ Invite member'}
        </button>
      </div>

      {showInvite && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <h3 className="text-sm font-light mb-4" style={{ color: 'var(--text-1)' }}>
            Invite a team member
          </h3>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-light mb-1.5" style={{ color: 'var(--text-3)' }}>Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-light mb-1.5" style={{ color: 'var(--text-3)' }}>Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as typeof inviteRole)}
                style={{ ...inputStyle, width: 'auto', paddingRight: 28, cursor: 'pointer' }}
              >
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs font-light mb-4" style={{ color: 'var(--text-3)' }}>
            They'll get an email with a link to join this workspace.
          </p>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="text-sm font-light px-5 py-2 rounded-xl disabled:opacity-40"
            style={{ background: 'rgba(99,149,255,0.2)', border: '1px solid rgba(99,149,255,0.3)', color: '#6395ff' }}
          >
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm font-light" style={{ color: 'var(--text-3)' }}>Loading…</div>
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden mb-4" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            {allMembers.map((m, i) => {
              const initials = (m.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const rs = ROLE_STYLES[m.role] ?? ROLE_STYLES.CONTRIBUTOR;
              const isMe = m.id === user?.id;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ borderBottom: i < allMembers.length - 1 ? '1px solid var(--glass-border)' : 'none' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-light flex-shrink-0"
                    style={{ background: 'rgba(200,242,107,0.08)', color: '#C8F26B', border: '1px solid rgba(200,242,107,0.15)' }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                      {m.name ?? 'Unknown'}
                      {isMe && <span className="ml-2 text-xs" style={{ color: 'var(--text-3)' }}>you</span>}
                    </p>
                    <p className="text-xs font-light truncate" style={{ color: 'var(--text-3)' }}>{m.email ?? '—'}</p>
                  </div>
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full tracking-wider uppercase flex-shrink-0"
                    style={{ background: rs.bg, color: rs.color }}
                  >
                    {m.role.toLowerCase()}
                  </span>
                  {m.role !== 'OWNER' && !isMe && m.membershipId && (
                    <button
                      onClick={() => removeMember(m.membershipId!)}
                      className="text-xs font-light px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.15)', color: '#FF6B6B' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {pending.length > 0 && (
            <>
              <h2 className="text-xs font-light tracking-widest uppercase mb-3" style={{ color: 'var(--text-3)' }}>
                Pending invitations
              </h2>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                {pending.map((inv, i) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                    style={{ borderBottom: i < pending.length - 1 ? '1px solid var(--glass-border)' : 'none' }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2">
                        <rect x="1" y="1" width="12" height="10" rx="1.5" />
                        <path d="M1 4l6 4 6-4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light truncate" style={{ color: 'var(--text-2)' }}>{inv.email}</p>
                      <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full tracking-wider uppercase" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}>
                      {inv.role.toLowerCase()}
                    </span>
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      className="text-xs font-light px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
