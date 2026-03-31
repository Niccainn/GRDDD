import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getEnvironment(slug: string) {
  return prisma.environment.findUnique({
    where: { slug },
    include: { owner: true, systems: { orderBy: { createdAt: 'desc' } } }
  });
}

export default async function EnvironmentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const environment = await getEnvironment(slug);
  if (!environment) notFound();

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Breadcrumb */}
      <Link href="/environments" className="text-xs font-light mb-8 inline-flex items-center gap-1.5 transition-colors"
        style={{ color: 'var(--text-tertiary)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Environments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">{environment.name}</h1>
          {environment.description && (
            <p className="text-sm font-light" style={{ color: 'var(--text-secondary)' }}>{environment.description}</p>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>/{environment.slug}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{environment.owner.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {new Date(environment.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>SYSTEMS</p>
          {environment.systems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No systems yet</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Add systems to this environment</p>
              <Link href="/systems" className="text-xs font-light px-4 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                Go to Systems →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {environment.systems.map(system => (
                <Link key={system.id} href={`/systems/${system.id}`}
                  className="group flex flex-col justify-between p-5 rounded-xl transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {system.color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: system.color }} />}
                      {system.healthScore !== null && (
                        <span className="text-xs font-light ml-auto"
                          style={{ color: system.healthScore > 0.8 ? '#15AD70' : system.healthScore > 0.5 ? '#F7C700' : '#FF4D4D' }}>
                          {Math.round(system.healthScore * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-light group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {system.name}
                    </p>
                    {system.description && (
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{system.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Meta */}
        <div>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>OVERVIEW</p>
          <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {[
              { label: 'Systems', value: environment.systems.length },
              { label: 'Owner', value: environment.owner.name },
              { label: 'Created', value: new Date(environment.createdAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.6)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
