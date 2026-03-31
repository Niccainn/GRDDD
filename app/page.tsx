import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center px-12 py-16">
      <div className="max-w-lg">
        <svg width="36" height="46" viewBox="0 0 79 100" fill="none" className="mb-8">
          <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
          <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
          <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
        </svg>
        <p className="text-xs tracking-[0.2em] mb-8" style={{ color: 'var(--text-tertiary)' }}>
          ADAPTIVE ORGANIZATIONAL INFRASTRUCTURE
        </p>
        <h1 className="text-5xl font-extralight tracking-tight mb-6 leading-tight">
          The operating system<br />for AI-augmented teams.
        </h1>
        <p className="text-sm mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
          Structure how identity, operations, and intelligence interact in a single adaptive environment.
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 text-sm font-light tracking-wide transition-all rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          >
            Open Dashboard
          </Link>
          <Link href="/environments" className="text-sm font-light transition-colors" style={{ color: 'var(--text-secondary)' }}>
            View Environments →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 mt-20 max-w-lg" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        {[
          { label: 'Environment', desc: 'Organizational containers', href: '/environments' },
          { label: 'System', desc: 'Structured functions', href: '/systems' },
          { label: 'Workflow', desc: 'Executable processes', href: '/workflows' },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="px-5 py-4 transition-colors group"
            style={{ background: 'var(--surface)', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <p className="text-sm font-light mb-0.5 group-hover:text-white/90 transition-colors">{item.label}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
