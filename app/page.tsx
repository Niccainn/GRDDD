import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';
import WaitlistForm from '@/components/WaitlistForm';

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GRID',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Operational Intelligence',
    operatingSystem: 'Web',
    url: 'https://www.grddd.com',
    description: 'A workspace that acts. Type what you want done. Nova writes the plan, your tools do the work — Figma, Canva, Notion, Gmail, Slack, Meta Ads. Every step traces, every action explains itself, every override teaches Nova.',
    featureList: 'Environment, Systems, Workflows, Signals, Nova (intelligence layer), Predictive Consequence Mapping, Operational Playbook, Execution Review, Autonomy Trust Gradient, 110+ OAuth Integrations, System Health Monitoring, BYOK Anthropic API',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Early access — bring your own Anthropic API key',
    },
    creator: {
      '@type': 'Organization',
      name: 'GRID Systems Inc.',
      url: 'https://www.grddd.com',
    },
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Ambient gradient field */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #C8F26B, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[20%] w-[600px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #7193ED, transparent 70%)' }} />
        <div className="absolute top-[60%] right-[15%] w-[500px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #BF9FF1, transparent 70%)' }} />
      </div>

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 md:py-5"
        style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', background: 'rgba(8,8,12,0.7)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2.5">
          <svg width="24" height="31" viewBox="0 0 79 100" fill="none">
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2"/>
          </svg>
          <span className="text-sm font-light tracking-[0.18em]" style={{ color: 'var(--text-2)' }}>GRID</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="#problem" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Shift</a>
          <a href="#how" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>System</a>
          <a href="#platform" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Environment</a>
          <a href="#use-cases" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>In practice</a>
          <a href="#who" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Who</a>
          <a href="#waitlist" className="text-xs font-light px-4 py-2 rounded-full transition-all whitespace-nowrap"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Request access
          </a>
        </div>
      </nav>

      {/* ═══ HERO ═══
          Interaction-layer-first hero. Leads with the product's
          primary verb (type what you want done), followed by a
          concrete example of the Project plan that falls out of it.
          The pills used to describe capabilities; they now describe
          the trust commitments that close enterprise deals. */}
      <section className="min-h-screen flex flex-col items-center justify-center px-5 md:px-8 pt-20 relative">
        <div className="text-center max-w-3xl">
          <p className="text-[10px] tracking-[0.18em] uppercase mb-6 animate-fade-in" style={{ color: 'var(--brand)', opacity: 0.85 }}>
            The nervous system for your company
          </p>
          <h1 className="text-4xl md:text-6xl font-extralight tracking-tight leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            A workspace<br />
            <span style={{ color: 'var(--brand)' }}>that acts.</span>
          </h1>
          <p className="text-base font-light leading-relaxed max-w-xl mx-auto mb-8 animate-fade-in" style={{ color: 'var(--text-2)', animationDelay: '0.2s' }}>
            Type what you want done. Nova writes the plan. Your tools do the work — Figma, Canva, Notion, Gmail, Slack, Meta Ads. You see every step, approve what matters, undo anything within 24 hours, and teach Nova when it was off.
          </p>
          {/* A concrete example of what one prompt produces. This
              is the demo-in-words that the Project run page renders
              literally. Screenshot-ready. */}
          <div
            className="rounded-2xl p-5 mb-8 text-left max-w-xl mx-auto animate-fade-in"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', animationDelay: '0.22s' }}
          >
            <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-3" style={{ color: 'var(--brand)' }}>
              One prompt, seven real steps
            </p>
            <p className="text-sm font-light mb-3" style={{ color: 'var(--text-1)' }}>
              <span style={{ color: 'var(--text-3)' }}>You:</span> "Design a Meta ad campaign with Canva creative."
            </p>
            <div className="space-y-1.5">
              {[
                { t: 'Fetch creative brief', tool: 'Notion' },
                { t: 'Draft three copy variants', tool: 'Claude' },
                { t: 'Build static + story ad', tool: 'Canva' },
                { t: 'Human review', tool: 'Gate' },
                { t: 'Stage PAUSED campaign', tool: 'Meta Ads' },
                { t: 'Send approval email', tool: 'Gmail' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] font-light" style={{ color: 'var(--text-2)' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}>{i + 1}</span>
                  <span className="flex-1">{s.t}</span>
                  <span className="text-[10px] tracking-wider uppercase" style={{ color: 'var(--text-3)' }}>{s.tool}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Trust commitments as pills — this is what closes the
              enterprise pitch. Brand colors only, one line each. */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            {[
              { label: 'Every action explains itself', color: 'var(--brand)' },
              { label: '24-hour undo window', color: 'var(--nova)' },
              { label: 'Every override teaches Nova', color: 'var(--info)' },
              { label: 'Built on Claude', color: 'var(--warning)' },
            ].map(pill => (
              <span key={pill.label} className="text-[10px] font-light px-3 py-1.5 rounded-full tracking-wide"
                style={{ background: `${pill.color}10`, border: `1px solid ${pill.color}20`, color: pill.color }}>
                {pill.label}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <a href="#waitlist" className="px-5 md:px-8 py-3 md:py-3.5 text-sm font-light rounded-full transition-all whitespace-nowrap"
              style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}>
              Request access
            </a>
            <a href="/pricing" className="glass-pill px-5 md:px-8 py-3 md:py-3.5 text-sm font-light whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
              See plans
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="w-px h-12 mx-auto mb-2" style={{ background: 'linear-gradient(180deg, transparent, var(--glass-border))' }} />
          <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-3)' }}>Scroll</p>
        </div>
      </section>

      {/* ═══ THE SHIFT ═══ */}
      <section id="problem" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[0.16em] uppercase mb-6 text-center" style={{ color: 'var(--text-3)' }}>
            The Shift
          </p>
          <h2 className="text-3xl font-extralight tracking-tight mb-6 text-center leading-snug">
            Work isn&rsquo;t breaking from lack of effort.<br />
            <span style={{ color: 'var(--text-2)' }}>It&rsquo;s breaking from lack of structure.</span>
          </h2>
          <p className="text-sm font-light max-w-lg mx-auto text-center mb-16" style={{ color: 'var(--text-3)' }}>
            Most organizations operate in fragments. Brand without infrastructure. Operations without intelligence. Intelligence without context. GRID is the environment where they become one system.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                before: 'Brand, ops, and intelligence live in separate tools.',
                after: 'One environment. Identity, infrastructure, and intelligence, operating together.',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                ),
              },
              {
                before: 'Systems drift. Nobody notices until the output does.',
                after: 'Health scores surface drift before the work breaks.',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ),
              },
              {
                before: 'AI generates output you can\'t explain.',
                after: 'Every run is traced, scored, and folded back into the system.',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                ),
              },
              {
                before: 'A change in one place breaks another, silently.',
                after: 'Nova maps how every change ripples across the environment.',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                ),
              },
            ].map(item => (
              <div key={item.before} className="glass-deep p-6 rounded-2xl">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}>
                  {item.icon}
                </div>
                <p className="text-xs font-light mb-3 line-through" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {item.before}
                </p>
                <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-1)' }}>
                  {item.after}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>The System</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4 leading-snug">
              The environment learns.<br />
              <span style={{ color: 'var(--brand)' }}>You learn with it.</span>
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Not a tool you adopt. A system you inhabit. The longer it runs, the more it understands your patterns — and the more you understand your business.
            </p>
          </div>

          {/* The loop visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Human side */}
            <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'var(--info)', opacity: 0.4 }} />
              <p className="text-[10px] tracking-[0.16em] uppercase mb-6" style={{ color: 'var(--info)', opacity: 0.85 }}>You learn</p>
              <div className="space-y-5">
                {[
                  { step: 'See', desc: 'Watch how the business actually operates. Not how you pictured it.' },
                  { step: 'Design', desc: 'Shape Workflows to match reality. Test new approaches on real data.' },
                  { step: 'Improve', desc: 'Read what worked. Read what didn\'t. Every execution is a lesson.' },
                ].map((item, i) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: 'rgba(113,147,237,0.12)', color: 'var(--info)', border: '1px solid rgba(113,147,237,0.2)' }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>{item.step}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI side */}
            <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'var(--nova)', opacity: 0.4 }} />
              <p className="text-[10px] tracking-[0.16em] uppercase mb-6" style={{ color: 'var(--nova)', opacity: 0.85 }}>Nova learns</p>
              <div className="space-y-5">
                {[
                  { step: 'Observe', desc: 'Nova reads every System, Signal, and Workflow. It maps how the environment runs.' },
                  { step: 'Adapt', desc: 'It remembers your patterns, your voice, your constraints. Its output sharpens.' },
                  { step: 'Act', desc: 'It runs Workflows, triages Signals, and surfaces what needs you.' },
                ].map((item, i) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: 'rgba(191,159,241,0.12)', color: 'var(--nova)', border: '1px solid rgba(191,159,241,0.2)' }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>{item.step}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The outcome */}
          <div className="glass-deep p-8 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: 'var(--info)' }} />
              <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, var(--info), var(--nova))' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: 'var(--nova)' }} />
            </div>
            <p className="text-sm font-light leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Compounding coherence. You get better at running the work. Nova gets better at running it for you. The environment gets clearer every week.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHAT'S INSIDE ═══ */}
      <section id="platform" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>The Environment</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4 leading-snug">
              Your business is a living system.<br />
              <span style={{ color: 'var(--brand)' }}>Now you can see it.</span>
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Systems, Workflows, Goals, Signals, and Integrations. One environment where identity, infrastructure, and intelligence operate as one.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
            {[
              { name: 'Tasks & Projects', desc: 'Board, list, and table views. Subtasks. Labels. Due dates.', icon: '◫', color: 'var(--info)' },
              { name: 'Documents', desc: 'Knowledge that lives next to the work it describes.', icon: '▤', color: 'var(--nova)' },
              { name: 'Goals & OKRs', desc: 'Set targets. Link them to the Workflows that drive them.', icon: '◎', color: 'var(--brand)' },
              { name: 'Forms', desc: 'Structured input from clients, leads, and your own team.', icon: '▦', color: 'var(--warning)' },
              { name: 'Finance', desc: 'Invoices, revenue, and financial health — inside the environment.', icon: '◇', color: '#FF6B6B' },
              { name: 'Dashboards', desc: 'Custom boards. Live analytics. Real health scores.', icon: '▣', color: '#4ECDC4' },
              { name: 'Workflows', desc: 'Multi-step executions. Human agents. Nova. Together.', icon: '⟡', color: 'var(--info)' },
              { name: 'Nova', desc: 'The intelligence layer. Reads your systems. Learns your patterns. Acts.', icon: '✦', color: 'var(--nova)' },
              { name: 'Environments', desc: 'Bounded systems. One per team, client, or unit.', icon: '⬡', color: 'var(--brand)' },
            ].map(item => (
              <div key={item.name} className="glass-deep p-4 md:p-5 rounded-xl">
                <span className="text-lg mb-2 block" style={{ color: item.color, opacity: 0.7 }}>{item.icon}</span>
                <p className="text-xs md:text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>{item.name}</p>
                <p className="text-[10px] md:text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Integrations strip */}
          <div className="glass-deep rounded-2xl p-6 md:p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
              {['Slack', 'Notion', 'Figma', 'GitHub', 'Linear', 'Stripe', 'HubSpot', 'Salesforce', 'Google', 'Shopify'].map(name => (
                <span key={name} className="text-[10px] px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {name}
                </span>
              ))}
              <span className="text-[10px] px-3 py-1.5 rounded-full" style={{ background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                +100 more
              </span>
            </div>
            <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>
              <span style={{ color: 'var(--text-1)' }}>110+ platforms</span> connect in. One environment holds them together. One-click OAuth, with live two-way sync on a growing list — Notion, Slack, Google Calendar, HubSpot today. More every week.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section id="use-cases" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>In Practice</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4">
              Not examples. Real workflows, running.
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              GRID isn&apos;t a dashboard you look at. It&apos;s an environment you run. Here&apos;s what that looks like.
            </p>
          </div>

          <div className="space-y-4">
            {/* Use case 1 — Content */}
            <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'var(--info)', opacity: 0.3 }} />
              <div className="md:flex md:gap-8 md:items-start">
                <div className="md:flex-1 mb-6 md:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--info)' }} />
                    <p className="text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--info)', opacity: 0.9 }}>Content Operations</p>
                  </div>
                  <h3 className="text-lg font-light mb-2" style={{ color: 'var(--text-1)' }}>
                    A blog post from brief to publish-ready in 4 minutes
                  </h3>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-3)' }}>
                    A founder writes a one-line brief. Nova researches the topic, drafts in the brand voice, reviews for quality, prepares SEO metadata. One execution. Next time, the brief sharpens and the output gets closer still.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(113,147,237,0.1)', color: 'var(--info)', border: '1px solid rgba(113,147,237,0.15)' }}>Research</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(113,147,237,0.1)', color: 'var(--info)', border: '1px solid rgba(113,147,237,0.15)' }}>Draft</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(113,147,237,0.1)', color: 'var(--info)', border: '1px solid rgba(113,147,237,0.15)' }}>Review</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(113,147,237,0.1)', color: 'var(--info)', border: '1px solid rgba(113,147,237,0.15)' }}>Publish</span>
                  </div>
                </div>
                <div className="md:w-48 flex-shrink-0 glass rounded-xl p-4 text-center">
                  <p className="text-2xl font-extralight mb-1" style={{ color: 'var(--text-1)' }}>4 min</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>vs. 6-8 hours manually</p>
                  <div className="w-full h-px my-3" style={{ background: 'var(--glass-border)' }} />
                  <p className="text-2xl font-extralight mb-1" style={{ color: 'var(--text-1)' }}>8.4/10</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>avg. quality score</p>
                </div>
              </div>
            </div>

            {/* Use case 2 — Social */}
            <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: '#FF6B6B', opacity: 0.3 }} />
              <div className="md:flex md:gap-8 md:items-start">
                <div className="md:flex-1 mb-6 md:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#FF6B6B' }} />
                    <p className="text-[10px] tracking-[0.16em] uppercase" style={{ color: '#FF6B6B', opacity: 0.9 }}>Marketing</p>
                  </div>
                  <h3 className="text-lg font-light mb-2" style={{ color: 'var(--text-1)' }}>
                    A full social campaign across three platforms, one execution
                  </h3>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-3)' }}>
                    Describe the goal. Nova builds the narrative, creates platform-specific posts for three channels, reviews each for brand alignment, prepares the schedule. The team reads what performed. The next campaign starts smarter.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.15)' }}>Narrative</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.15)' }}>Assets</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.15)' }}>Review</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.15)' }}>Publish</span>
                  </div>
                </div>
                <div className="md:w-48 flex-shrink-0 glass rounded-xl p-4 text-center">
                  <p className="text-2xl font-extralight mb-1" style={{ color: 'var(--text-1)' }}>3 min</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>vs. 2-3 days with a team</p>
                  <div className="w-full h-px my-3" style={{ background: 'var(--glass-border)' }} />
                  <p className="text-2xl font-extralight mb-1" style={{ color: 'var(--text-1)' }}>14</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>posts ready to schedule</p>
                </div>
              </div>
            </div>

            {/* Use case 3 — Operations */}
            <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'var(--brand)', opacity: 0.3 }} />
              <div className="md:flex md:gap-8 md:items-start">
                <div className="md:flex-1 mb-6 md:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />
                    <p className="text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--brand)', opacity: 0.9 }}>Operations</p>
                  </div>
                  <h3 className="text-lg font-light mb-2" style={{ color: 'var(--text-1)' }}>
                    Onboarding that reports on itself and improves
                  </h3>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-3)' }}>
                    Every new client moves through a structured Workflow: discovery, setup, training, handoff. Health scores track each stage. The operator sees which steps create friction, adjusts the Workflow, and every future onboarding runs cleaner — no added headcount.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,242,107,0.1)', color: 'var(--brand)', border: '1px solid rgba(200,242,107,0.15)' }}>Discovery</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,242,107,0.1)', color: 'var(--brand)', border: '1px solid rgba(200,242,107,0.15)' }}>Setup</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,242,107,0.1)', color: 'var(--brand)', border: '1px solid rgba(200,242,107,0.15)' }}>Training</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,242,107,0.1)', color: 'var(--brand)', border: '1px solid rgba(200,242,107,0.15)' }}>Handoff</span>
                  </div>
                </div>
                <div className="md:w-48 flex-shrink-0 glass rounded-xl p-4 text-center">
                  <p className="text-2xl font-extralight mb-1" style={{ color: 'var(--text-1)' }}>60%</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>less onboarding friction</p>
                  <div className="w-full h-px my-3" style={{ background: 'var(--glass-border)' }} />
                  <p className="text-2xl font-extralight mb-1" style={{ color: 'var(--text-1)' }}>0</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>status meetings needed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT CHANGES ═══ */}
      <section className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>What Changes</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4">
              When conditions align, the work changes shape.
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Not features. Outcomes the environment produces the longer you&apos;re in it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              {
                outcome: 'Operational clarity',
                desc: 'Every Workflow, every System, every Signal — visible in real time. The question "what\'s the status?" disappears.',
                metric: 'Status meetings replaced by live health scores',
                color: 'var(--brand)',
              },
              {
                outcome: 'Visible efficiency',
                desc: 'Track how much faster the team moves, week over week. See which Workflows save time and which need redesign.',
                metric: 'Time saved measured per Workflow, per week',
                color: 'var(--info)',
              },
              {
                outcome: 'AI fluency',
                desc: 'Your team learns to work with Nova through real Workflows — not chat experiments. Better setups. Sharper judgment.',
                metric: 'Output quality up 40% in 4 weeks',
                color: 'var(--nova)',
              },
              {
                outcome: 'Adaptive capacity',
                desc: 'When something changes — a new client, a new market, a new priority — the environment adapts. Workflows evolve. Nova adjusts. No retraining.',
                metric: 'Respond to change in hours, not quarters',
                color: 'var(--warning)',
              },
            ].map(item => (
              <div key={item.outcome} className="glass-deep p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <p className="text-xs font-light" style={{ color: item.color }}>{item.outcome}</p>
                </div>
                <p className="text-sm font-light leading-relaxed mb-4" style={{ color: 'var(--text-1)' }}>
                  {item.desc}
                </p>
                <p className="text-[10px] px-3 py-1.5 rounded-lg inline-block" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {item.metric}
                </p>
              </div>
            ))}
          </div>

          {/* The compound line */}
          <div className="glass-deep p-6 rounded-2xl">
            <div className="flex items-center gap-6 md:gap-8 overflow-x-auto py-2">
              {[
                // Opacity floor set to 0.8 to clear WCAG AA (4.5:1) at 10px on #08080c.
                // Progression is preserved via step size + dot fill below, not by sub-legible text.
                { week: 'Week 1', label: 'Map the business', opacity: 0.8 },
                { week: 'Week 2', label: 'First Workflows run', opacity: 0.87 },
                { week: 'Week 4', label: 'Patterns emerge', opacity: 0.94 },
                { week: 'Week 8', label: 'The system runs itself', opacity: 1 },
              ].map((step, i) => (
                <div key={step.week} className="flex items-center gap-4 md:gap-6 flex-shrink-0">
                  <div className="text-center min-w-[80px]">
                    <p className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: 'var(--brand)', opacity: step.opacity }}>{step.week}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{step.label}</p>
                  </div>
                  {i < 3 && (
                    <div className="w-8 h-px flex-shrink-0" style={{ background: 'var(--glass-border)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHO THIS IS FOR ═══ */}
      <section id="who" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.16em] uppercase mb-6" style={{ color: 'var(--text-3)' }}>
              Built For
            </p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4">
              Teams building the conditions, not just the output.
            </h2>
            <p className="text-sm font-light leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              For operators who want to understand how work produces itself — not just push more through.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                who: 'Founders',
                scenario: 'You\'re running a 5-person company doing the work of 20.',
                needs: [
                  'See every function of the business in one environment',
                  'Build Systems that run without you in the loop',
                  'Know where attention matters before something breaks',
                ],
                color: 'var(--brand)',
              },
              {
                who: 'Operators',
                scenario: 'You run processes across teams but can\'t measure what\'s working.',
                needs: [
                  'Design Workflows you can track and improve',
                  'Replace status meetings with live health scores',
                  'Learn which Nova setups produce the strongest output',
                ],
                color: 'var(--info)',
              },
              {
                who: 'Small teams',
                scenario: 'You need to ship like a bigger team without hiring like one.',
                needs: [
                  'Run content, operations, and marketing as Workflows',
                  'See time saved per Workflow — not just output volume',
                  'Get fluent in AI through real work, not experiments',
                ],
                color: 'var(--nova)',
              },
            ].map(item => (
              <div key={item.who} className="glass-deep p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: item.color, opacity: 0.3 }} />
                <div className="w-2 h-2 rounded-full mb-4" style={{ background: item.color }} />
                <p className="text-base font-light mb-2" style={{ color: 'var(--text-1)' }}>{item.who}</p>
                <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>{item.scenario}</p>
                <div className="space-y-2.5">
                  {item.needs.map(need => (
                    <div key={need} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full flex-shrink-0 mt-1.5" style={{ background: item.color, opacity: 0.5 }} />
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{need}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE LINE ═══ */}
      <section className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.16em] uppercase mb-6" style={{ color: 'var(--text-3)' }}>The Thesis</p>
          <h2 className="text-3xl font-extralight tracking-tight leading-snug mb-8">
            AI doesn&rsquo;t replace how you work.<br />
            <span style={{ color: 'var(--brand)' }}>It teaches you how the work works.</span>
          </h2>
          <p className="text-sm font-light leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
            Most tools optimize for speed. GRID optimizes for coherence. When the environment is right, the output takes care of itself.
          </p>
        </div>
      </section>

      {/* ═══ BY THE NUMBERS ═══ */}
      <section className="py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: '110+', label: 'Connectable', sub: 'One-click OAuth; live sync on a growing list' },
              { stat: '9', label: 'Core systems', sub: 'Tasks, docs, goals, forms & more' },
              { stat: '∞', label: 'Workflows', sub: 'Human agents. Nova. Together.' },
              { stat: '1', label: 'Environment', sub: 'Replaces the fragment stack' },
            ].map(item => (
              <div key={item.label} className="glass-deep p-5 rounded-xl text-center">
                <p className="text-2xl md:text-3xl font-extralight mb-1" style={{ color: 'var(--text-1)' }}>{item.stat}</p>
                <p className="text-xs font-light mb-1" style={{ color: 'var(--brand)' }}>{item.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WAITLIST CTA ═══ */}
      <section id="waitlist" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--brand)', opacity: 0.85 }}>
            Early Access
          </p>
          <h2 className="text-3xl font-extralight tracking-tight mb-4">
            Inhabit the system. Improve the system.
          </h2>
          <p className="text-sm font-light mb-10" style={{ color: 'var(--text-2)' }}>
            We&apos;re opening the environment to a small group of teams who want to see their work as a system. Drop your email. We&apos;ll reach out when your environment is ready.
          </p>

          <WaitlistForm />
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <LegalFooter />
    </div>
  );
}
