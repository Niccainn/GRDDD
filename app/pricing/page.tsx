import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — GRID',
  description: 'Simple, transparent pricing. Start free, scale as you grow.',
};

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    suffix: '/mo',
    description: 'For individuals exploring GRID',
    cta: 'Get started',
    ctaStyle: 'secondary' as const,
    features: [
      '1 environment',
      '5 systems',
      '100 executions / mo',
      '50 Nova queries / mo',
      '1 API key',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    suffix: '/mo',
    description: 'For operators running real workloads',
    cta: 'Start free trial',
    ctaStyle: 'primary' as const,
    highlight: true,
    features: [
      '10 environments',
      'Unlimited systems',
      '2,000 executions / mo',
      '500 Nova queries / mo',
      '10 API keys',
      'Priority support',
      'Advanced analytics',
      'Custom workflows',
    ],
  },
  {
    name: 'Team',
    price: '$79',
    suffix: '/seat/mo',
    description: 'For teams that need structure at scale',
    cta: 'Contact us',
    ctaStyle: 'secondary' as const,
    features: [
      'Unlimited environments',
      'Unlimited systems',
      '10,000 executions / mo',
      '2,000 Nova queries / mo',
      '50 API keys',
      'Team members & roles',
      'Audit log',
      'SSO & SAML',
      'White-label environments',
      'Priority support',
    ],
  },
];

const COMPARISON = [
  { label: 'Environments', free: '1', pro: '10', team: 'Unlimited' },
  { label: 'Systems', free: '5', pro: 'Unlimited', team: 'Unlimited' },
  { label: 'Workflows', free: '10', pro: 'Unlimited', team: 'Unlimited' },
  { label: 'Executions / mo', free: '100', pro: '2,000', team: '10,000' },
  { label: 'Nova queries / mo', free: '50', pro: '500', team: '2,000' },
  { label: 'API keys', free: '1', pro: '10', team: '50' },
  { label: 'Team members', free: '\u2014', pro: '\u2014', team: 'Unlimited' },
  { label: 'Audit log', free: '\u2014', pro: '\u2014', team: '\u2713' },
  { label: 'SSO / SAML', free: '\u2014', pro: '\u2014', team: '\u2713' },
  { label: 'White-label', free: '\u2014', pro: '\u2014', team: '\u2713' },
  { label: 'Priority support', free: '\u2014', pro: '\u2713', team: '\u2713' },
  { label: 'Custom integrations', free: '\u2014', pro: '\u2713', team: '\u2713' },
];

