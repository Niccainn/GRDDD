'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import SettingsNav from '@/components/SettingsNav';

type Member = {
  id: string;
  name: string;
  email: string | null;
  type: string;
  role: 'owner' | 'admin' | 'member';
};

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  owner: { bg: 'rgba(168,120,255,0.12)', color: '#a878ff' },
  admin: { bg: 'rgba(99,149,255,0.12)', color: '#6395ff' },
  member: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' },
};

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    // For now, show current user as the sole team member (owner)
    if (user) {
      setMembers([
        {
          id: user.id ?? 'current',
          name: user.name ?? 'You',
          email: user.email ?? null,
          type: 'PERSON',
          role: 'owner',
        },
      ]);
    }
    setLoading(false);
  }, [user]);

  function handleInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast('Please enter a valid email address', 'error');
      return;
    }
    toast('Invitations coming soon', 'info');
    setInviteEmail('');
    setShowInvite(false);
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', color: 'var(--text-3)' }}>
        <div style={{ fontWeight: 300 }}>Loading team...</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-3xl mx-auto w-full">
      <SettingsNav />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 300,
              color: 'var(--text-1)',
              letterSpacing: '-0.02em',
              marginBottom: 6,
            }}
          >
            Team
          </h1>
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 14 }}>
            Manage your team members and roles.
          </p>
        </div>
        {/* Invite is not yet implemented end-to-end — the old button
            showed a "coming soon" toast after a form submission, which
            looked like a successful invite. Until we ship real email
            delivery + team onboarding, the button is honestly disabled. */}
        <button
          disabled
          aria-disabled
          title="Team invites ship after public launch — single-user mode for now"
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: '1px solid var(--glass-border)',
            background: 'transparent',
            color: 'var(--text-3)',
            fontWeight: 400,
            fontSize: 13,
            cursor: 'not-allowed',
            whiteSpace: 'nowrap',
            opacity: 0.5,
          }}
        >
          Invite member · coming soon
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: '1.5rem',
            marginBottom: '1.5rem',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h3 style={{ color: 'var(--text-1)', fontWeight: 300, fontSize: 15, marginBottom: 16 }}>
            Invite a team member
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                color: 'var(--text-2)',
                fontWeight: 300,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Email address
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-deep)',
                color: 'var(--text-1)',
                fontWeight: 300,
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleInvite}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, rgba(99,149,255,0.25), rgba(99,149,255,0.1))',
                color: '#6395ff',
                fontWeight: 400,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Send invite
            </button>
            <button
              onClick={() => { setShowInvite(false); setInviteEmail(''); }}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: '1px solid var(--glass-border)',
                background: 'transparent',
                color: 'var(--text-3)',
                fontWeight: 300,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Member list */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
        }}
      >
        {members.map((m, i) => {
          const initials = m.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          const roleStyle = ROLE_STYLES[m.role] ?? ROLE_STYLES.member;

          return (
            <div
              key={m.id}
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                borderBottom: i < members.length - 1 ? '1px solid var(--glass-border)' : 'none',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 300,
                  background: 'var(--brand-glow)',
                  color: 'var(--brand)',
                  border: '1px solid var(--brand-border)',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'var(--text-1)', fontWeight: 300, fontSize: 14 }}>
                  {m.name}
                </p>
                <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 12 }}>
                  {m.email ?? 'No email'}
                </p>
              </div>

              {/* Role badge */}
              <span
                style={{
                  background: roleStyle.bg,
                  color: roleStyle.color,
                  padding: '3px 12px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {m.role}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
