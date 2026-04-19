/**
 * /security — public security policy + responsible disclosure page.
 *
 * Static, no JS, fully cacheable. Linked from /sign-up, /subprocessors,
 * /.well-known/security.txt, and SECURITY.md. The actual security
 * posture (encryption, isolation, rate limits) is in SECURITY.md for
 * engineers; this page is the user-facing version for security
 * researchers deciding whether to file a report.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Security',
  description: 'How to report a security issue to GRID, what we promise in return, and what is in scope.',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light" style={{ color: 'var(--text-3)' }}>
          Responsible Disclosure
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-4">Security</h1>
        <p className="text-sm font-light leading-relaxed mb-8" style={{ color: 'var(--text-2)' }}>
          Found a security issue? Please report it to us before sharing it publicly. This page
          is the authoritative version of what we promise in return, what is in scope, and
          what is not. Machine-readable mirror at{' '}
          <a
            href="/.well-known/security.txt"
            className="underline"
            style={{ color: 'var(--brand)' }}
          >
            /.well-known/security.txt
          </a>
          .
        </p>

        <Section title="How to report">
          <p>
            Email{' '}
            <code
              className="px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--brand)', fontFamily: 'monospace' }}
            >
              security@grid.systems
            </code>
            . Please do not open a public GitHub issue, social-media thread, or blog post
            until the fix is shipped and we've coordinated disclosure with you. If you need
            PGP, ask and we'll publish a key.
          </p>
          <p>
            Include: one-line summary, reproduction steps, a proof-of-concept where possible,
            and the GRID environment you used (local / staging / production). If you found
            the issue by mistake, that's fine — we'd rather hear about it than not.
          </p>
        </Section>

        <Section title="Our response SLA">
          <ul className="space-y-1.5">
            <Bullet>Initial acknowledgement: <strong style={{ color: 'var(--text-1)' }}>48 hours</strong></Bullet>
            <Bullet>Severity classification + initial triage: <strong style={{ color: 'var(--text-1)' }}>7 days</strong></Bullet>
            <Bullet>Fix for Critical / High (CVSS ≥ 7): <strong style={{ color: 'var(--text-1)' }}>14 days</strong></Bullet>
            <Bullet>Fix for Medium / Low: <strong style={{ color: 'var(--text-1)' }}>60 days</strong></Bullet>
            <Bullet>Public disclosure window after fix: 30 days (coordinated)</Bullet>
          </ul>
        </Section>

        <Section title="In scope">
          <ul className="space-y-1.5">
            <Bullet>The production host <code style={{ color: 'var(--brand)' }}>grddd.com</code> and all its subdomains</Bullet>
            <Bullet>Staging environments if you have been explicitly invited</Bullet>
            <Bullet>The authenticated API under <code style={{ color: 'var(--brand)' }}>/api/*</code></Bullet>
            <Bullet>Authentication flows: sign-in, sign-up, OAuth, password reset</Bullet>
            <Bullet>Cross-tenant isolation (can user A see user B's data?)</Bullet>
            <Bullet>Anthropic BYOK key handling and storage</Bullet>
            <Bullet>Integration OAuth token handling</Bullet>
            <Bullet>Webhook receivers at <code style={{ color: 'var(--brand)' }}>/api/webhooks/*</code></Bullet>
          </ul>
        </Section>

        <Section title="Out of scope">
          <ul className="space-y-1.5">
            <Bullet>Denial-of-service attacks — don't. We'll rate-limit you into a block list</Bullet>
            <Bullet>Social-engineering the founder or any team member</Bullet>
            <Bullet>Physical attacks on infrastructure</Bullet>
            <Bullet>Spam or bulk account creation beyond normal rate limits</Bullet>
            <Bullet>Issues that require running as an already-root user on your own device (e.g. "I can read my own cookies")</Bullet>
            <Bullet>Missing security headers on error pages or static assets where we've documented the exception</Bullet>
            <Bullet>Content on third-party subprocessors (report those to the subprocessor directly)</Bullet>
          </ul>
        </Section>

        <Section title="Safe harbor">
          <p>
            If you make a good-faith attempt to follow this policy, we will not pursue civil
            or criminal legal action against you for the testing activity. Good faith means:
            you stayed within the scope above, you did not access or destroy other users'
            data, you reported promptly, and you gave us a reasonable window before
            disclosing publicly.
          </p>
        </Section>

        <Section title="Recognition">
          <p>
            We maintain a researcher hall of fame at{' '}
            <Link href="/changelog" style={{ color: 'var(--brand)' }}>/changelog</Link>
            . Every valid report gets named (or anonymised, your preference) in the release
            notes that ship the fix. Monetary bounties are not yet offered — when a formal
            program launches it will be published here.
          </p>
        </Section>

        <p className="text-[10px] mt-10 font-light" style={{ color: 'var(--text-3)' }}>
          Last updated: 2026-04-19 · See also{' '}
          <Link href="/subprocessors" style={{ color: 'var(--text-2)' }}>subprocessors</Link>,{' '}
          <Link href="/privacy" style={{ color: 'var(--text-2)' }}>Privacy</Link>,{' '}
          <Link href="/terms" style={{ color: 'var(--text-2)' }}>Terms</Link>.
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2
        className="text-xs tracking-[0.16em] uppercase font-light mb-3"
        style={{ color: 'var(--text-3)' }}
      >
        {title}
      </h2>
      <div className="text-sm font-light leading-relaxed space-y-3" style={{ color: 'var(--text-2)' }}>
        {children}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="pl-4 relative">
      <span
        className="absolute left-0 top-2 w-1 h-1 rounded-full"
        style={{ background: 'var(--text-3)' }}
        aria-hidden
      />
      {children}
    </li>
  );
}
