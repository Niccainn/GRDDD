import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function createEnvironment(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  if (!name) return;
  let identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!identity) identity = await prisma.identity.create({ data: { type: 'PERSON', name: 'Demo User', email: 'demo@grid.app' } });
  await prisma.environment.create({
    data: { name, description, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), ownerId: identity.id }
  });
  redirect('/environments');
}

async function getEnvironments() {
  return prisma.environment.findMany({ include: { owner: true, systems: true }, orderBy: { createdAt: 'desc' } });
}

export default async function EnvironmentsPage() {
  const environments = await getEnvironments();

  return (
    <div className="px-10 py-10 min-h-screen">
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Environments</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Organisational containers where systems operate</p>
        </div>

        {/* Inline create */}
        <form action={createEnvironment} className="flex items-center gap-2">
          <input
            name="name"
            required
            placeholder="New environment name"
            className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white', width: '200px' }}
          />
          <button type="submit"
            className="text-xs font-light px-3 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            Create
          </button>
        </form>
      </div>

      {environments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24"
          style={{ border: '1px dashed var(--border)', borderRadius: '12px' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No environments</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Create your first environment above</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {environments.map((env) => (
            <Link key={env.id} href={`/environments/${env.slug}`}
              className="group flex flex-col justify-between p-5 rounded-xl transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <p className="text-sm font-light group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {env.name}
                  </p>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--text-tertiary)', marginTop: '3px', flexShrink: 0 }}>
                    <path d="M3 1h8v8M1 11L11 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                {env.description && (
                  <p className="text-xs font-light leading-relaxed mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    {env.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>/{env.slug}</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{env.systems.length} system{env.systems.length !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
