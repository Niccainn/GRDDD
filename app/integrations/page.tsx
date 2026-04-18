'use client';

/**
 * /integrations — provider grid + connected accounts list.
 *
 * Two stacked surfaces:
 *
 *   1. CONNECTED — pulled from /api/integrations?environmentId=… for
 *      the selected environment. Each row shows the provider glyph,
 *      display name, masked credential preview, and a Test button
 *      that hits /api/integrations/[id]/test. Soft-delete via a
 *      Disconnect button.
 *
 *   2. AVAILABLE — pulled from /api/integrations/providers, grouped
 *      by category. api_key providers open an inline modal with the
 *      fields declared in the registry; oauth providers redirect to
 *      /api/integrations/oauth/<provider>/start. Providers that are
 *      `implemented=false` or `envReady=false` stay visible but are
 *      greyed-out with a tooltip explaining why.
 *
 * Authorization: the server routes enforce admin membership, so we
 * don't re-check here. If the user can't administer the selected
 * environment they'll see 404s in the responses and the UI will
 * surface them as toast errors.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import IntegrationConfigModal from '@/components/IntegrationConfigModal';
import { capabilityTier, TIER_META } from '@/lib/integrations/capability';

type ProviderSummary = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  categoryLabel: string;
  authType: 'oauth' | 'api_key' | 'service_account';
  accentColor: string;
  glyph: string;
  implemented: boolean;
  envReady: boolean;
  missingEnvVars: string[];
  apiKeyFields?: { name: string; label: string; type: 'text' | 'password'; placeholder?: string; helper?: string }[];
};

type Integration = {
  id: string;
  provider: string;
  displayName: string;
  accountLabel: string | null;
  authType: string;
  credentialsPreview: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';
  lastSyncedAt: string | null;
  lastError: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type Environment = { id: string; name: string; slug: string; color?: string | null };

type CategoryDef = { id: string; label: string };

export default function IntegrationsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [connected, setConnected] = useState<Integration[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [connectModal, setConnectModal] = useState<ProviderSummary | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [configModal, setConfigModal] = useState<ProviderSummary | null>(null);

  // Load environments + providers once.
  useEffect(() => {
    (async () => {
      try {
        const [envRes, provRes] = await Promise.all([
          fetch('/api/environments'),
          fetch('/api/integrations/providers'),
        ]);
        if (envRes.ok) {
          const envs = (await envRes.json()) as Environment[];
          setEnvironments(envs);
          const urlEnvId = new URLSearchParams(window.location.search).get('environmentId');
          setEnvironmentId(urlEnvId ?? envs[0]?.id ?? null);
        }
        if (provRes.ok) {
          const data = (await provRes.json()) as { providers: ProviderSummary[]; categories: CategoryDef[] };
          setProviders(data.providers);
          setCategories(data.categories);
        }
      } catch (err) {
        setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to load' });
      }
    })();

    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (oauth === 'success') setToast({ kind: 'ok', text: 'Connected successfully' });
    if (oauth === 'error') setToast({ kind: 'err', text: params.get('message') ?? 'OAuth failed' });
  }, []);

  // Reload connected integrations whenever environment changes.
  const loadConnected = useCallback(async (envId: string) => {
    const res = await fetch(`/api/integrations?environmentId=${envId}`);
    if (!res.ok) {
      setConnected([]);
      return;
    }
    const data = (await res.json()) as { integrations: Integration[] };
    setConnected(data.integrations);
  }, []);

  useEffect(() => {
    if (environmentId) loadConnected(environmentId);
  }, [environmentId, loadConnected]);

  // Filtered + grouped providers
  const filtered = useMemo(() => {
    return providers.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q) || p.categoryLabel.toLowerCase().includes(q);
      }
      return true;
    });
  }, [providers, category, search]);

  // Group by category when showing "All"
  const grouped = useMemo(() => {
    if (category !== 'all') return null;
    const map = new Map<string, { label: string; items: ProviderSummary[] }>();
    for (const p of filtered) {
      if (!map.has(p.category)) {
        map.set(p.category, { label: p.categoryLabel, items: [] });
      }
      map.get(p.category)!.items.push(p);
    }
    return map;
  }, [filtered, category]);

  // Category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of providers) {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.tagline.toLowerCase().includes(q) && !p.categoryLabel.toLowerCase().includes(q)) continue;
      }
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [providers, search]);

  const totalFiltered = useMemo(() => {
    return Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  }, [categoryCounts]);

  const handleConnect = async (prov: ProviderSummary) => {
    if (!environmentId) {
      setToast({ kind: 'err', text: 'Pick an environment first' });
      return;
    }
    if (!prov.implemented) {
      setToast({ kind: 'err', text: `${prov.name} is coming soon` });
      return;
    }
    if (!prov.envReady) {
      setToast({ kind: 'err', text: `${prov.name} needs env vars: ${prov.missingEnvVars.join(', ')}` });
      return;
    }
    if (prov.authType === 'oauth') {
      window.location.href = `/api/integrations/oauth/${prov.id}/start?environmentId=${environmentId}`;
      return;
    }
    setConnectModal(prov);
    setFormValues({});
  };

  const submitApiKey = async () => {
    if (!connectModal || !environmentId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environmentId,
          provider: connectModal.id,
          credentials: formValues,
        }),
      });
      const data = (await res.json()) as { error?: string; integration?: Integration };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Connection failed');
      setToast({ kind: 'ok', text: `${connectModal.name} connected` });
      setConnectModal(null);
      await loadConnected(environmentId);
    } catch (err) {
      setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async (integrationId: string) => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/test`, { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; error?: string; summary?: Record<string, unknown> };
      if (!data.ok) throw new Error(data.error ?? 'Test failed');
      setToast({ kind: 'ok', text: 'Connection healthy' });
      if (environmentId) await loadConnected(environmentId);
    } catch (err) {
      setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Test failed' });
      if (environmentId) await loadConnected(environmentId);
    }
  };

  const handleDisconnect = async (integrationId: string, displayName: string) => {
    if (!confirm(`Disconnect ${displayName}? The credential will be wiped.`)) return;
    try {
      const res = await fetch(`/api/integrations/${integrationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Disconnect failed');
      setToast({ kind: 'ok', text: 'Disconnected' });
      if (environmentId) await loadConnected(environmentId);
    } catch (err) {
      setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Failed' });
    }
  };

  const connectedProviderIds = new Set(connected.map(c => c.provider));

  const renderProviderCard = (prov: ProviderSummary) => {
    const alreadyConnected = connectedProviderIds.has(prov.id);
    const disabled = !prov.implemented || !prov.envReady;
    return (
      <div
        key={prov.id}
        className="chrome p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] group"
        style={{ opacity: disabled ? 0.5 : 1 }}
        onClick={() => setConfigModal(prov)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setConfigModal(prov); } }}
      >
        <div
          className="chrome-squircle w-11 h-11 flex items-center justify-center text-lg shrink-0"
          style={{ color: prov.accentColor }}
        >
          {prov.glyph}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
              {prov.name}
            </span>
            {!prov.implemented && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: 'var(--text-3)', background: 'var(--glass-bg)' }}>
                Soon
              </span>
            )}
            {/* Capability tier — computed from actual code state so the
                chip never drifts from the truth. Honest in-advertising:
                users see "Connect only" when the token will be stored
                but no automatic data pull exists yet. */}
            {prov.implemented && (() => {
              const tier = capabilityTier(prov.id);
              const meta = TIER_META[tier];
              return (
                <span
                  title={meta.explainer}
                  className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: meta.color }} aria-hidden />
                  {meta.shortLabel}
                </span>
              );
            })()}
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
            {prov.tagline}
          </p>
        </div>
        <div className="shrink-0">
          {alreadyConnected ? (
            <span
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{
                color: '#34d399',
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.15)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          ) : (
            <span
              className="text-xs font-light opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-3)' }}
            >
              Connect &rarr;
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 md:px-12 py-6 md:py-12 min-h-screen">
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extralight tracking-tight mb-1">Integrations</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
              {connected.length} connected · {providers.length} available
            </p>
          </div>
          {environments.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-light whitespace-nowrap" style={{ color: 'var(--text-3)' }}>Environment:</span>
              <select
                value={environmentId ?? ''}
                onChange={e => setEnvironmentId(e.target.value)}
                className="glass-input px-3 py-2 text-sm"
              >
                {environments.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="mb-6 px-4 py-3 text-sm rounded-lg animate-fade-in"
            style={{
              background: toast.kind === 'ok' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
              color: toast.kind === 'ok' ? '#34d399' : '#f87171',
              border: `1px solid ${toast.kind === 'ok' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}
          >
            {toast.text}
            <button onClick={() => setToast(null)} className="ml-3 opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        {/* Connected section */}
        {connected.length > 0 && (
          <section className="mb-10 animate-fade-in">
            <h2 className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-3)' }}>
              Connected
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {connected.map(int => {
                const prov = providers.find(p => p.id === int.provider);
                const statusColor =
                  int.status === 'ACTIVE' ? '#34d399' :
                  int.status === 'ERROR' ? '#f87171' :
                  '#fbbf24';
                return (
                  <div key={int.id} className="chrome p-4 flex items-center gap-4">
                    <div
                      className="chrome-squircle w-10 h-10 flex items-center justify-center text-lg shrink-0"
                      style={{ color: prov?.accentColor ?? 'var(--text-2)' }}
                    >
                      {prov?.glyph ?? '◎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                          {int.displayName}
                        </span>
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ background: statusColor }}
                        />
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                          {int.status}
                        </span>
                        {/* Tier badge so the user knows whether data is
                            actually flowing or just that a token is stored. */}
                        {(() => {
                          const tier = capabilityTier(int.provider);
                          const meta = TIER_META[tier];
                          return (
                            <span
                              title={meta.explainer}
                              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                              style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                            >
                              <span className="w-1 h-1 rounded-full" style={{ background: meta.color }} aria-hidden />
                              {meta.shortLabel}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {int.credentialsPreview}
                        {int.accountLabel && ` · ${int.accountLabel}`}
                        {int.lastSyncedAt && ` · last checked ${new Date(int.lastSyncedAt).toLocaleString()}`}
                      </div>
                      {int.lastError && (
                        <div className="text-xs mt-1" style={{ color: '#f87171' }}>
                          {int.lastError}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTest(int.id)}
                        className="chrome-pill px-3 py-1.5 text-xs font-light"
                        style={{ color: 'var(--text-2)' }}
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleDisconnect(int.id, int.displayName)}
                        className="chrome-pill px-3 py-1.5 text-xs font-light"
                        style={{ color: 'var(--text-3)' }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Search + filter bar */}
        <div className="mb-6 animate-fade-in space-y-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input px-4 py-2.5 text-sm w-full"
            placeholder="Search integrations..."
          />
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            <button
              onClick={() => setCategory('all')}
              className="chrome-pill px-3 py-1.5 text-xs font-light whitespace-nowrap flex items-center gap-1.5 shrink-0"
              style={{
                color: category === 'all' ? 'var(--text-1)' : 'var(--text-3)',
                background: category === 'all' ? 'var(--glass-active)' : undefined,
              }}
            >
              All
              <span className="text-[10px] opacity-60">{totalFiltered}</span>
            </button>
            {categories.map(cat => {
              const count = categoryCounts[cat.id] || 0;
              if (count === 0 && search) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="chrome-pill px-3 py-1.5 text-xs font-light whitespace-nowrap flex items-center gap-1.5 shrink-0"
                  style={{
                    color: category === cat.id ? 'var(--text-1)' : 'var(--text-3)',
                    background: category === cat.id ? 'var(--glass-active)' : undefined,
                  }}
                >
                  {cat.label}
                  <span className="text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Provider grid — grouped by category when "All", flat when filtered */}
        <div className="animate-fade-in">
          {category === 'all' && grouped ? (
            // Grouped view
            Array.from(grouped.entries()).map(([catId, group]) => (
              <section key={catId} className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    {group.label}
                  </h2>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-1)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{group.items.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {group.items.map(renderProviderCard)}
                </div>
              </section>
            ))
          ) : (
            // Flat filtered view
            <>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                  {category === 'all' ? 'All Integrations' : categories.find(c => c.id === category)?.label ?? 'Results'}
                </h2>
                <div className="flex-1 h-px" style={{ background: 'var(--border-1)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{filtered.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered.map(renderProviderCard)}
              </div>
            </>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
                No integrations match your search.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Integration config modal */}
      {configModal && (
        <IntegrationConfigModal
          open={!!configModal}
          onClose={() => setConfigModal(null)}
          integration={configModal}
          isConnected={connectedProviderIds.has(configModal.id)}
          onToast={setToast}
          environmentId={environmentId}
        />
      )}

      {/* API key connect modal */}
      {connectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => {
            if (e.target === e.currentTarget && !submitting) setConnectModal(null);
          }}
        >
          <div className="chrome p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="chrome-squircle w-12 h-12 flex items-center justify-center text-xl"
                style={{ color: connectModal.accentColor }}
              >
                {connectModal.glyph}
              </div>
              <div>
                <h2 className="text-lg font-light">Connect {connectModal.name}</h2>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{connectModal.tagline}</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              {connectModal.apiKeyFields?.map(field => (
                <div key={field.name}>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={formValues[field.name] ?? ''}
                    onChange={e => setFormValues(v => ({ ...v, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="glass-input w-full px-3 py-2 text-sm font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {field.helper && (
                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-3)' }}>
                      {field.helper}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConnectModal(null)}
                disabled={submitting}
                className="chrome-pill px-4 py-2 text-xs font-light"
                style={{ color: 'var(--text-3)' }}
              >
                Cancel
              </button>
              <button
                onClick={submitApiKey}
                disabled={submitting}
                className="chrome-pill px-4 py-2 text-xs font-light"
                style={{ color: 'var(--text-1)', background: 'var(--glass-active)' }}
              >
                {submitting ? 'Validating...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
