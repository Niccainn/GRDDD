import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

async function getEnvironment(slug: string) {
  return await prisma.environment.findUnique({
    where: { slug },
    include: { owner: true, systems: { orderBy: { createdAt: 'desc' } } }
  });
}

export default async function EnvironmentDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const environment = await getEnvironment(slug);
  
  if (!environment) notFound();
  
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <Link href="/environments" className="text-white/60 hover:text-white text-sm font-light mb-4 inline-block">
          ← Back to Environments
        </Link>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extralight mb-3 tracking-tight">{environment.name}</h1>
            {environment.description && <p className="text-white/50 font-light">{environment.description}</p>}
            <p className="text-white/40 text-sm font-light mt-2">/{environment.slug}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-light mb-6">Systems</h2>
            {environment.systems.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-light text-white/60 mb-2">No systems yet</h3>
                <p className="text-white/40 font-light mb-6">Create your first system to organize work</p>
                <Link href="/systems" className="inline-block bg-gradient-to-r from-[#7193ED] to-[#BF9FF1] text-white px-6 py-3 rounded-lg font-light hover:opacity-90 transition-opacity">
                  Create System
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {environment.systems.map((system) => (
                  <div key={system.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#7193ED]/40 transition-all">
                    <h3 className="text-xl font-light mb-2">{system.name}</h3>
                    {system.description && <p className="text-white/50 text-sm font-light">{system.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-light mb-6">Overview</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-white/40 text-sm font-light mb-1">Systems</p>
                <p className="text-2xl font-light">{environment.systems.length}</p>
              </div>
              <div>
                <p className="text-white/40 text-sm font-light mb-1">Owner</p>
                <p className="font-light">{environment.owner.name}</p>
              </div>
              <div>
                <p className="text-white/40 text-sm font-light mb-1">Created</p>
                <p className="font-light">{new Date(environment.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}