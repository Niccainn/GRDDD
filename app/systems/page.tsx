import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeleteButton from '@/components/DeleteButton';

export const dynamic = 'force-dynamic';

const TEMPLATES = [
  { name: 'Brand System', description: 'Visual identity, messaging, brand guidelines', color: '#C8F26B' },
  { name: 'Content System', description: 'Content creation, editorial calendar, publishing', color: '#68D0CA' },
  { name: 'Client Delivery', description: 'Project management, client communication, deliverables', color: '#7193ED' },
  { name: 'Marketing System', description: 'Campaigns, analytics, growth strategies', color: '#BF9FF1' },
  { name: 'Product System', description: 'Development, roadmap, feature management', color: '#F7C700' },
];

async function createSystem(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const color = formData.get('color') as string;
  const environmentId = formData.get('environmentId') as string;
  if (!name || !environmentId) return;
  const identity = await getAuthIdentity();
  const system = await prisma.system.create({
    data: { name, description, color, environmentId, creatorId: identity.id, healthScore: Math.random() * 0.3 + 0.7 }
  });
  redirect(`/systems/${system.id}`);
}

export default async function SystemsPage() {
  const [environments, systems] = await Promise.all([
    prisma.environment.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.system.findMany({ include: { environment: true, _count: { select: { workflows: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      <div className="mb-10">
        <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1">Systems</h1>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>The core functions that power your organization</p>
      </div>

      {environments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl"
          style={{ border: '1px dashed var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No environments yet</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Systems need an environment to operate in</p>
          <Link href="/environments" className="text-xs font-light px-4 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            Create environment →
          </Link>
        </div>
      ) : (
        <>
          {/* Templates */}
          <div className="mb-10">
            <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>QUICK ADD</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {TEMPLATES.map(t => (
                <form key={t.name} action={createSystem}>
                  <input type="hidden" name="name" value={t.name} />
                  <input type="hidden" name="description" value={t.description} />
                  <input type="hidden" name="color" value={t.color} />
                  <input type="hidden" name="environmentId" value={environments[0].id} />
                  <button type="submit"
                    className="w-full text-left p-4 rounded-xl transition-all group"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                    <div className="w-1.5 h-1.5 rounded-full mb-3" style={{ backgroundColor: t.color }} />
                    <p className="text-xs font-light mb-1 group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.name}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{t.description}</p>
                  </button>
                </form>
              ))}
            </div>
          </div>

          {/* Existing systems */}
          {systems.length > 0 && (
            <div>
              <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>YOUR SYSTEMS</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {systems.map(s => (
                  <div key={s.id} className="group flex flex-col rounded-xl transition-all"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                    <Link href={`/systems/${s.id}`} className="flex flex-col p-5 flex-1">
                      <div className="flex items-start justify-between mb-3">
                        {s.color && <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: s.color }} />}
                        {s.healthScore !== null && (
                          <span className="text-xs font-light ml-auto" style={{ color: s.healthScore >= 80 ? '#C8F26B' : s.healthScore >= 50 ? '#F7C700' : '#FF4D4D' }}>
                            {Math.round(s.healthScore)}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-light mb-1 group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {s.name}
                      </p>
                      {s.description && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{s.description}</p>}
                    </Link>
                    <div className="flex items-center justify-between px-5 pb-4">
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{s.environment.name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{s._count.workflows} {s._count.workflows === 1 ? 'workflow' : 'workflows'}</span>
                        <DeleteButton id={s.id} type="systems" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
