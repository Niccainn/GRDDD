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
    description: 'GRID is the AI operations layer that maps your business as interconnected systems, runs multi-stage AI workflows, and builds an operational playbook from every execution. Predictive consequence mapping, metacognitive feedback loops, and 110+ integrations.',
    featureList: 'AI Workflow Engine, Predictive Consequence Mapping, Operational Playbook Generator, Execution Review & Attribution, Autonomy Trust Gradient, 110+ OAuth Integrations, System Health Monitoring, Nova AI Agent, BYOK Anthropic API',
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
          <a href="#problem" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Why</a>
          <a href="#how" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>How</a>
          <a href="#platform" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Platform</a>
          <a href="#use-cases" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Use Cases</a>
          <a href="#who" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Who</a>
          <a href="#waitlist" className="text-xs font-light px-4 py-2 rounded-full transition-all whitespace-nowrap"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Get early access
          </a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-5 md:px-8 pt-20 relative">
        <div className="text-center max-w-3xl">
          <p className="text-[10px] tracking-[0.18em] uppercase mb-6 animate-fade-in" style={{ color: 'var(--brand)', opacity: 0.85 }}>
            The adaptive workspace for growth
          </p>
          <h1 className="text-4xl md:text-6xl font-extralight tracking-tight leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Your team&rsquo;s thinking lives in six different tools.<br />
            <span style={{ color: 'var(--brand)' }}>GRID learns the synergy.</span>
          </h1>
          <p className="text-base font-light leading-relaxed max-w-xl mx-auto mb-8 animate-fade-in" style={{ color: 'var(--text-2)', animationDelay: '0.2s' }}>
            An adaptive workspace where AI connects your stack, learns from every accept and reject, and grows with your team. Idea to outcome in one environment — not six tools and three hand-offs.
          </p>
          {/* Capability pills — reflect what's actually shipped and
              demonstrable to a design partner today. Order is
              roughly "biggest aha → smallest supporting claim". */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            {[
              { label: 'One-Prompt Scaffolding', color: 'var(--brand)' },
              { label: 'Per-System Agents', color: 'var(--nova)' },
              { label: 'Live Integration Sync', color: 'var(--info)' },
              { label: 'Visible AI Confidence', color: 'var(--warning)' },
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
              Get early access
            </a>
            <a href="#how" className="glass-pill px-5 md:px-8 py-3 md:py-3.5 text-sm font-light whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
              How it works
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="w-px h-12 mx-auto mb-2" style={{ background: 'linear-gradient(180deg, transparent, var(--glass-border))' }} />
          <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-3)' }}>Scroll</p>
        </div>
      </section>

      {/* ═══ THE PROBLEM ═══ */}
      <section id="problem" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[0.16em] uppercase mb-6 text-center" style={{ color: 'var(--text-3)' }}>
            The Problem
          </p>
          <h2 className="text-3xl font-extralight tracking-tight mb-6 text-center leading-snug">
            You have more tools than ever.<br />
            <span style={{ color: 'var(--text-2)' }}>Your work is harder to see than ever.</span>
          </h2>
          <p className="text-sm font-light max-w-lg mx-auto text-center mb-16" style={{ color: 'var(--text-3)' }}>
            AI moves faster than you can evaluate. Output velocity outpaces understanding. You have more tools than ever, but less clarity about what&apos;s working and why.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                before: 'Work lives in 12 different tools',
                after: 'Every system, workflow, and outcome in one place',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                ),
              },
              {
                before: 'Nobody notices when systems drift',
                after: 'Health scores surface problems before they spread',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ),
              },
              {
                before: 'AI generates output you can\'t explain or improve',
                after: 'Every run is reviewed, scored, and feeds your operational playbook',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                ),
              },
              {
                before: 'Changes cascade and nobody sees it coming',
                after: 'Predictive consequences map how every change ripples across your systems',
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
            <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>How It Works</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4 leading-snug">
              Every run teaches the system.<br />
              <span style={{ color: 'var(--brand)' }}>Every review teaches you.</span>
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              GRID is a co-learning operating system. You build better workflows. AI adapts to your patterns. The business gets clearer, faster, and more resilient — every week.
            </p>
          </div>

          {/* The loop visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Human side */}
            <div className="glass-deep p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'var(--info)', opacity: 0.4 }} />
              <p className="text-[10px] tracking-[0.16em] uppercase mb-6" style={{ color: 'var(--info)', opacity: 0.85 }}>You Learn</p>
              <div className="space-y-5">
                {[
                  { step: 'See', desc: 'Understand how your business operates — not how you think it does.' },
                  { step: 'Design', desc: 'Build workflows that match reality. Test new approaches with real data.' },
                  { step: 'Improve', desc: 'Watch what works and what doesn\'t. Every execution teaches you something.' },
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
              <p className="text-[10px] tracking-[0.16em] uppercase mb-6" style={{ color: 'var(--nova)', opacity: 0.85 }}>AI Learns</p>
              <div className="space-y-5">
                {[
                  { step: 'Observe', desc: 'Nova reads your systems, workflows, and signals. It maps how your business runs.' },
                  { step: 'Adapt', desc: 'It remembers your patterns, your brand, your preferences — and improves its output.' },
                  { step: 'Act', desc: 'It executes workflows, triages incoming work, and surfaces what needs attention.' },
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
              The result is compounding value. You become better at running work with AI. AI becomes better at running work for you. The business gets clearer every week.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHAT'S INSIDE ═══ */}
      <section id="platform" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>The Platform</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4 leading-snug">
              Your business is a living system.<br />
              <span style={{ color: 'var(--brand)' }}>Now you can see it.</span>
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Systems, workflows, goals, and integrations — connected through AI that maps how your operations flow.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
            {[
              { name: 'Tasks & Projects', desc: 'Board, list, and table views with subtasks, labels, and due dates', icon: '◫', color: 'var(--info)' },
              { name: 'Documents', desc: 'A knowledge base that lives next to the work it describes', icon: '▤', color: 'var(--nova)' },
              { name: 'Goals & OKRs', desc: 'Set targets, track progress, link goals to the workflows that drive them', icon: '◎', color: 'var(--brand)' },
              { name: 'Forms', desc: 'Collect structured data from clients, leads, or your own team', icon: '▦', color: 'var(--warning)' },
              { name: 'Finance', desc: 'Invoices, revenue tracking, and financial health — built in', icon: '◇', color: '#FF6B6B' },
              { name: 'Dashboards', desc: 'Custom widget boards with real-time analytics and health scores', icon: '▣', color: '#4ECDC4' },
              { name: 'Workflows', desc: 'Multi-step automations that execute with human or AI agents', icon: '⟡', color: 'var(--info)' },
              { name: 'Nova AI', desc: 'An AI that reads your systems, learns your patterns, and acts on your behalf', icon: '✦', color: 'var(--nova)' },
              { name: 'Environments', desc: 'Isolated workspaces for each team, client, or business unit', icon: '⬡', color: 'var(--brand)' },
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
              Connect the tools you already use. <span style={{ color: 'var(--text-1)' }}>110+ platforms</span> supported via one-click OAuth, with live two-way sync on a growing list (Notion, Slack, Google Calendar, HubSpot today — more every week).
            </p>
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section id="use-cases" className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>Use Cases</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4">
              Real workflows. Real outcomes.
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              GRID isn&apos;t a dashboard you look at. It&apos;s a system you run. Here&apos;s what that looks like in practice.
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
                    A founder writes a one-line brief. Nova researches the topic, writes a full draft matching the brand voice, reviews it for quality, and prepares SEO metadata — all in a single workflow execution. The founder reviews the output, adjusts the brief, and the next post is even better.
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
                    A full social campaign across 3 platforms in one execution
                  </h3>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-3)' }}>
                    Describe the campaign goal. Nova builds the narrative strategy, creates platform-specific content for Instagram, LinkedIn, and Facebook, reviews each post for brand alignment, and prepares the publishing schedule. The team learns which formats perform — and the next campaign starts smarter.
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
                    Client onboarding that self-reports and improves
                  </h3>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-3)' }}>
                    Each new client follows a structured workflow: discovery, setup, training, handoff. Health scores track engagement at every stage. The operator sees which steps cause friction, adjusts the workflow, and every future onboarding gets smoother — without adding headcount.
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

      {/* ═══ HOW GRID HELPS TEAMS ═══ */}
      <section className="py-20 md:py-32 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>The Impact</p>
            <h2 className="text-3xl font-extralight tracking-tight mb-4">
              What changes when your team uses GRID
            </h2>
            <p className="text-sm font-light max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              These aren&apos;t features. They&apos;re outcomes that compound the longer you use the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              {
                outcome: 'Operational clarity',
                desc: 'Every workflow, every system, every signal — visible in real time. No more asking "what\'s the status?" in Slack.',
                metric: 'Replace status meetings with live dashboards',
                color: 'var(--brand)',
              },
              {
                outcome: 'Visible efficiency gains',
                desc: 'Track how much faster your team moves week over week. See which workflows save the most time and which need redesign.',
                metric: 'Measure time saved per workflow, per week',
                color: 'var(--info)',
              },
              {
                outcome: 'AI fluency',
                desc: 'Your team learns to work with AI through real workflows — not chat experiments. Better prompts, better setups, better judgment.',
                metric: 'Teams improve AI output quality by 40% in 4 weeks',
                color: 'var(--nova)',
              },
              {
                outcome: 'Adaptive capacity',
                desc: 'When something changes — a new client, a new market, a new priority — the system adapts. Workflows evolve. AI adjusts. No re-training.',
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
                { week: 'Week 1', label: 'Map your business', opacity: 0.8 },
                { week: 'Week 2', label: 'First workflow runs', opacity: 0.87 },
                { week: 'Week 4', label: 'Patterns emerge', opacity: 0.94 },
                { week: 'Week 8', label: 'System runs itself', opacity: 1 },
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
              Teams that want to understand, not just execute
            </h2>
            <p className="text-sm font-light leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              GRID is for people who care about getting better at running work — not just getting more done.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                who: 'Founders',
                scenario: 'You\'re running a 5-person company doing the work of 20.',
                needs: [
                  'See every function of the business in one view',
                  'Build systems that run without you in the loop',
                  'Know where to focus before something breaks',
                ],
                color: 'var(--brand)',
              },
              {
                who: 'Operators',
                scenario: 'You manage processes across teams but can\'t measure what\'s working.',
                needs: [
                  'Design workflows you can track and improve',
                  'Replace status meetings with real-time health scores',
                  'Learn which AI setups produce the best outcomes',
                ],
                color: 'var(--info)',
              },
              {
                who: 'Small teams',
                scenario: 'You need to ship like a bigger team without hiring like one.',
                needs: [
                  'Run content, ops, and marketing workflows with AI',
                  'See time saved per workflow, not just output volume',
                  'Get better at AI through real work, not experiments',
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
            AI doesn&apos;t replace how you work.<br />
            <span style={{ color: 'var(--brand)' }}>It teaches you how to work better.</span>
          </h2>
          <p className="text-sm font-light leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
            Most tools optimize for speed. GRID optimizes for understanding. When teams see how their business operates — when AI and humans learn in parallel — the result isn&apos;t just efficiency. It&apos;s mastery.
          </p>
        </div>
      </section>

      {/* ═══ BY THE NUMBERS ═══ */}
      <section className="py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: '110+', label: 'Connectable', sub: 'One-click OAuth; live sync on a growing list' },
              { stat: '9', label: 'Core modules', sub: 'Tasks, docs, goals, forms & more' },
              { stat: '∞', label: 'Workflows', sub: 'Multi-step AI automations' },
              { stat: '1', label: 'Platform', sub: 'Replace your tool stack' },
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
            Learn the system. Improve the system.
          </h2>
          <p className="text-sm font-light mb-10" style={{ color: 'var(--text-2)' }}>
            We&apos;re opening access to a small group of teams who want to see how AI changes their work. Drop your email and we&apos;ll reach out when your workspace is ready.
          </p>

          <WaitlistForm />
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <LegalFooter />
    </div>
  );
}
