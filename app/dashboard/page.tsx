import { prisma } from '@/lib/db';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

async function getDashboardData() {
  const [environments, systems, workflows] = await Promise.all([
    prisma.environment.findMany({
      include: { systems: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.system.findMany({
      include: { environment: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.workflow.findMany({
      include: { system: { include: { environment: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const totalEnvironments = await prisma.environment.count();
  const totalSystems = await prisma.system.count();
  const totalWorkflows = await prisma.workflow.count();
  const activeWorkflows = await prisma.workflow.count({ where: { status: 'ACTIVE' } });

  const avgHealth = systems.length > 0
    ? systems.reduce((acc, s) => acc + (s.healthScore || 0), 0) / systems.length
    : 0;

  return {
    environments,
    systems,
    workflows,
    stats: {
      totalEnvironments,
      totalSystems,
      totalWorkflows,
      activeWorkflows,
      avgHealth
    }
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-extralight mb-3 tracking-tight">Dashboard</h1>
          <p className="text-white/50 font-light">Overview of your organizational infrastructure</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-[#68D0CA]/10 to-transparent border border-[#68D0CA]/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#68D0CA]/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#68D0CA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-sm text-white/60 font-light">Environments</span>
            </div>
            <p className="text-4xl font-extralight">{data.stats.totalEnvironments}</p>
          </div>

          <div className="bg-gradient-to-br from-[#7193ED]/10 to-transparent border border-[#7193ED]/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#7193ED]/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#7193ED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-sm text-white/60 font-light">Systems</span>
            </div>
            <p className="text-4xl font-extralight">{data.stats.totalSystems}</p>
          </div>

          <div className="bg-gradient-to-br from-[#BF9FF1]/10 to-transparent border border-[#BF9FF1]/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#BF9FF1]/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#BF9FF1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-white/60 font-light">Workflows</span>
            </div>
            <p className="text-4xl font-extralight">{data.stats.totalWorkflows}</p>
            <p className="text-xs text-white/40 mt-1">{data.stats.activeWorkflows} active</p>
          </div>

          <div className="bg-gradient-to-br from-[#15AD70]/10 to-transparent border border-[#15AD70]/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#15AD70]/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#15AD70]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-white/60 font-light">Avg Health</span>
            </div>
            <p className="text-4xl font-extralight">{Math.round(data.stats.avgHealth * 100)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Environments */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light">Environments</h2>
              <Link href="/environments" className="text-sm text-[#68D0CA] hover:underline font-light">View all →</Link>
            </div>
            <div className="space-y-4">
              {data.environments.map((env) => (
                <Link
                  key={env.id}
                  href={`/environments/${env.slug}`}
                  className="block bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#68D0CA]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-light mb-1">{env.name}</h3>
                      <p className="text-xs text-white/40">{env.systems.length} systems</p>
                    </div>
                    <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Systems */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light">Recent Systems</h2>
              <Link href="/systems" className="text-sm text-[#7193ED] hover:underline font-light">View all →</Link>
            </div>
            <div className="space-y-4">
              {data.systems.slice(0, 5).map((system) => (
                <Link
                  key={system.id}
                  href={`/systems/${system.id}`}
                  className="block bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: system.color ? `${system.color}33` : '#ffffff11' }}
                      >
                        {system.name.includes('Brand') ? '🎨' :
                         system.name.includes('Content') ? '📝' :
                         system.name.includes('Client') ? '🚀' :
                         system.name.includes('Marketing') ? '📊' :
                         system.name.includes('Product') ? '⚡' : '⚙️'}
                      </div>
                      <div>
                        <h3 className="font-light text-sm">{system.name}</h3>
                        <p className="text-xs text-white/40">{system.environment.name}</p>
                      </div>
                    </div>
                    {system.healthScore !== null && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${(system.healthScore || 0) * 100}%`,
                              backgroundColor: system.healthScore > 0.8 ? '#15AD70' : system.healthScore > 0.5 ? '#FFC700' : '#FF6B6B'
                            }}
                          />
                        </div>
                        <span className="text-xs text-white/40">{Math.round((system.healthScore || 0) * 100)}%</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-light mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/environments" className="bg-gradient-to-br from-[#68D0CA]/10 to-transparent border border-[#68D0CA]/20 rounded-xl p-6 hover:border-[#68D0CA]/40 transition-all group">
              <div className="text-3xl mb-3">🏠</div>
              <h3 className="font-light mb-2">Create Environment</h3>
              <p className="text-sm text-white/50 font-light">Set up a new organizational workspace</p>
            </Link>
            <Link href="/systems" className="bg-gradient-to-br from-[#7193ED]/10 to-transparent border border-[#7193ED]/20 rounded-xl p-6 hover:border-[#7193ED]/40 transition-all group">
              <div className="text-3xl mb-3">⚙️</div>
              <h3 className="font-light mb-2">Add System</h3>
              <p className="text-sm text-white/50 font-light">Create a new organizational function</p>
            </Link>
            <div className="bg-gradient-to-br from-[#BF9FF1]/10 to-transparent border border-[#BF9FF1]/20 rounded-xl p-6 hover:border-[#BF9FF1]/40 transition-all group cursor-pointer">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-light mb-2">Build Workflow</h3>
              <p className="text-sm text-white/50 font-light">Automate processes with visual workflows</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
