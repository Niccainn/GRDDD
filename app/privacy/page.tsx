/**
 * /privacy — Privacy Policy
 *
 * This is a TEMPLATE privacy policy drafted to cover the features that
 * exist in GRID today:
 *   - Email/password + OAuth (Google, GitHub) sign-in
 *   - AI chat (Nova) with Anthropic as sub-processor
 *   - Workflow runs + kernel traces (prompts and outputs stored)
 *   - Per-tenant memory (learned preferences)
 *   - Session cookies (grid_session) + short-lived OAuth state cookies
 *
 * This text should be reviewed by counsel before public launch. It is
 * written in plain language to maximise comprehension — GDPR Article 12
 * requires "concise, transparent, intelligible" notices.
 */
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy · GRID',
  description: 'How GRID collects, uses, and protects your data.',
};

const LAST_UPDATED = 'April 9, 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen ambient-bg px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-xs font-light mb-8 inline-block"
          style={{ color: 'var(--text-3)' }}
        >
          ← GRID
        </Link>

        <h1 className="text-3xl font-light mb-2" style={{ color: 'var(--text-1)' }}>
          Privacy Policy
        </h1>
        <p className="text-xs font-light mb-12" style={{ color: 'var(--text-3)' }}>
          Last updated: {LAST_UPDATED}
        </p>

        <div
          className="space-y-8 text-sm font-light leading-relaxed"
          style={{ color: 'var(--text-2)' }}
        >
          <Section title="1. Who we are">
            GRID (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an Agentic Work OS. This policy explains
            what personal data we collect, why we collect it, how we use it, who we share it
            with, and the rights you have over it. If anything here is unclear, email us at{' '}
            <a href="mailto:privacy@grid.app" style={{ color: 'var(--brand)' }}>
              privacy@grid.app
            </a>
            .
          </Section>

          <Section title="2. Data we collect">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <b>Account data:</b> name, email, hashed password (bcrypt, 12 rounds), avatar
                URL if you sign in with Google or GitHub.
              </li>
              <li>
                <b>Authentication data:</b> session tokens (cookie named <code>grid_session</code>,
                HTTP-only, Secure in production) and short-lived OAuth state cookies.
              </li>
              <li>
                <b>Usage data:</b> the workspace state you create — systems, goals, signals,
                workflows, and audit events — all scoped to your tenant.
              </li>
              <li>
                <b>AI interaction data:</b> the prompts you send to Nova and the responses Nova
                returns. These are stored as &ldquo;kernel traces&rdquo; so you can audit what the
                AI did on your behalf.
              </li>
              <li>
                <b>Learned memory:</b> Nova may derive short text notes (&ldquo;memories&rdquo;) from
                your interactions so future runs are more useful. Memories are scoped to your tenant
                only.
              </li>
              <li>
                <b>Technical data:</b> IP address, user agent, and timestamps for security logging
                and rate limiting.
              </li>
            </ul>
          </Section>

          <Section title="3. Why we collect it (lawful basis)">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <b>Contract (GDPR Art. 6(1)(b)):</b> to deliver the service you signed up for —
                authentication, workspace state, AI runs.
              </li>
              <li>
                <b>Legitimate interests (Art. 6(1)(f)):</b> to operate security logging, rate
                limiting, and abuse prevention.
              </li>
              <li>
                <b>Consent (Art. 6(1)(a)):</b> for optional analytics cookies (you can decline
                these via the cookie banner).
              </li>
            </ul>
          </Section>

          <Section title="4. Sub-processors (who sees your data)">
            We share personal data only with the sub-processors below, and only as needed to
            deliver the service.
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>
                <b>Anthropic</b> — processes the prompts and responses in your Nova chat and
                workflow runs. Data is sent to Anthropic&rsquo;s API (&ldquo;Claude&rdquo;) and
                governed by Anthropic&rsquo;s commercial terms and DPA. Anthropic does not train
                its public models on our API traffic.
              </li>
              <li>
                <b>Vercel</b> — application hosting and edge delivery.
              </li>
              <li>
                <b>Postgres provider</b> (Neon / Supabase) — encrypted database storage.
              </li>
              <li>
                <b>Resend</b> — transactional email (sign-up confirmation, password reset).
              </li>
              <li>
                <b>Sentry</b> — error monitoring. We scrub user identifiers from stack traces.
              </li>
            </ul>
          </Section>

          <Section title="5. AI disclosure">
            GRID uses AI models from Anthropic (Claude family) to power Nova chat, workflow
            execution, and memory. When you interact with Nova you are interacting with an AI
            system. Nova&rsquo;s outputs can contain errors and should not be relied on for
            medical, legal, or financial decisions. You retain ownership of the inputs you send
            and the outputs Nova produces for you.
          </Section>

          <Section title="6. Your rights">
            Under GDPR (and equivalent laws like CCPA), you have the right to:
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><b>Access</b> the personal data we hold about you.</li>
              <li><b>Correct</b> any inaccurate data.</li>
              <li>
                <b>Delete</b> your account and all associated data (
                <Link href="/settings/account" style={{ color: 'var(--brand)' }}>
                  Settings &rarr; Account
                </Link>{' '}
                or email{' '}
                <a href="mailto:privacy@grid.app" style={{ color: 'var(--brand)' }}>
                  privacy@grid.app
                </a>
                ).
              </li>
              <li><b>Export</b> your data in a portable format.</li>
              <li><b>Object</b> to processing based on legitimate interests.</li>
              <li><b>Withdraw consent</b> for analytics cookies at any time.</li>
            </ul>
            We respond to verified requests within 30 days.
          </Section>

          <Section title="7. Data retention">
            <ul className="list-disc pl-5 space-y-2">
              <li>Account data: kept for the life of your account.</li>
              <li>
                Kernel traces (prompts and AI responses): auto-deleted after 30 days by default.
                You can reduce this in Settings.
              </li>
              <li>Audit log: 12 months.</li>
              <li>Backups: 7-day point-in-time recovery window.</li>
              <li>
                On account deletion, all personal data is removed within 30 days except where
                retention is legally required.
              </li>
            </ul>
          </Section>

          <Section title="8. Security">
            Passwords are hashed with bcrypt. Data is encrypted in transit (TLS 1.2+) and at rest
            (provider-level encryption). Access to production data is restricted to named
            personnel, logged, and reviewed. We run rate limiting on authentication endpoints and
            lock accounts after 10 failed attempts. No system is perfectly secure — if we become
            aware of a breach affecting your data, we will notify you within 72 hours as required
            by GDPR Art. 33.
          </Section>

          <Section title="9. Cookies">
            We set the following cookies:
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>
                <code>grid_session</code> — strictly necessary, identifies your signed-in session.
              </li>
              <li>
                <code>grid_oauth_state_*</code> — strictly necessary, short-lived CSRF protection
                for OAuth sign-in flows.
              </li>
              <li>
                <code>grid_consent</code> — records your cookie preferences so the banner
                doesn&rsquo;t reappear.
              </li>
            </ul>
          </Section>

          <Section title="10. International transfers">
            Our sub-processors may process data outside the EU/UK, including in the United States.
            Transfers rely on the EU-U.S. Data Privacy Framework and Standard Contractual Clauses
            as applicable.
          </Section>

          <Section title="11. Changes">
            We will post any changes to this policy at this URL and update the &ldquo;Last
            updated&rdquo; date. Material changes will also be emailed to active users.
          </Section>

          <Section title="12. Contact">
            Data controller: GRID (see above).{' '}
            <a href="mailto:privacy@grid.app" style={{ color: 'var(--brand)' }}>
              privacy@grid.app
            </a>
            .
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-base font-light mb-3"
        style={{ color: 'var(--text-1)' }}
      >
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
