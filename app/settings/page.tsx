'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import AutonomyConfig from '@/components/AutonomyConfig';
import SettingsNav from '@/components/SettingsNav';

type Profile = {
  id: string;
  name: string;
  email: string | null;
  type: string;
  avatar: string | null;
  createdAt: string;
};

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'profile' | 'autonomy'>('profile');
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/settings/profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setName(data.name ?? '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Fetch first environment for autonomy config
    fetch('/api/environments')
      .then((r) => r.json())
      .then((envs) => {
        if (Array.isArray(envs) && envs.length > 0) setEnvironmentId(envs[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    if (!name.trim()) {
      toast('Name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update');
      }
      const updated = await res.json();
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      toast('Profile updated');
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  }

  const initials =
    (profile?.name ?? user?.name ?? '?')
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  if (loading) {
    return (
      <div style={{ padding: '3rem', color: 'var(--text-3)' }}>
        <div style={{ fontWeight: 300, letterSpacing: '0.02em' }}>Loading profile...</div>
      </div>
    );
  }

  const TABS = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'autonomy' as const, label: 'AI Autonomy' },
  ];

  return (
    <div className="px-4 md:px-10 py-6 md:py-10" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}
        >
          Settings
        </h1>
        <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 14 }}>
          Manage your account and Nova configuration.
        </p>
      </div>

      <SettingsNav />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: tab === t.key ? 400 : 300,
              color: tab === t.key ? 'var(--text-1)' : 'var(--text-3)',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #C8F26B' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'autonomy' && environmentId ? (
        <AutonomyConfig environmentId={environmentId} />
      ) : tab === 'autonomy' ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: 16, border: '1px dashed var(--glass-border)' }}>
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13 }}>
            No environment found. Create an environment first to configure autonomy.
          </p>
        </div>
      ) : (
      <div>

      {/* Profile card */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '2rem',
          marginBottom: '1.5rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 300,
              background: 'var(--brand-glow)',
              color: 'var(--brand)',
              border: '1px solid var(--brand-border)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <p style={{ color: 'var(--text-1)', fontWeight: 300, fontSize: 18 }}>
              {profile?.name ?? '--'}
            </p>
            <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13 }}>
              {profile?.email ?? 'No email'}
            </p>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              background: 'rgba(168,120,255,0.12)',
              color: '#a878ff',
              padding: '3px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {profile?.type ?? 'PERSON'}
          </span>
        </div>

        {/* Name field */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: 'block',
              color: 'var(--text-2)',
              fontWeight: 300,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            Display name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

        {/* Email (read-only) */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              color: 'var(--text-2)',
              fontWeight: 300,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            Email
          </label>
          <input
            type="text"
            value={profile?.email ?? ''}
            disabled
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.02)',
              color: 'var(--text-3)',
              fontWeight: 300,
              fontSize: 14,
              outline: 'none',
              cursor: 'not-allowed',
            }}
          />
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 11, marginTop: 4, opacity: 0.6 }}>
            Email cannot be changed from here.
          </p>
        </div>

        {/* Member since */}
        {profile?.createdAt && (
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 12, marginBottom: 20 }}>
            Member since {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || name === profile?.name}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            border: 'none',
            background:
              saving || name === profile?.name
                ? 'rgba(255,255,255,0.04)'
                : 'linear-gradient(135deg, rgba(99,149,255,0.25), rgba(99,149,255,0.1))',
            color: saving || name === profile?.name ? 'var(--text-3)' : '#6395ff',
            fontWeight: 400,
            fontSize: 14,
            cursor: saving || name === profile?.name ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving...' : 'Update profile'}
        </button>
      </div>

      {/* Danger zone */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid rgba(255,80,60,0.15)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h3 style={{ color: '#ff5c46', fontWeight: 300, fontSize: 16, marginBottom: 8 }}>
          Danger zone
        </h3>
        <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13, marginBottom: 16 }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {!deleteConfirm && !deleting ? (
          <button
            onClick={() => setDeleteConfirm('pending')}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: '1px solid rgba(255,80,60,0.3)',
              background: 'rgba(255,80,60,0.08)',
              color: '#ff5c46',
              fontWeight: 300,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Delete my account
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Confirmation phrase binds to the user's email so a
                session hijacker can't wipe an account without also
                knowing whose it is. Matches the server contract at
                /api/account/delete which expects {confirm: "DELETE <email>"}. */}
            <p style={{ color: '#ff5c46', fontWeight: 300, fontSize: 13 }}>
              Type <strong>DELETE {profile?.email ?? 'your-email'}</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirm === 'pending' ? '' : deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={`DELETE ${profile?.email ?? 'your-email'}`}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,80,60,0.2)',
                background: 'rgba(255,80,60,0.04)',
                color: '#ff5c46',
                fontWeight: 300,
                fontSize: 13,
                width: 320,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={
                  !profile?.email ||
                  deleteConfirm !== `DELETE ${profile.email}` ||
                  deleting
                }
                onClick={async () => {
                  if (!profile?.email) return;
                  setDeleting(true);
                  try {
                    const res = await fetch('/api/account/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirm: `DELETE ${profile.email}` }),
                    });
                    if (res.ok) {
                      window.location.href = '/';
                    } else {
                      const data = await res.json().catch(() => ({}));
                      toast(data.error || 'Failed to delete account', 'error');
                      setDeleting(false);
                    }
                  } catch {
                    toast('Failed to delete account', 'error');
                    setDeleting(false);
                  }
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,80,60,0.4)',
                  background:
                    profile?.email && deleteConfirm === `DELETE ${profile.email}`
                      ? 'rgba(255,80,60,0.15)'
                      : 'rgba(255,80,60,0.04)',
                  color:
                    profile?.email && deleteConfirm === `DELETE ${profile.email}`
                      ? '#ff5c46'
                      : 'rgba(255,80,60,0.3)',
                  fontWeight: 300,
                  fontSize: 13,
                  cursor:
                    profile?.email && deleteConfirm === `DELETE ${profile.email}`
                      ? 'pointer'
                      : 'not-allowed',
                }}
              >
                {deleting ? 'Deleting...' : 'Confirm deletion'}
              </button>
              <button
                onClick={() => { setDeleteConfirm(''); setDeleting(false); }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
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
      </div>
      </div>
      )}
    </div>
  );
}