const FAQ = [
  {
    q: 'What happens when I hit my limits?',
    a: 'You\u2019ll get a notification before you reach your cap. Workflows won\u2019t break \u2014 they\u2019ll queue until the next billing period or you upgrade.',
  },
  {
    q: 'Can I bring my own API key?',
    a: 'Yes. During beta, GRID supports BYOK (Bring Your Own Key) for Anthropic. You connect your key in Settings and Nova runs on your account directly.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes. Annual plans save 20%. Contact us for details.',
  },
  {
    q: 'What\u2019s included in the free tier?',
    a: 'Everything except team features. You get full access to environments, systems, workflows, Nova, goals, analytics, and the API. Just with usage caps.',
  },
  {
    q: 'Can I white-label GRID for my clients?',
    a: 'Yes. On the Team plan, each environment can be fully branded \u2014 custom name, logo, colors, and tone. Your clients see your brand, not ours.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(ellipse, #15AD70, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 md:py-5"
        style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', background: 'rgba(8,8,12,0.7)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="20" height="26" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.4 }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="url(#pg)" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="url(#pg)" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="url(#pg)" strokeWidth="2"/>
            <defs><linearGradient id="pg" x1="0" y1="0" x2="79" y2="100"><stop offset="0%" stopColor="#15AD70"/><stop offset="100%" stopColor="#7193ED"/></linearGradient></defs>
          </svg>
          <span className="text-sm font-light tracking-[0.15em]" style={{ color: 'var(--text-2)' }}>GRID</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/#product" className="hidden md:inline text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Product</Link>
          <Link href="/pricing" className="hidden md:inline text-xs font-light" style={{ color: 'var(--text-1)' }}>Pricing</Link>
          <Link href="/sign-in" className="text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>Sign in</Link>
          <Link href="/sign-up" className="text-xs font-light px-4 py-2 rounded-full transition-all"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-12 md:pb-16 px-5 md:px-8 text-center relative">
        <p className="text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--brand)', opacity: 0.6 }}>
          Pricing
        </p>
        <h1 className="text-4xl md:text-5xl font-extralight tracking-tight leading-[1.15] mb-4" style={{ color: 'var(--text-1)' }}>
          Simple, transparent pricing
        </h1>
        <p className="text-base font-light max-w-md mx-auto" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
          Start free. Scale as your operations grow. No surprises.
        </p>
      </section>

      {/* Plan cards */}
      <section className="px-5 md:px-8 pb-16 md:pb-20 max-w-[1100px] mx-auto relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? 'linear-gradient(180deg, rgba(21,173,112,0.06), var(--glass))' : 'var(--glass)',
                border: `1px solid ${plan.highlight ? 'var(--brand-border)' : 'var(--glass-border)'}`,
                borderRadius: 24,
                padding: '2.25rem 2rem',
                backdropFilter: 'blur(24px)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {plan.highlight && (
                <div style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--brand)', color: '#000', padding: '3px 16px',
                  borderRadius: '0 0 10px 10px', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  Most popular
                </div>
              )}

              <h3 style={{ fontSize: 20, fontWeight: 300, color: 'var(--text-1)', marginBottom: 4 }}>
                {plan.name}
              </h3>
              <p style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 300, marginBottom: 20 }}>
                {plan.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span style={{ fontSize: 48, fontWeight: 100, color: 'var(--text-1)', letterSpacing: '-0.04em' }}>
                  {plan.price}
                </span>
                <span style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 14 }}>
                  {plan.suffix}
                </span>
              </div>

              <Link
                href="/sign-up"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 14,
                  fontWeight: plan.ctaStyle === 'primary' ? 400 : 300,
                  textDecoration: 'none',
                  marginBottom: 28,
                  transition: 'all 0.2s',
                  ...(plan.ctaStyle === 'primary'
                    ? { background: 'var(--brand)', color: '#000' }
                    : { background: 'var(--glass)', color: 'var(--text-2)', border: '1px solid var(--glass-border)' }),
                }}
              >
                {plan.cta}
              </Link>

              <div style={{ flex: 1 }}>
                {plan.features.map(feat => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ color: 'var(--text-2)', fontWeight: 300, fontSize: 13 }}>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Annual note */}
        <p className="text-center mt-6" style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 300 }}>
          All plans include a 14-day free trial. Annual billing saves 20%.
        </p>
      </section>

      {/* Comparison table */}
      <section className="px-5 md:px-8 pb-16 md:pb-20 max-w-[900px] mx-auto relative">
        <h2 className="text-2xl font-extralight tracking-tight mb-8 text-center" style={{ color: 'var(--text-1)' }}>
          Compare plans
        </h2>
        <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
          <div
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              borderRadius: 20,
              overflow: 'hidden',
              backdropFilter: 'blur(24px)',
              minWidth: 480,
            }}
          >
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 72px', padding: '14px 16px', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Feature</span>
              <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Free</span>
              <span style={{ color: 'var(--brand)', fontSize: 11, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Pro</span>
              <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Team</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 72px 72px 72px',
                  padding: '10px 16px',
                  borderBottom: i < COMPARISON.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                }}
              >
                <span style={{ color: 'var(--text-2)', fontWeight: 300, fontSize: 13 }}>{row.label}</span>
                <span style={{ color: row.free === '\u2014' ? 'var(--text-3)' : 'var(--text-2)', fontWeight: 300, fontSize: 12, textAlign: 'center', opacity: row.free === '\u2014' ? 0.4 : 1 }}>{row.free}</span>
                <span style={{ color: row.pro === '\u2014' ? 'var(--text-3)' : 'var(--text-2)', fontWeight: 300, fontSize: 12, textAlign: 'center', opacity: row.pro === '\u2014' ? 0.4 : 1 }}>{row.pro}</span>
                <span style={{ color: row.team === '\u2014' ? 'var(--text-3)' : 'var(--text-2)', fontWeight: 300, fontSize: 12, textAlign: 'center', opacity: row.team === '\u2014' ? 0.4 : 1 }}>{row.team}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 md:px-8 pb-20 md:pb-24 max-w-[700px] mx-auto relative">
        <h2 className="text-2xl font-extralight tracking-tight mb-8 text-center" style={{ color: 'var(--text-1)' }}>
          Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ.map(item => (
            <div
              key={item.q}
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                borderRadius: 16,
                padding: '20px 24px',
                backdropFilter: 'blur(20px)',
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-1)', marginBottom: 8 }}>
                {item.q}
              </h3>
              <p style={{ color: 'var(--text-2)', fontWeight: 300, fontSize: 14, lineHeight: 1.6 }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 md:px-8 pb-20 md:pb-24 text-center relative">
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(21,173,112,0.08), rgba(113,147,237,0.06))',
            border: '1px solid var(--brand-border)',
            borderRadius: 28,
            padding: '3.5rem 2rem',
            maxWidth: 600,
            margin: '0 auto',
            backdropFilter: 'blur(24px)',
          }}
        >
          <h2 className="text-2xl font-extralight tracking-tight mb-3" style={{ color: 'var(--text-1)' }}>
            Ready to build structure?
          </h2>
          <p style={{ color: 'var(--text-2)', fontWeight: 300, fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
            Start free. No credit card required.
          </p>
          <Link
            href="/sign-up"
            style={{
              display: 'inline-block',
              background: 'var(--brand)',
              color: '#000',
              borderRadius: 'var(--radius-pill)',
              padding: '12px 36px',
              fontSize: 15,
              fontWeight: 400,
              textDecoration: 'none',
            }}
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 md:px-8 py-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 300 }}>
          &copy; {new Date().getFullYear()} GRID Systems Inc.
        </p>
      </footer>
    </div>
  );
}
