import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

// Server Action to create a new environment
async function createEnvironment(formData: FormData) {
  'use server';
  
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  
  if (!name) return;
  
  // For now, we'll create a dummy identity to own the environment
  // Later we'll replace this with real authentication
  let dummyIdentity = await prisma.identity.findFirst({
    where: { email: 'demo@grid.app' }
  });
  
  if (!dummyIdentity) {
    dummyIdentity = await prisma.identity.create({
      data: {
        type: 'PERSON',
        name: 'Demo User',
        email: 'demo@grid.app'
      }
    });
  }
  
  // Create the environment
  await prisma.environment.create({
    data: {
      name,
      description,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      ownerId: dummyIdentity.id
    }
  });
  
  redirect('/environments');
}

// Fetch all environments
async function getEnvironments() {
  return await prisma.environment.findMany({
    include: {
      owner: true,
      systems: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export default async function EnvironmentsPage() {
  const environments = await getEnvironments();
  
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-10 bg-[#121213]/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-white/10 rounded border border-white/20 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-[2px] w-4 h-4">
                  <div className="bg-white/80 rounded-sm"></div>
                  <div className="bg-white/60 rounded-sm"></div>
                  <div className="bg-white/40 rounded-sm"></div>
                </div>
              </div>
              <span className="text-lg font-light tracking-wide">GRID</span>
            </a>
            <span className="text-white/40">/</span>
            <span className="text-white/60 font-light">Environments</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-extralight mb-3 tracking-tight">Environments</h1>
          <p className="text-white/50 font-light">Organizational containers where systems operate</p>
        </div>

        {/* Create Environment Form */}
        <div className="mb-12 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-xl font-light mb-6">Create New Environment</h2>
          <form action={createEnvironment} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm text-white/60 mb-2 font-light">
                Environment Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="e.g., GRID Studio, Marketing Lab, Client Projects"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#15AD70] focus:ring-1 focus:ring-[#15AD70] transition-all"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm text-white/60 mb-2 font-light">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="What will this environment be used for?"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#15AD70] focus:ring-1 focus:ring-[#15AD70] transition-all resize-none"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-[#15AD70] to-[#68D0CA] text-white px-6 py-3 rounded-lg font-light hover:opacity-90 transition-opacity"
            >
              Create Environment
            </button>
          </form>
        </div>

        {/* Environments List */}
        {environments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-white/5 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h3 className="text-xl font-light text-white/60 mb-2">No environments yet</h3>
            <p className="text-white/40 font-light">Create your first environment to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {environments.map((env) => (
              <div
                key={env.id}
                className="group relative bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl p-6 hover:border-[#68D0CA]/40 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#68D0CA]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-[#68D0CA]/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#68D0CA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div className="text-xs text-white/40 font-light">
                      {env.systems.length} {env.systems.length === 1 ? 'system' : 'systems'}
                    </div>
                  </div>
                  <h3 className="text-xl font-light mb-2">{env.name}</h3>
                  {env.description && (
                    <p className="text-white/50 text-sm font-light mb-4">{env.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span className="font-light">/{env.slug}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}