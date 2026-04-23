/**
 * /security/architecture — enterprise architecture brief.
 *
 * Single-page technical reference a CIO or security architect can
 * read in ten minutes and share across a procurement team. Pairs
 * with /security/controls (the inventory) and /security (the
 * disclosure page).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Architecture brief — GRID',
  description:
    'How GRID is architected: tenancy model, encryption posture, autonomy and approval gates, audit chain, the multi-tenant BYOK path for Claude. Written for CIOs and security architects.',
};

type Section = {
  id: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: 'tenancy',
    title: 'Tenancy model',
    body: (
      <>
        <p>
          The top-level tenancy boundary is the <strong>Environment</strong>. Every
          System, Workflow, Goal, Document, Signal, Execution, Meeting, Project, and
          Memory row is scoped to one Environment. Cross-Environment reads are
          explicitly disallowed at the ORM layer — every handler filters by
          <code> environmentId</code> + caller identity.
        </p>
        <p>
          Users hold an <strong>Identity</strong>. A user joins an Environment through
          an <strong>EnvironmentMembership</strong> with a role:{' '}
          <code>OWNER</code> (1 per Environment), <code>ADMIN</code>,{' '}
          <code>CONTRIBUTOR</code>, or <code>VIEWER</code>. Role escalation to
          Environment actions is enforced by{' '}
          <code>lib/auth/roles.ts::requireRole()</code>. A RoleAccessDenied error
          returns a 403 at the route boundary.
        </p>
      </>
    ),
  },
  {
    id: 'encryption',
    title: 'Encryption posture',
    body: (
      <>
        <p>
          <strong>In transit:</strong> TLS 1.2+, HSTS with preload. Strict CSP with{' '}
          <code>connect-src 'self' https://api.anthropic.com</code> and{' '}
          <code>frame-ancestors 'none'</code>; production script-src drops{' '}
          <code>unsafe-eval</code>.
        </p>
        <p>
          <strong>At rest:</strong> The primary Postgres is encrypted by the managed
          provider. Application-layer envelope encryption for every integration
          credential (<code>Integration.credentialsEnc</code>) and every AI key
          (<code>Environment.anthropicKeyEnc</code>). Long-lived tokens (email
          verification, invitations, public share) are stored as SHA-256 hashes —
          the plaintext only ever lives in the link sent to the user.
        </p>
        <p>
          <strong>Customer-managed keys:</strong> on the roadmap for the first
          enterprise contract that requires it. The envelope-encryption layer is
          factored so CMK slots in without touching application code.
        </p>
      </>
    ),
  },
  {
    id: 'autonomy',
    title: 'Autonomy + approval gates',
    body: (
      <>
        <p>
          Every Workflow and System carries an <strong>AutonomyConfig</strong> with
          one of five levels: Observe, Suggest, Act &amp; Notify, Autonomous, and
          Self-Direct. The level is set per-scope, not globally; a user can have
          their Inbox Triage at Autonomous while their Finance System stays at
          Suggest.
        </p>
        <p>
          Tool calls that would have user-visible effect (send email, post to Slack,
          create a Notion page, stage an ad campaign) are routed through the
          <strong> ApprovalRequest</strong> queue at any level below Autonomous.
          The kernel emits a <code>PendingAction</code> row caching Claude&rsquo;s
          <code> tool_use_id</code> so the conversation can resume after approval
          without re-prompting. Args are never editable between approval and
          execution.
        </p>
        <p>
          <strong>Reversible-by-default:</strong> autonomous actions write a 24-hour
          undo window. Undoing creates a compensating AuditLog entry <em>and</em> a
          NovaMemory row of type <code>user_correction</code> so future Nova calls
          factor in the correction.
        </p>
      </>
    ),
  },
  {
    id: 'audit',
    title: 'Audit chain',
    body: (
      <>
        <p>
          Every mutation writes one or more rows across three tables:
        </p>
        <ul>
          <li>
            <strong>AuditLog</strong> — high-level changes (workflow.created,
            member.added, approval.approved) with before/after JSON diffs and actor
            identity.
          </li>
          <li>
            <strong>IntelligenceLog</strong> — every Nova action with input, output,
            reasoning excerpt, tokens, cost, success flag, and the System id.
          </li>
          <li>
            <strong>KernelTrace</strong> — lower-level tool-call traces used to
            render the &ldquo;why did Nova do this?&rdquo; drawer.
          </li>
        </ul>
        <p>
          The monthly ROI report signs its contents with a SHA-256 hash of the
          AuditLog entries in the window so the PDF is verifiable after the fact.
          Customers can export the full AuditLog as CSV or JSONL at any time via
          <code> GET /api/audit/export</code>.
        </p>
      </>
    ),
  },
  {
    id: 'claude',
    title: 'Claude / Anthropic integration',
    body: (
      <>
        <p>
          <strong>BYOK per Environment.</strong> Every Environment can hold its own
          Anthropic API key. The key is validated against Anthropic at connect time
          (a 1-token Haiku ping), stored envelope-encrypted, and used for all Nova
          calls made on behalf of that Environment. No cross-tenant key leakage.
        </p>
        <p>
          <strong>Platform key fallback.</strong> For users on the free tier who have
          not brought a key, a platform key with strict budget caps routes their
          requests during a time-boxed trial. <code>lib/cost/user-budget.ts</code>
          preflights every request; exceeding the cap returns a connect-your-key
          prompt rather than silently failing.
        </p>
        <p>
          <strong>Model routing.</strong> <code>lib/kernel/router.ts</code> maps
          abstract tier names (FAST / BALANCED / DEEP) to concrete Claude model
          slugs; tier assignment lives in the skill registry so swapping models is
          a one-line change. Current mix: Haiku for narrative + planner, Sonnet for
          reasoning-dense executors.
        </p>
      </>
    ),
  },
  {
    id: 'data',
    title: 'Data residency',
    body: (
      <>
        <p>
          Primary data plane is US-East by default. Regional data planes for EU / UK
          / US will land for the first enterprise contract that requires it; the
          architecture is factored for it (no hard-coded region, all secrets are
          referenced via the Environment row, migrations are region-agnostic).
        </p>
        <p>
          <strong>Subprocessors:</strong> Anthropic (model inference), Vercel
          (hosting), Neon / Turso (Postgres), Resend (transactional email), OAuth
          providers per integration. Consent is surfaced at sign-up and re-collected
          on policy-version bump via the <code>ConsentLog</code> model.
        </p>
      </>
    ),
  },
  {
    id: 'isolation',
    title: 'Isolation + blast radius',
    body: (
      <>
        <p>
          Per-identity rate limits on every authenticated API route
          (<code>lib/rate-limit.ts</code>). Per-Environment budget caps prevent one
          team&rsquo;s runaway Nova call from starving another.
        </p>
        <p>
          Destructive operations (Environment delete, System delete, Workflow
          delete) cascade through Prisma onDelete. A cascading delete of a
          high-level row fires a <code>grid:{`{entity}-changed`}</code> event so
          every subscribed surface (sidebar, environment switcher, project board)
          updates live rather than showing stale references.
        </p>
      </>
    ),
  },
];

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Security · Architecture
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-4">
          Architecture brief
        </h1>
        <p className="text-sm font-light leading-relaxed mb-10" style={{ color: 'var(--text-2)' }}>
          A single page a CIO or security architect can read in ten minutes.
          Shorter than your standard enterprise security questionnaire. Expands
          every control on <Link href="/security/controls" style={{ color: 'var(--brand)' }}>/security/controls</Link>.
        </p>

        {/* Table of contents */}
        <nav
          className="rounded-2xl p-5 mb-10"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p
            className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
            style={{ color: 'var(--text-3)' }}
          >
            Contents
          </p>
          <ol className="space-y-1.5">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm font-light"
                  style={{ color: 'var(--text-2)' }}
                >
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-12 prose-light">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id}>
              <p
                className="text-[10px] tracking-[0.16em] uppercase mb-2 font-light"
                style={{ color: 'var(--text-3)' }}
              >
                Section {i + 1}
              </p>
              <h2
                className="text-xl font-light mb-4"
                style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}
              >
                {s.title}
              </h2>
              <div
                className="text-sm font-light leading-relaxed space-y-3 architecture-prose"
                style={{ color: 'var(--text-2)' }}
              >
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div
          className="rounded-2xl p-6 mt-14"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Questions a procurement team needs answered before signing? Email{' '}
            <a href="mailto:security@grid.app" style={{ color: 'var(--brand)' }}>
              security@grid.app
            </a>
            . Public disclosure flow at{' '}
            <Link href="/security" style={{ color: 'var(--brand)' }}>
              /security
            </Link>
            . Capability inventory at{' '}
            <Link href="/capabilities" style={{ color: 'var(--brand)' }}>
              /capabilities
            </Link>
            .
          </p>
        </div>
      </div>
      <style>{`
        .architecture-prose p { margin-bottom: 0.75rem; }
        .architecture-prose ul { list-style: disc; padding-left: 1.25rem; margin: 0.75rem 0; }
        .architecture-prose li { margin-bottom: 0.3rem; }
        .architecture-prose code {
          font-size: 0.8em;
          background: rgba(255,255,255,0.04);
          padding: 1px 5px;
          border-radius: 4px;
        }
        .architecture-prose strong { color: var(--text-1); font-weight: 400; }
      `}</style>
      <LegalFooter />
    </div>
  );
}
