'use client';

import { useState } from 'react';

type IntegrationData = {
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

type Props = {
  open: boolean;
  onClose: () => void;
  integration: IntegrationData;
  isConnected: boolean;
  onToast: (toast: { kind: 'ok' | 'err'; text: string }) => void;
  environmentId?: string | null;
};

export default function IntegrationConfigModal({ open, onClose, integration, isConnected, onToast, environmentId }: Props) {
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [webhookCopied, setWebhookCopied] = useState(false);

  if (!open) return null;

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/inbound/${integration.id}`
    : `/api/webhooks/inbound/${integration.id}`;

  const handleSaveApiKey = () => {
    const key = `grid_integration_${integration.id}`;
    try {
      localStorage.setItem(key, JSON.stringify(apiKeyValues));
      onToast({ kind: 'ok', text: `API key saved — integration will be available soon` });
      onClose();
    } catch {
      onToast({ kind: 'err', text: 'Failed to save API key' });
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    } catch {
      onToast({ kind: 'err', text: 'Failed to copy' });
    }
  };

  const hasApiKeyValues = Object.values(apiKeyValues).some(v => v.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-deep max-w-md w-full overflow-hidden animate-fade-in"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="chrome-squircle w-14 h-14 flex items-center justify-center text-2xl shrink-0"
              style={{ color: integration.accentColor }}
            >
              {integration.glyph}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-light" style={{ color: 'var(--text-1)' }}>
                {integration.name}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {integration.categoryLabel} · {integration.authType === 'oauth' ? 'OAuth' : integration.authType === 'api_key' ? 'API Key' : 'Service Account'}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: isConnected ? '#34d399' : 'rgba(255,255,255,0.2)' }}
            />
            <span className="text-xs" style={{ color: isConnected ? '#34d399' : 'var(--text-3)' }}>
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm font-light leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
            {integration.tagline}
          </p>
        </div>

        {/* Auth section */}
        <div className="px-8 pb-8">
          {integration.authType === 'oauth' && (
            <div>
              {integration.implemented && integration.envReady ? (
                <div className="chrome p-4 mb-4 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => {
                      if (!environmentId) {
                        onToast({ kind: 'err', text: 'Select an environment first' });
                        return;
                      }
                      window.location.href = `/api/integrations/oauth/${integration.id}/start?environmentId=${environmentId}`;
                    }}
                    className="chrome-pill px-6 py-2.5 text-sm font-light w-full"
                    style={{ color: 'var(--text-1)', background: 'var(--glass-active)' }}
                  >
                    Connect with {integration.name}
                  </button>
                  <p className="text-[11px] mt-3" style={{ color: 'var(--text-3)' }}>
                    You&apos;ll be redirected to {integration.name} to authorize access
                  </p>
                </div>
              ) : (
                <div className="chrome p-4 mb-4 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button
                    disabled
                    className="chrome-pill px-6 py-2.5 text-sm font-light w-full opacity-60 cursor-not-allowed"
                    style={{ color: 'var(--text-2)' }}
                  >
                    Connect with {integration.name}
                  </button>
                  <p className="text-[11px] mt-3" style={{ color: 'var(--text-3)' }}>
                    {!integration.implemented ? 'Coming soon' : 'Not configured yet'}
                  </p>
                </div>
              )}
              {!integration.envReady && integration.missingEnvVars.length > 0 && (
                <div
                  className="text-[11px] p-3 rounded-lg"
                  style={{ background: 'rgba(251,191,36,0.06)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.12)' }}
                >
                  Requires environment variables: {integration.missingEnvVars.join(', ')}
                </div>
              )}
            </div>
          )}

          {integration.authType === 'api_key' && (
            <div>
              {integration.apiKeyFields && integration.apiKeyFields.length > 0 ? (
                <div className="space-y-4 mb-4">
                  {integration.apiKeyFields.map(field => (
                    <div key={field.name}>
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={apiKeyValues[field.name] ?? ''}
                        onChange={e => setApiKeyValues(v => ({ ...v, [field.name]: e.target.value }))}
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
              ) : (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={apiKeyValues['apiKey'] ?? ''}
                      onChange={e => setApiKeyValues(v => ({ ...v, apiKey: e.target.value }))}
                      placeholder={`Enter your ${integration.name} API key`}
                      className="glass-input w-full px-3 py-2 text-sm font-mono"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              )}
              <button
                onClick={handleSaveApiKey}
                disabled={!hasApiKeyValues}
                className="chrome-pill px-5 py-2 text-xs font-light w-full disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--text-1)', background: 'var(--glass-active)' }}
              >
                Save API Key
              </button>
            </div>
          )}

          {integration.authType === 'service_account' && (
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>
                Webhook URL
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="glass-input w-full px-3 py-2 text-xs font-mono"
                  style={{ color: 'var(--text-3)' }}
                />
                <button
                  onClick={handleCopyWebhook}
                  className="chrome-pill px-3 py-2 text-xs font-light shrink-0"
                  style={{ color: 'var(--text-2)' }}
                >
                  {webhookCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                Add this URL to your {integration.name} webhook settings to receive events.
              </p>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <a
              href="#"
              className="text-[11px] font-light"
              style={{ color: 'var(--text-3)' }}
              onClick={e => e.preventDefault()}
            >
              Learn more
            </a>
            <button
              onClick={onClose}
              className="chrome-pill px-5 py-2 text-xs font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
