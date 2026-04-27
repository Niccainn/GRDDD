'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import EnvironmentTabs from '@/components/EnvironmentTabs';
import DeleteEnvironmentTrigger from '@/components/DeleteEnvironmentTrigger';
import RenameButton from '@/components/RenameButton';
import ShareEnvironmentButton from '@/components/ShareEnvironmentButton';
import PresenceStack from '@/components/presence/PresenceStack';
import ActivityButton from '@/components/ActivityButton';
import EnvActionMenu from '@/components/EnvActionMenu';
import { EnvironmentWorkspaceContext } from '@/lib/contexts/environment-workspace';

type EnvMeta = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  description: string | null;
  avgHealth: number | null;
  systemCount: number;
};

export default function EnvironmentWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;
  const [env, setEnv] = useState<EnvMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/environments/${slug}/dashboard`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(d => {
        setEnv({
          id: d.environment.id,
          name: d.environment.name,
          slug: d.environment.slug,
          color: d.environment.color,
          description: d.environment.description,
          avgHealth: d.avgHealth,
          systemCount: d.systems?.length ?? 0,
        });
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
        <div className="h-4 w-32 rounded-lg animate-pulse mb-6" style={{ background: 'var(--glass)' }} />
        <div className="h-8 w-48 rounded-lg animate-pulse mb-2" style={{ background: 'var(--glass)' }} />
        <div className="h-4 w-64 rounded-lg animate-pulse mb-6" style={{ background: 'var(--glass)' }} />
        <div className="h-10 w-full rounded-lg animate-pulse mb-8" style={{ background: 'var(--glass)' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !env) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5L13 4.75V11.25L7.5 14.5L2 11.25V4.75L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" style={{ color: 'var(--text-3)' }} />
            </svg>
          </div>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>Environment not found</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>This environment may have been deleted or the URL is incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <EnvironmentWorkspaceContext.Provider value={{
      environmentId: env.id,
      slug: env.slug,
      name: env.name,
      color: env.color,
      description: env.description,
    }}>
      <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Environments', href: '/environments' },
          { label: env.name },
        ]} />

        {/* Header — mobile collapses the admin actions behind a "..." menu
            (see EnvActionMenu below) so the header never overflows 375px.
            On desktop everything sits inline as before. */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            {env.color && (
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: env.color }} />
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1 truncate">{env.name}</h1>
              {env.description && (
                <p className="text-sm font-light truncate" style={{ color: 'var(--text-3)' }}>{env.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
            {env.avgHealth !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap"
                style={{
                  background: env.avgHealth >= 80 ? 'rgba(200,242,107,0.08)' : env.avgHealth >= 60 ? 'rgba(247,199,0,0.08)' : 'rgba(255,87,87,0.08)',
                  border: `1px solid ${env.avgHealth >= 80 ? 'rgba(200,242,107,0.2)' : env.avgHealth >= 60 ? 'rgba(247,199,0,0.2)' : 'rgba(255,87,87,0.2)'}`,
                }}>
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: env.avgHealth >= 80 ? '#C8F26B' : env.avgHealth >= 60 ? '#F7C700' : '#FF5757' }} />
                <span className="text-xs font-light"
                  style={{ color: env.avgHealth >= 80 ? '#C8F26B' : env.avgHealth >= 60 ? '#F7C700' : '#FF5757' }}>
                  {env.avgHealth}% health
                </span>
              </div>
            )}
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
              {env.systemCount} system{env.systemCount !== 1 ? 's' : ''}
            </span>
            {/* Desktop: all inline. Mobile: PresenceStack + Activity stay,
                rest collapses into a compact overflow menu so the
                375px header doesn't wrap into 3 lines. */}
            <div className="hidden md:flex items-center gap-3">
              <PresenceStack environmentId={env.id} />
              <ActivityButton entityType="Environment" entityId={env.id} entityLabel={env.name} />
              <ShareEnvironmentButton environmentId={env.id} />
              <RenameButton id={env.id} type="environments" currentName={env.name} />
              <DeleteEnvironmentTrigger
                id={env.id}
                name={env.name}
                redirectTo="/environments"
                variant="danger"
              />
            </div>
            <div className="flex md:hidden items-center gap-2">
              <PresenceStack environmentId={env.id} />
              <ActivityButton entityType="Environment" entityId={env.id} entityLabel={env.name} />
              <EnvActionMenu env={env} />
            </div>
          </div>
        </div>

        {/* Tabs — horizontal scroll on mobile so extras aren't clipped
            invisibly; desktop stays flat. */}
        <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto no-scrollbar">
          <EnvironmentTabs slug={slug} envColor={env.color} />
        </div>

        {/* Content */}
        <div className="mt-6">
          {children}
        </div>
      </div>
    </EnvironmentWorkspaceContext.Provider>
  );
}
