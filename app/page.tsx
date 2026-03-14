export default function Home() {
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded border border-white/20 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-[2px] w-4 h-4">
                <div className="bg-white/80 rounded-sm"></div>
                <div className="bg-white/60 rounded-sm"></div>
                <div className="bg-white/40 rounded-sm"></div>
              </div>
            </div>
            <span className="text-lg font-light tracking-wide">GRID</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h1 className="text-6xl font-extralight mb-6 tracking-tight">
            Adaptive Organizational
            <br />
            <span className="bg-gradient-to-r from-[#15AD70] via-[#68D0CA] to-[#7193ED] bg-clip-text text-transparent">
              Infrastructure
            </span>
          </h1>
          <p className="text-xl text-white/60 font-light max-w-2xl mx-auto">
            The operating system for AI-augmented teams. Structure how identity, operations, and intelligence interact in a single adaptive environment.
          </p>
        </div>

        {/* 5-Object Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Identity */}
          <div className="group relative bg-gradient-to-br from-[#15AD70]/10 to-transparent border border-[#15AD70]/20 rounded-2xl p-8 hover:border-[#15AD70]/40 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-[#15AD70]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-[#15AD70]/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#15AD70]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-light mb-2">Identity</h3>
              <p className="text-white/50 text-sm font-light">Who or what exists in the system. People, teams, agents, clients.</p>
            </div>
          </div>

          {/* Environment */}
          <div className="group relative bg-gradient-to-br from-[#68D0CA]/10 to-transparent border border-[#68D0CA]/20 rounded-2xl p-8 hover:border-[#68D0CA]/40 transition-all duration-300">
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
          </div>

          {/* System */}
          <div className="group relative bg-gradient-to-br from-[#7193ED]/10 to-transparent border border-[#7193ED]/20 rounded-2xl p-8 hover:border-[#7193ED]/40 transition-all duration-300">
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
          </div>

          {/* Workflow */}
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

          {/* Intelligence */}
          <div className="group relative bg-gradient-to-br from-[#FFC700]/10 to-transparent border border-[#FFC700]/20 rounded-2xl p-8 hover:border-[#FFC700]/40 transition-all duration-300 md:col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFC700]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-[#FFC700]/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#FFC700]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-light mb-2">Intelligence</h3>
              <p className="text-white/50 text-sm font-light">Adaptive AI layer. Automation, analytics, recommendations with human oversight.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-3 backdrop-blur-sm">
            <div className="w-2 h-2 bg-[#15AD70] rounded-full animate-pulse"></div>
            <span className="text-sm text-white/60 font-light">Building the future of organizational infrastructure</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-white/40 text-sm font-light">
            GRID &copy; 2026 &mdash; Adaptive Organizational Infrastructure
          </p>
        </div>
      </footer>
    </div>
  );
}