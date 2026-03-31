import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

async function createWorkflow(formData: FormData) {
  'use server';
  const systemId = formData.get('systemId') as string;
  const environmentId = formData.get('environmentId') as string;

  let dummyIdentity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!dummyIdentity) {
    dummyIdentity = await prisma.identity.create({
      data: { type: 'PERSON', name: 'Demo User', email: 'demo@grid.app' }
    });
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: 'New Workflow',
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

async function getSystem(id: string) {
  return await prisma.system.findUnique({
    where: { id },
    include: {
      environment: true,
      creator: true,
      workflows: { orderBy: { createdAt: 'desc' } }
    }
  });
}

export default async function SystemDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const system = await getSystem(id);
  const boundCreateWorkflow = createWorkflow.bind(null);
  
  if (!system) notFound();
  
  const healthColor = system.healthScore 
    ? system.healthScore > 0.8 ? '#15AD70'
    : system.healthScore > 0.5 ? '#FFC700'
    : '#FF6B6B'
    : '#68D0CA';
  
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <Link href="/systems" className="text-white/60 hover:text-white text-sm font-light mb-4 inline-block">
          ← Back to Systems
        </Link>
        
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: system.color ? `${system.color}33` : '#ffffff11' }}
            >
              {system.name.includes('Brand') ? '🎨' :
               system.name.includes('Content') ? '📝' :
               system.name.includes('Client') ? '🚀' :
               system.name.includes('Marketing') ? '📊' :
               system.name.includes('Product') ? '⚡' : '⚙️'}
            </div>
            <div>
              <h1 className="text-4xl font-extralight mb-2 tracking-tight">{system.name}</h1>
              {system.description && <p className="text-white/50 font-light">{system.description}</p>}
              <p className="text-white/40 text-sm font-light mt-2">
                in <Link href={`/environments/${system.environment.slug}`} className="text-[#68D0CA] hover:underline">{system.environment.name}</Link>
              </p>
            </div>
          </div>
          
          {system.healthScore !== null && (
            <div className="text-right">
              <p className="text-white/40 text-sm font-light mb-1">Health Score</p>
              <p className="text-3xl font-light" style={{ color: healthColor }}>
                {Math.round((system.healthScore || 0) * 100)}%
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-light mb-6">Workflows</h2>
              {system.workflows.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-light text-white/60 mb-2">No workflows yet</h3>
                  <p className="text-white/40 font-light mb-6">Create workflows to automate this system</p>
                  <form action={boundCreateWorkflow}>
                    <input type="hidden" name="systemId" value={system.id} />
                    <input type="hidden" name="environmentId" value={system.environmentId} />
                    <button type="submit" className="bg-gradient-to-r from-[#BF9FF1] to-[#7193ED] text-white px-6 py-3 rounded-lg font-light hover:opacity-90 transition-opacity">
                      Create Workflow
                    </button>
                  </form>
                </div>
              ) : (
                <div className="grid gap-4">
                  {system.workflows.map((workflow) => (
                    <Link key={workflow.id} href={`/workflows/${workflow.id}/edit`} className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#BF9FF1]/40 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-light">{workflow.name}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          workflow.status === 'ACTIVE' ? 'bg-[#15AD70]/20 text-[#15AD70]' :
                          workflow.status === 'DRAFT' ? 'bg-white/10 text-white/60' :
                          'bg-white/10 text-white/40'
                        }`}>{workflow.status}</span>
                      </div>
                      {workflow.description && <p className="text-white/50 text-sm font-light">{workflow.description}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-light mb-6">Configuration</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 font-light">System Color</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border border-white/20"
                      style={{ backgroundColor: system.color || '#68D0CA' }}
                    />
                    <span className="text-sm text-white/40">{system.color || '#68D0CA'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 font-light">Created</span>
                  <span className="text-sm text-white/40">{new Date(system.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 font-light">Created By</span>
                  <span className="text-sm text-white/40">{system.creator.name}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-light mb-6">Quick Stats</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-white/40 text-sm font-light mb-1">Workflows</p>
                  <p className="text-2xl font-light">{system.workflows.length}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm font-light mb-1">Active Workflows</p>
                  <p className="text-2xl font-light">
                    {system.workflows.filter(w => w.status === 'ACTIVE').length}
                  </p>
                </div>
                {system.healthScore !== null && (
                  <div>
                    <p className="text-white/40 text-sm font-light mb-1">Health</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${(system.healthScore || 0) * 100}%`,
                            backgroundColor: healthColor
                          }}
                        />
                      </div>
                      <span className="text-sm font-light" style={{ color: healthColor }}>
                        {Math.round((system.healthScore || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-light mb-6">Actions</h2>
              <div className="space-y-3">
                <button className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-light transition-all text-left">
                  📊 View Analytics
                </button>
                <button className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-light transition-all text-left">
                  ⚙️ System Settings
                </button>
                <button className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-light transition-all text-left">
                  🤖 Add Intelligence
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
