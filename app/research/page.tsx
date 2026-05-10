/**
 * /research — public front door for serious people.
 *
 * The deck argues that adaptive systems stabilize through three
 * variables — identity, infrastructure, intelligence — at
 * equilibrium. This page makes that argument citable on the open
 * web, with the formulae, failure modes, and the cybernetics
 * lineage (Meadows, Ashby, Bateson, Friston) named explicitly.
 *
 * Why this page exists:
 *   - Engineering hires self-qualify before any conversation.
 *   - Frontier-lab partners can verify the depth without a deck.
 *   - Design partners get a public-grade artifact to reference.
 *
 * Public, no auth. Indexable by search. Re-renders cheaply because
 * everything is static.
 */

import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata = {
  title: 'Research — GRID',
  description:
    'The structure layer for deployed intelligence. Triadic stability principle, GRID Health Score, adaptive loop. Built on Meadows, Ashby, Bateson, Friston.',
};

export default function ResearchPage() {
  return (
    <div className="min-h-screen ambient-bg">
      {/* Header */}
      <header className="px-6 md:px-10 py-6 md:py-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-flex gap-[3px]" aria-hidden>
            <span className="w-[3px] h-[20px] bg-[rgba(255,255,255,0.85)] group-hover:bg-white transition-colors" />
            <span className="w-[3px] h-[20px] bg-[rgba(255,255,255,0.85)] group-hover:bg-white transition-colors" />
            <span className="w-[3px] h-[20px] bg-[rgba(255,255,255,0.85)] group-hover:bg-white transition-colors" />
          </span>
          <span
            className="text-xs font-light tracking-[0.18em]"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            GRID
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-xs font-light">
          <Link href="/research" style={{ color: 'var(--text-1)' }}>
            Research
          </Link>
          <Link href="/access" className="hover:text-white/80 transition-colors" style={{ color: 'var(--text-3)' }}>
            Access
          </Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-10 pb-32">
        {/* Hero */}
        <section className="pt-12 md:pt-20 pb-16">
          <p
            className="text-[11px] tracking-[0.24em] uppercase font-light mb-6"
            style={{ color: '#C8F26B' }}
          >
            Research · GRID
          </p>
          <h1
            className="text-4xl md:text-6xl font-extralight tracking-tight leading-[1.05] mb-6"
            style={{ color: 'var(--text-1)' }}
          >
            The structure layer for deployed intelligence.
          </h1>
          <p
            className="text-base md:text-lg font-light leading-relaxed max-w-2xl"
            style={{ color: 'var(--text-2)' }}
          >
            Frontier intelligence is solved. Workplace deployment hasn&apos;t absorbed it. The gap
            is structural, not capability — and the literature on adaptive systems names it.
            This page collects the work.
          </p>
        </section>

        {/* Lineage */}
        <section className="mb-20">
          <p
            className="text-[10px] tracking-[0.24em] uppercase font-light mb-6"
            style={{ color: 'var(--text-3)' }}
          >
            Lineage
          </p>
          <p
            className="text-sm font-light leading-relaxed mb-8"
            style={{ color: 'var(--text-2)' }}
          >
            GRID&apos;s thesis stands on a generation of cybernetics, systems theory, and
            free-energy work. We treat their primitives as engineering constraints, not
            metaphors:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                name: 'Donella Meadows',
                work: '— Thinking in Systems',
                point: 'Leverage points sit at structure, not stocks. Identity governs every output.',
              },
              {
                name: 'W. Ross Ashby',
                work: '— Design for a Brain',
                point: 'Variety must be matched. A regulator must equal the disturbance space it absorbs.',
              },
              {
                name: 'Gregory Bateson',
                work: '— Steps to an Ecology of Mind',
                point: 'Information is a difference that makes a difference. Feedback is the substrate of learning.',
              },
              {
                name: 'Karl Friston',
                work: '— Free Energy Principle',
                point: 'Adaptive systems minimise surprise by aligning predictions with sensory input over time.',
              },
            ].map(c => (
              <div
                key={c.name}
                className="rounded-xl p-4"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
              >
                <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                  {c.name}{' '}
                  <span style={{ color: 'var(--text-3)' }}>{c.work}</span>
                </p>
                <p
                  className="text-xs font-light leading-relaxed mt-2"
                  style={{ color: 'var(--text-3)' }}
                >
                  {c.point}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The triadic principle */}
        <section className="mb-20">
          <p
            className="text-[10px] tracking-[0.24em] uppercase font-light mb-6"
            style={{ color: 'var(--text-3)' }}
          >
            The triadic stability principle
          </p>
          <h2
            className="text-2xl md:text-3xl font-extralight tracking-tight leading-tight mb-6"
            style={{ color: 'var(--text-1)' }}
          >
            Behavior is not random. It is environmental.
          </h2>
          <p
            className="text-sm font-light leading-relaxed mb-8 max-w-2xl"
            style={{ color: 'var(--text-2)' }}
          >
            Every adaptive system — biological, organisational, computational — stabilises
            through three interacting variables. Remove one, the system collapses into noise.
            Operate with two, it oscillates without direction. Only three produce regulation.
          </p>

          <div
            className="rounded-2xl p-8 mb-6"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
          >
            <p
              className="text-[10px] tracking-[0.18em] uppercase font-light mb-4"
              style={{ color: 'var(--text-3)' }}
            >
              State function
            </p>
            <p
              className="text-2xl md:text-3xl font-light tracking-tight mb-3"
              style={{ color: 'var(--text-1)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              S(t) = f<span style={{ color: 'var(--text-3)' }}>(</span> Id, If, In <span style={{ color: 'var(--text-3)' }}>)</span>
            </p>
            <div
              className="grid gap-1 text-xs font-light mt-4"
              style={{ color: 'var(--text-3)' }}
            >
              <p>
                <span style={{ color: '#7193ED' }}>Id</span> — Identity. What the system prioritises.
              </p>
              <p>
                <span style={{ color: '#BF9FF1' }}>If</span> — Infrastructure. Where behaviour happens.
              </p>
              <p>
                <span style={{ color: '#F5D76E' }}>In</span> — Intelligence. How the system learns.
              </p>
              <p className="pt-3" style={{ color: 'var(--text-2)' }}>
                Equilibrium: Id ≈ If ≈ In. When variables evolve at similar rates, the system
                adapts without losing coherence.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              { name: 'Identity > Infrastructure', failure: 'Chaos', desc: 'Vision without execution' },
              { name: 'Infrastructure > Intelligence', failure: 'Bureaucracy', desc: 'Process without learning' },
              { name: 'Intelligence > Identity', failure: 'Strategic Drift', desc: 'Speed without direction' },
            ].map(f => (
              <div
                key={f.name}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(245,215,110,0.04)',
                  border: '1px solid rgba(245,215,110,0.18)',
                }}
              >
                <p
                  className="text-[10px] tracking-[0.12em] uppercase font-light mb-2"
                  style={{ color: 'rgba(245,215,110,0.7)' }}
                >
                  {f.name}
                </p>
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>
                  → {f.failure}
                </p>
                <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Health score */}
        <section className="mb-20">
          <p
            className="text-[10px] tracking-[0.24em] uppercase font-light mb-6"
            style={{ color: 'var(--text-3)' }}
          >
            Computable coherence
          </p>
          <h2
            className="text-2xl md:text-3xl font-extralight tracking-tight leading-tight mb-6"
            style={{ color: 'var(--text-1)' }}
          >
            You cannot optimise what you cannot measure.
          </h2>
          <p
            className="text-sm font-light leading-relaxed mb-8 max-w-2xl"
            style={{ color: 'var(--text-2)' }}
          >
            The GRID Health Score quantifies alignment between the three variables and
            penalises misalignment. Two organisations can score identically on each variable
            and have opposite outcomes. Alignment is the signal.
          </p>
          <div
            className="rounded-2xl p-8 mb-6"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
          >
            <p
              className="text-[10px] tracking-[0.18em] uppercase font-light mb-4"
              style={{ color: 'var(--text-3)' }}
            >
              GRID Health Score
            </p>
            <p
              className="text-2xl md:text-3xl font-light tracking-tight mb-4"
              style={{ color: 'var(--text-1)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              H = w<sub style={{ color: '#7193ED' }}>d</sub>·Id + w<sub style={{ color: '#BF9FF1' }}>f</sub>·If + w<sub style={{ color: '#F5D76E' }}>n</sub>·In − λ<span style={{ color: '#F5D76E' }}>M</span>
            </p>
            <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Where M is the misalignment penalty (variance across the three variables) and λ is
              the alignment weight. Bands: 85–100 adaptive, 70–85 stable, 50–70 fragile, &lt; 50
              chaotic.
            </p>
          </div>
        </section>

        {/* The loop */}
        <section className="mb-20">
          <p
            className="text-[10px] tracking-[0.24em] uppercase font-light mb-6"
            style={{ color: 'var(--text-3)' }}
          >
            The adaptive loop
          </p>
          <h2
            className="text-2xl md:text-3xl font-extralight tracking-tight leading-tight mb-6"
            style={{ color: 'var(--text-1)' }}
          >
            Intelligence doesn&apos;t live in the model. It lives in the loop.
          </h2>
          <p
            className="text-sm font-light leading-relaxed mb-6 max-w-2xl"
            style={{ color: 'var(--text-2)' }}
          >
            A model that runs once produces output. A model that runs inside a loop produces
            learning. GRID closes the loop — every model call updates identity, every human
            approval trains the system, every output feeds the next decision.
          </p>
          <p
            className="text-sm font-light leading-relaxed font-mono"
            style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            Identity → Infrastructure → Output → Feedback → Identity′
          </p>
        </section>

        {/* Closing */}
        <section className="mb-12">
          <p
            className="text-sm font-light leading-relaxed max-w-2xl"
            style={{ color: 'var(--text-2)' }}
          >
            Capability is the question the frontier labs answer. Coherence is the question
            workplace operations have to. GRID is the substrate where the second answer becomes
            possible — and where the first compounds inside the customer&apos;s tenant rather
            than disappearing into the model.
          </p>
        </section>

        {/* Contact */}
        <section
          className="rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between"
          style={{
            background: 'var(--glass)',
            border: '1px solid rgba(200,242,107,0.18)',
          }}
        >
          <div>
            <p
              className="text-[10px] tracking-[0.18em] uppercase font-light mb-2"
              style={{ color: '#C8F26B' }}
            >
              Working with GRID
            </p>
            <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
              Engineering hires, design partners, and frontier-lab introductions —{' '}
              <a
                href="mailto:contact@grddd.com"
                style={{ color: '#C8F26B' }}
                className="hover:underline"
              >
                contact@grddd.com
              </a>
              .
            </p>
          </div>
          <Link
            href="/access"
            className="text-sm font-light px-5 py-2.5 rounded-full transition-all whitespace-nowrap text-center"
            style={{
              background: '#C8F26B',
              color: '#000',
            }}
          >
            Request access
          </Link>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
