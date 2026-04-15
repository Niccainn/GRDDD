'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Reveal key (shown once)
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Confirm revoke
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      setKeys(data);
    } catch {
      toast('Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      toast('Key name is required', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create key');
      }
      const data = await res.json();
      setRevealedKey(data.key);
      setNewName('');
      setShowCreate(false);
      toast('API key created');
      fetchKeys();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create key', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke');
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setConfirmDelete(null);
      toast('API key revoked');
    } catch {
      toast('Failed to revoke key', 'error');
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', color: 'var(--text-3)' }}>
        <div style={{ fontWeight: 300 }}>Loading API keys...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 720, margin: '0 auto' }}>
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
            API Keys
          </h1>
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 14 }}>
            Create and manage API keys for programmatic access.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, rgba(99,149,255,0.25), rgba(99,149,255,0.1))',
              color: '#6395ff',
              fontWeight: 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Create API key
          </button>
        )}
      </div>

      {/* Revealed key banner */}
      {revealedKey && (
        <div
          style={{
            background: 'rgba(21,173,112,0.08)',
            border: '1px solid rgba(21,173,112,0.2)',
            borderRadius: 16,
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ color: '#15AD70', fontWeight: 400, fontSize: 13, marginBottom: 8 }}>
            Your new API key -- copy it now. It will not be shown again.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <code
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-1)',
                fontSize: 12,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {revealedKey}
            </code>
            <button
              onClick={() => handleCopy(revealedKey)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(21,173,112,0.3)',
                background: 'transparent',
                color: '#15AD70',
                fontWeight: 300,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            style={{
              marginTop: 10,
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              fontWeight: 300,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
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
            Create a new API key
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
              Key name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Production API"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
              onClick={handleCreate}
              disabled={creating}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, rgba(99,149,255,0.25), rgba(99,149,255,0.1))',
                color: '#6395ff',
                fontWeight: 400,
                fontSize: 13,
                cursor: creating ? 'wait' : 'pointer',
              }}
            >
              {creating ? 'Creating...' : 'Create key'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(''); }}
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

      {/* Keys list */}
      {keys.length === 0 ? (
        <div
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            padding: '3rem 2rem',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
          }}
        >
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 14 }}>
            No API keys yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
          }}
        >
          {keys.map((k, i) => (
            <div
              key={k.id}
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                borderBottom: i < keys.length - 1 ? '1px solid var(--glass-border)' : 'none',
              }}
            >
              {/* Key info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-1)', fontWeight: 300, fontSize: 14 }}>
                    {k.name}
                  </span>
                  {!k.isActive && (
                    <span
                      style={{
                        background: 'rgba(255,80,60,0.1)',
                        color: '#ff5c46',
                        padding: '1px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    >
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <code
                    style={{
                      color: 'var(--text-3)',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {k.prefix}...
                  </code>
                  <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 300 }}>
                    Created {new Date(k.createdAt).toLocaleDateString()}
                  </span>
                  {k.lastUsed && (
                    <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 300 }}>
                      Last used {new Date(k.lastUsed).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Revoke */}
              {confirmDelete === k.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleRevoke(k.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,80,60,0.3)',
                      background: 'rgba(255,80,60,0.1)',
                      color: '#ff5c46',
                      fontWeight: 400,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--glass-border)',
                      background: 'transparent',
                      color: 'var(--text-3)',
                      fontWeight: 300,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(k.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--glass-border)',
                    background: 'transparent',
                    color: 'var(--text-3)',
                    fontWeight: 300,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
