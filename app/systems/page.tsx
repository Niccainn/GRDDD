import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

const SYSTEM_TEMPLATES = [
  { name: 'Brand System', description: 'Visual identity, messaging, brand guidelines', color: '#15AD70', icon: '🎨' },
  { name: 'Content System', description: 'Content creation, editorial calendar, publishing', color: '#68D0CA', icon: '📝' },
  { name: 'Client Delivery', description: 'Project management, client communication, deliverables', color: '#7193ED', icon: '🚀' },
  { name: 'Marketing System', description: 'Campaigns, analytics, growth strategies', color: '#BF9FF1', icon: '📊' },
  { name: 'Product System', description: 'Development, roadmap, feature management', color: '#FFC700', icon: '⚡' },
];

async function createSystem(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const color = formData.get('color') as string;
  const environmentId = formData.get('environmentId') as string;
  if (!name || !environmentId) return;
  let dummyIdentity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!dummyIdentity) {
    dummyIdentity = await prisma.identity.create({
      data: { type: 'PERSON', name: 'Demo User', email: 'demo@grid.app' }
    });
  }
  await prisma.system.create({
    data: { name, description, color, environmentId, creatorId: dummyIdentity.id, healthScore: Math.random() * 0.4 + 0.6 }
  });
  redirect('/systems');
}

async function getEnvironments() {
  return await prisma.environment.findMany({ orderBy: { createdAt: 'desc' } });
}

async function getSystems() {
  return await prisma.system.findMany({
    include: { environment: true, creator: true },
    orderBy: { createdAt: 'desc' }
  });
}

export default async function SystemsPage() {
  const environments = await getEnvironments();
  const systems = await getSystems();
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-extralight mb-3 tracking-tight">Systems</h1>
          <p className="text-white/50 font-light">Structured organizational functions</p>
        </div>
        {environments.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <h3 className="text-xl font-light text-white/60 mb-2">Create an environment first</h3>
            <p className="text-white/40 font-light">Systems need an environment to operate in</p>
          </div>
        ) : (
          <>
            <div className="mb-12 bg-white/5 border border-white/10 rounded-2xl p-8">
              <h2 className="text-xl font-light mb-6">Create System from Template</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SYSTEM_TEMPLATES.map((template) => (
                  <form key={template.name} action={createSystem} className="group relative bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all">
                    <input type="hidden" name="name" value={template.name} />
                    <input type="hidden" name="description" value={template.description} />
                    <input type="hidden" name="color" value={template.color} />
                    <input type="hidden" name="environmentId" value={environments[0].id} />
                    <div className="text-3xl mb-3">{template.icon}</div>
                    <h3 className="font-light mb-2">{template.name}</h3>
                    <p className="text-white/50 text-sm font-light mb-4">{template.description}</p>
                    <button type="submit" className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-light transition-all">
                      Create in {environments[0].name}
                    </button>
                  </form>
                ))}
              </div>
            </div>
            {systems.length > 0 && (
              <div>
                <h2 className="text-2xl font-light mb-6">Your Systems</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {systems.map((system) => (
                    <Link
                      key={system.id}
                      href={`/systems/${system.id}`}
                      className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
                      style={{ borderColor: system.color ? `${system.color}33` : undefined }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: system.color ? `${system.color}33` : '#ffffff11' }}>
                          {SYSTEM_TEMPLATES.find(t => t.name === system.name)?.icon || '⚙️'}
                        </div>
                        <span className="text-xs text-white/40 font-light">{system.environment.name}</span>
                      </div>
                      <h3 className="text-xl font-light mb-2">{system.name}</h3>
                      {system.description && <p className="text-white/50 text-sm font-light">{system.description}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
