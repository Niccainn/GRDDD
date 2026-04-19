'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ConnectedIntegration = {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  accountLabel: string;
};

type ProviderDef = {
  id: string;
  name: string;
  category: string;
  glyph: string;
  accentColor: string;
  implemented: boolean;
};

export default function IntegrationsWidget({ environmentId }: { environmentId: string }) {
  const [connected, setConnected] = useState<ConnectedIntegration[]>([]);
  const [providers, setProviders] = useState<ProviderDef[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/integrations?environmentId=${environmentId}`).then(r => r.ok ? r.json() : { integrations: [] }),
      fetch('/api/integrations/providers').then(r => r.ok ? r.json() : { providers: [] }),
    ]).then(([intData, provData]) => {
      setConnected(intData.integrations ?? []);
      setProviders(provData.providers ?? []);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [environmentId]);

  const connectedProviders = new Set(connected.map(c => c.provider));
  const availableNotConnected = providers.filter(p => p.implemented && !connectedProviders.has(p.id)).slice(0, 6);

  return (
    <div className="glass-deep p-3 md:p-5 col-span-1">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>INTEGRATIONS</p>
        <Link href={`/integrations?environmentId=${environmentId}`} className="text-xs font-light transition-colors"
          style={{ color: 'var(--text-3)' }}>
          Manage →
        </Link>
      </div>

      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : connected.length === 0 && availableNotConnected.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>No integrations available</p>
          <Link href="/integrations" className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Browse integrations →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connected */}
          {connected.length > 0 && (
            <div className="space-y-1.5">
              {connected.map(int => (
                <div key={int.id} className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg min-w-0"
                  style={{ background: 'rgba(21,173,112,0.04)', border: '1px solid rgba(21,173,112,0.1)' }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#15AD70' }} />
                  <span className="flex-1 text-xs font-light truncate min-w-0" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {int.displayName}
                  </span>
                  <span className="text-[10px] flex-shrink-0 hidden md:inline" style={{ color: 'rgba(21,173,112,0.6)' }}>Connected</span>
                </div>
              ))}
            </div>
          )}

          {/* Available to connect */}
          {availableNotConnected.length > 0 && (
            <>
              {connected.length > 0 && (
                <p className="text-[10px] tracking-[0.12em] pt-2" style={{ color: 'var(--text-3)' }}>AVAILABLE</p>
              )}
              <div className="space-y-1">
                {availableNotConnected.map(p => (
                  <Link key={p.id} href={`/integrations?environmentId=${environmentId}`}
                    className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg group transition-all min-w-0"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: p.accentColor, opacity: 0.6 }}>{p.glyph}</span>
                    <span className="flex-1 text-xs font-light truncate min-w-0 group-hover:text-white/60 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {p.name}
                    </span>
                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-3)' }}>
                      Connect →
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
