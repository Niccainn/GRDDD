import { prisma } from '@/lib/db';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import { redirect } from 'next/navigation';

async function createWorkflow(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const systemId = formData.get('systemId') as string;
  const environmentId = formData.get('environmentId') as string;
  
  if (!name || !systemId || !environmentId) return;
  
  let dummyIdentity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!dummyIdentity) {
    dummyIdentity = await prisma.identity.create({
      data: { type: 'PERSON', name: 'Demo User', email: 'demo@grid.app' }
    });
  }
  
  const workflow = await prisma.workflow.create({
    data: {
      name,
      description,
      status: 'DRAFT',
      systemId,
      environmentId,
      creatorId: dummyIdentity.id,
      stages: JSON.stringify([]),
      nodes: JSON.stringify([
        { id: '1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
        { id: '2', type: 'end', position: { x: 250, y: 300 }, data: { label: 'End' } }
      ]),
      edges: JSON.stringify([])
    }
  });
  
  redirect(`/workflows/${workflow.id}/edit`);
}

async function getWorkflowData() {
  const [workflows, systems, environments] = await Promise.all([
    prisma.workflow.findMany({
      include: { system: true, environment: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.system.findMany({
      include: { environment: true },
      orderBy: { name: 'asc' }
    }),
    prisma.environment.findMany({
      orderBy: { name: 'asc' }
    })
  ]);
  return { workflows, systems, environments };
}

export default async function WorkflowsPage() {
  const { workflows, systems, environments } = await getWorkflowData();
  
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-extralight mb-3 tracking-tight">Workflows</h1>
          <p className="text-white/50 font-light">Visual node-based process automation</p>
        </div>

        {systems.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <h3 className="text-xl font-light text-white/60 mb-2">Create a system first</h3>
            <p className="text-white/40 font-light mb-6">Workflows operate within systems</p>
            <Link href="/systems" className="inline-block bg-gradient-to-r from-[#7193ED] to-[#BF9FF1] text-white px-6 py-3 rounded-lg font-light hover:opacity-90 transition-opacity">
              Go to Systems
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-12 bg-white/5 border border-white/10 rounded-2xl p-8">
              <h2 className="text-xl font-light mb-6">Create New Workflow</h2>
              <form action={createWorkflow} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm text-white/60 mb-2 font-light">Workflow Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="e.g., Client Onboarding, Content Approval, Campaign Launch"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#BF9FF1] focus:ring-1 focus:ring-[#BF9FF1] transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm text-white/60 mb-2 font-light">Description (optional)</label>
                  <textarea
                    id="description"
                    name="description"
                    rows={2}
                    placeholder="What does this workflow do?"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#BF9FF1] focus:ring-1 focus:ring-[#BF9FF1] transition-all resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="systemId" className="block text-sm text-white/60 mb-2 font-light">System *</label>
                    <select
                      id="systemId"
                      name="systemId"
                      required
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#BF9FF1] focus:ring-1 focus:ring-[#BF9FF1] transition-all"
                    >
                      {systems.map((system) => (
                        <option key={system.id} value={system.id}>{system.name} ({system.environment.name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="environmentId" className="block text-sm text-white/60 mb-2 font-light">Environment *</label>
                    <select
                      id="environmentId"
                      name="environmentId"
                      required
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#BF9FF1] focus:ring-1 focus:ring-[#BF9FF1] transition-all"
                    >
                      {environments.map((env) => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#BF9FF1] to-[#7193ED] text-white px-6 py-3 rounded-lg font-light hover:opacity-90 transition-opacity"
                >
                  Create Workflow →
                </button>
              </form>
            </div>

            {workflows.length > 0 && (
              <div>
                <h2 className="text-2xl font-light mb-6">Your Workflows</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workflows.map((workflow) => (
                    <Link
                      key={workflow.id}
                      href={`/workflows/${workflow.id}/edit`}
                      className="group relative bg-gradient-to-br from-[#BF9FF1]/10 to-transparent border border-[#BF9FF1]/20 rounded-2xl p-6 hover:border-[#BF9FF1]/40 transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#BF9FF1]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-[#BF9FF1]/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#BF9FF1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full ${
                            workflow.status === 'ACTIVE' ? 'bg-[#15AD70]/20 text-[#15AD70]' :
                            workflow.status === 'DRAFT' ? 'bg-white/10 text-white/60' :
                            'bg-white/10 text-white/40'
                          }`}>
                            {workflow.status}
                          </span>
                        </div>
                        <h3 className="text-xl font-light mb-2">{workflow.name}</h3>
                        {workflow.description && <p className="text-white/50 text-sm font-light mb-4">{workflow.description}</p>}
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span className="font-light">{workflow.system.name}</span>
                          <span>·</span>
                          <span className="font-light">{workflow.environment.name}</span>
                        </div>
                      </div>
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
