import Navigation from '@/components/Navigation';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      <Navigation />

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h1 className="text-6xl font-extralight mb-6 tracking-tight">
            Adaptive Organizational
            <br />
            <span className="bg-gradient-to-r from-[#15AD70] via-[#68D0CA] to-[#7193ED] bg-clip-text text-transparent">
              Infrastructure
            </span>
          </h1>
          <p className="text-xl text-white/60 font-light max-w-2xl mx-auto mb-8">
            The operating system for AI-augmented teams. Structure how identity, operations, and intelligence interact in a single adaptive environment.
          </p>
          <Link 
            href="/environments"
            className="inline-block bg-gradient-to-r from-[#15AD70] to-[#68D0CA] text-white px-8 py-3 rounded-lg font-light hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/environments" className="group relative bg-gradient-to-br from-[#68D0CA]/10 to-transparent border border-[#68D0CA]/20 rounded-2xl p-8 hover:border-[#68D0CA]/40 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-[#68D0CA]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-[#68D0CA]/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#68D0CA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-2xl font-light mb-2">Environment</h3>
              <p className="text-white/50 text-sm font-light">Organizational containers. Workspaces where systems operate.</p>
            </div>
          </Link>

          <Link href="/systems" className="group relative bg-gradient-to-br from-[#7193ED]/10 to-transparent border border-[#7193ED]/20 rounded-2xl p-8 hover:border-[#7193ED]/40 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7193ED]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-[#7193ED]/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#7193ED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-light mb-2">System</h3>
              <p className="text-white/50 text-sm font-light">Structured organizational functions. Brand, marketing, product, operations.</p>
            </div>
          </Link>

          <div className="group relative bg-gradient-to-br from-[#BF9FF1]/10 to-transparent border border-[#BF9FF1]/20 rounded-2xl p-8 hover:border-[#BF9FF1]/40 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-[#BF9FF1]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-[#BF9FF1]/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#BF9FF1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-light mb-2">Workflow</h3>
              <p className="text-white/50 text-sm font-light">Movement within systems. Visual node-based execution paths.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}